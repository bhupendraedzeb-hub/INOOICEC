import { db } from "@/lib/db";
import { Money, toMoneyString, sumMoney } from "@/lib/calc/money";
import { derivePaymentStatus } from "@/lib/calc/gstEngine";
import { enqueueWebhookEvent } from "@/lib/webhooks/dispatch";
import type { PaymentMethod, Prisma } from "@/generated/prisma/client";
import type { CreatePaymentInput, UpdatePaymentInput } from "@/lib/validation/schemas/payment";

// Thrown when recorded (non-voided) payments would exceed the invoice's
// grand total — plan.md: "never allow total recorded payments to exceed the
// invoice balance." Caught by the API route and translated to a 422.
export class OverpaymentError extends Error {}

// Recomputes Invoice.paidTotal/balanceDue/paymentStatus from the current set
// of non-voided Payment rows — the single source of truth, never
// hand-editable. Must run in the same transaction as the payment write that
// triggered it. `justCompleted` tells the caller whether this call is the
// one that pushed the invoice's paymentStatus into PAID for the first time
// (vs. it already being PAID, or landing somewhere else) — that's the
// signal for firing the Phase 15 "payment.completed" event exactly once per
// transition, not on every write while already paid.
export async function recomputeInvoicePaymentState(
  tx: Prisma.TransactionClient,
  organizationId: string,
  invoiceId: string,
) {
  const invoice = await tx.invoice.findFirstOrThrow({ where: { id: invoiceId, organizationId } });
  const activePayments = await tx.payment.findMany({ where: { invoiceId, isVoided: false } });
  const paidTotal = sumMoney(activePayments.map((p) => new Money(p.amount.toString())));
  const grandTotal = new Money(invoice.grandTotal.toString());
  const balanceDue = grandTotal.minus(paidTotal);
  const paymentStatus = derivePaymentStatus(grandTotal, paidTotal, invoice.dueDate, new Date());

  const updated = await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      paidTotal: toMoneyString(paidTotal),
      balanceDue: toMoneyString(balanceDue),
      paymentStatus,
    },
  });

  return { invoice: updated, justCompleted: invoice.paymentStatus !== "PAID" && paymentStatus === "PAID" };
}

async function enqueuePaymentCompletedIfJust(
  justCompleted: boolean,
  invoice: { id: string; updatedAt: Date; invoiceNumber: string | null; grandTotal: { toString(): string }; paidTotal: { toString(): string } },
) {
  if (!justCompleted) return;
  await enqueueWebhookEvent("payment.completed", "Invoice", invoice.id, invoice.updatedAt.toISOString(), {
    invoiceNumber: invoice.invoiceNumber,
    grandTotal: invoice.grandTotal.toString(),
    paidTotal: invoice.paidTotal.toString(),
  });
}

export async function listPayments(organizationId: string, opts: { invoiceId?: string }) {
  return db.payment.findMany({
    where: { organizationId, ...(opts.invoiceId ? { invoiceId: opts.invoiceId } : {}) },
    orderBy: { paymentDate: "desc" },
  });
}

export async function getPayment(id: string, organizationId: string) {
  return db.payment.findFirst({ where: { id, organizationId } });
}

export async function createPayment(input: CreatePaymentInput, actorId: string, organizationId: string) {
  const result = await db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirstOrThrow({ where: { id: input.invoiceId, organizationId } });
    const activePayments = await tx.payment.findMany({
      where: { invoiceId: input.invoiceId, isVoided: false },
    });
    const currentPaid = sumMoney(activePayments.map((p) => new Money(p.amount.toString())));
    const wouldBeTotal = currentPaid.plus(new Money(input.amount));
    if (wouldBeTotal.gt(new Money(invoice.grandTotal.toString()))) {
      throw new OverpaymentError("Recorded payments would exceed the invoice's grand total");
    }

    const payment = await tx.payment.create({
      data: {
        organizationId,
        invoiceId: input.invoiceId,
        amount: input.amount,
        paymentDate: new Date(input.paymentDate),
        method: input.method as PaymentMethod,
        transactionRef: input.transactionRef || null,
        notes: input.notes || null,
        createdById: actorId,
      },
    });
    const { invoice: updatedInvoice, justCompleted } = await recomputeInvoicePaymentState(tx, organizationId, input.invoiceId);
    return { payment, updatedInvoice, justCompleted };
  });

  await enqueueWebhookEvent("payment.created", "Payment", result.payment.id, result.payment.createdAt.toISOString(), {
    invoiceId: result.payment.invoiceId,
    amount: result.payment.amount.toString(),
    method: result.payment.method,
  });
  await enqueuePaymentCompletedIfJust(result.justCompleted, result.updatedInvoice);
  return result.payment;
}

export async function updatePayment(id: string, organizationId: string, input: UpdatePaymentInput) {
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.payment.findFirstOrThrow({ where: { id, organizationId } });
    const invoice = await tx.invoice.findFirstOrThrow({ where: { id: existing.invoiceId, organizationId } });
    const otherActivePayments = await tx.payment.findMany({
      where: { invoiceId: existing.invoiceId, isVoided: false, id: { not: id } },
    });
    const currentPaid = sumMoney(otherActivePayments.map((p) => new Money(p.amount.toString())));
    const wouldBeTotal = currentPaid.plus(new Money(input.amount));
    if (!existing.isVoided && wouldBeTotal.gt(new Money(invoice.grandTotal.toString()))) {
      throw new OverpaymentError("Recorded payments would exceed the invoice's grand total");
    }

    const payment = await tx.payment.update({
      where: { id },
      data: {
        amount: input.amount,
        paymentDate: new Date(input.paymentDate),
        method: input.method as PaymentMethod,
        transactionRef: input.transactionRef || null,
        notes: input.notes || null,
      },
    });
    const { invoice: updatedInvoice, justCompleted } = await recomputeInvoicePaymentState(tx, organizationId, existing.invoiceId);
    return { payment, updatedInvoice, justCompleted };
  });

  await enqueueWebhookEvent("payment.updated", "Payment", result.payment.id, result.payment.updatedAt.toISOString(), {
    invoiceId: result.payment.invoiceId,
    amount: result.payment.amount.toString(),
    method: result.payment.method,
  });
  await enqueuePaymentCompletedIfJust(result.justCompleted, result.updatedInvoice);
  return result.payment;
}

// Voided, never deleted — a financial record (plan.md).
export async function voidPayment(id: string, organizationId: string, reason: string) {
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.payment.findFirstOrThrow({ where: { id, organizationId } });
    const payment = await tx.payment.update({
      where: { id },
      data: { isVoided: true, voidedAt: new Date(), voidedReason: reason },
    });
    const { invoice: updatedInvoice, justCompleted } = await recomputeInvoicePaymentState(tx, organizationId, existing.invoiceId);
    return { payment, updatedInvoice, justCompleted };
  });

  await enqueueWebhookEvent("payment.updated", "Payment", result.payment.id, result.payment.updatedAt.toISOString(), {
    invoiceId: result.payment.invoiceId,
    amount: result.payment.amount.toString(),
    voided: true,
  });
  await enqueuePaymentCompletedIfJust(result.justCompleted, result.updatedInvoice);
  return result.payment;
}
