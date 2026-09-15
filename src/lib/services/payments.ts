import { db } from "@/lib/db";
import { Money, toMoneyString, sumMoney } from "@/lib/calc/money";
import { derivePaymentStatus } from "@/lib/calc/gstEngine";
import type { PaymentMethod, Prisma } from "@/generated/prisma/client";
import type { CreatePaymentInput, UpdatePaymentInput } from "@/lib/validation/schemas/payment";

// Thrown when recorded (non-voided) payments would exceed the invoice's
// grand total — plan.md: "never allow total recorded payments to exceed the
// invoice balance." Caught by the API route and translated to a 422.
export class OverpaymentError extends Error {}

// Recomputes Invoice.paidTotal/balanceDue/paymentStatus from the current set
// of non-voided Payment rows — the single source of truth, never
// hand-editable. Must run in the same transaction as the payment write that
// triggered it.
async function recomputeInvoicePaymentState(tx: Prisma.TransactionClient, invoiceId: string) {
  const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const activePayments = await tx.payment.findMany({ where: { invoiceId, isVoided: false } });
  const paidTotal = sumMoney(activePayments.map((p) => new Money(p.amount.toString())));
  const grandTotal = new Money(invoice.grandTotal.toString());
  const balanceDue = grandTotal.minus(paidTotal);
  const paymentStatus = derivePaymentStatus(grandTotal, paidTotal, invoice.dueDate, new Date());

  return tx.invoice.update({
    where: { id: invoiceId },
    data: {
      paidTotal: toMoneyString(paidTotal),
      balanceDue: toMoneyString(balanceDue),
      paymentStatus,
    },
  });
}

export async function listPayments(opts: { invoiceId?: string }) {
  return db.payment.findMany({
    where: opts.invoiceId ? { invoiceId: opts.invoiceId } : {},
    orderBy: { paymentDate: "desc" },
  });
}

export async function getPayment(id: string) {
  return db.payment.findUnique({ where: { id } });
}

export async function createPayment(input: CreatePaymentInput, actorId: string) {
  return db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: input.invoiceId } });
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
        invoiceId: input.invoiceId,
        amount: input.amount,
        paymentDate: new Date(input.paymentDate),
        method: input.method as PaymentMethod,
        transactionRef: input.transactionRef || null,
        notes: input.notes || null,
        createdById: actorId,
      },
    });
    await recomputeInvoicePaymentState(tx, input.invoiceId);
    return payment;
  });
}

export async function updatePayment(id: string, input: UpdatePaymentInput) {
  return db.$transaction(async (tx) => {
    const existing = await tx.payment.findUniqueOrThrow({ where: { id } });
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: existing.invoiceId } });
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
    await recomputeInvoicePaymentState(tx, existing.invoiceId);
    return payment;
  });
}

// Voided, never deleted — a financial record (plan.md).
export async function voidPayment(id: string, reason: string) {
  return db.$transaction(async (tx) => {
    const existing = await tx.payment.findUniqueOrThrow({ where: { id } });
    const payment = await tx.payment.update({
      where: { id },
      data: { isVoided: true, voidedAt: new Date(), voidedReason: reason },
    });
    await recomputeInvoicePaymentState(tx, existing.invoiceId);
    return payment;
  });
}
