import { db } from "@/lib/db";
import { Money } from "@/lib/calc/money";
import { Prisma, type PaymentLink } from "@/generated/prisma/client";
import { recomputeInvoicePaymentState } from "@/lib/services/payments";
import { enqueueWebhookEvent } from "@/lib/webhooks/dispatch";
import type { CreatePaymentLinkInput, InboundWebhookInput } from "@/lib/validation/schemas/paymentLink";

// The requested link amount exceeds the invoice's current balance due.
export class PaymentLinkAmountError extends Error {}

// The link can't accept a payment right now (expired/deactivated, or already
// paid by a different gateway transaction than the one in the callback).
export class PaymentLinkStateError extends Error {}

export class PaymentLinkNotFoundError extends Error {}

// A link that's ACTIVE past its expiry is treated (and persisted) as EXPIRED
// the next time it's touched — same lazy-recompute pattern as Invoice's
// OVERDUE transition (lib/calc/gstEngine.ts derivePaymentStatus): no cron
// needed, but the DB column stays eventually consistent for list/filter UIs.
async function syncExpiry(link: PaymentLink): Promise<PaymentLink> {
  if (link.status === "ACTIVE" && link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    return db.paymentLink.update({ where: { id: link.id }, data: { status: "EXPIRED" } });
  }
  return link;
}

export async function listPaymentLinks(opts: { invoiceId?: string }) {
  const links = await db.paymentLink.findMany({
    where: opts.invoiceId ? { invoiceId: opts.invoiceId } : {},
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(links.map(syncExpiry));
}

export async function getPaymentLink(id: string) {
  const link = await db.paymentLink.findUnique({ where: { id } });
  return link ? syncExpiry(link) : null;
}

export async function createPaymentLink(input: CreatePaymentLinkInput, actorId: string) {
  const invoice = await db.invoice.findUniqueOrThrow({ where: { id: input.invoiceId } });
  const amount = new Money(input.amount);
  if (amount.lte(0)) throw new PaymentLinkAmountError("Payment link amount must be greater than zero");
  if (amount.gt(new Money(invoice.balanceDue.toString()))) {
    throw new PaymentLinkAmountError("Payment link amount exceeds the invoice's balance due");
  }

  return db.paymentLink.create({
    data: {
      invoiceId: input.invoiceId,
      amount: input.amount,
      provider: input.provider,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      createdById: actorId,
    },
  });
}

export async function deactivatePaymentLink(id: string) {
  const existing = await getPaymentLink(id);
  if (!existing) throw new Error("Payment link not found");
  if (existing.status !== "ACTIVE") {
    throw new PaymentLinkStateError(`Cannot deactivate a link with status ${existing.status}`);
  }
  return db.paymentLink.update({ where: { id }, data: { status: "DEACTIVATED" } });
}

// The generic inbound gateway callback handler (plan.md: "the same gateway
// transaction must never create duplicate payment records"). Idempotency is
// enforced two ways: (1) an early check for a replayed callback against a
// link that's already PAID by this same transaction, returned as a no-op
// success; (2) as a DB-level backstop, Payment.gatewayTransactionId is
// unique, so even a race between two concurrent deliveries can create at
// most one Payment row — the loser's unique-violation is caught below and
// treated as the same idempotent success, not an error.
export async function recordWebhookPayment(input: InboundWebhookInput) {
  const found = await db.paymentLink.findUnique({ where: { token: input.token } });
  if (!found) throw new PaymentLinkNotFoundError("Payment link not found for token");
  const link = await syncExpiry(found);

  if (link.status === "PAID") {
    if (link.externalPaymentId === input.gatewayTransactionId) {
      return db.payment.findFirstOrThrow({ where: { gatewayTransactionId: input.gatewayTransactionId } });
    }
    throw new PaymentLinkStateError("Payment link has already been paid by a different transaction");
  }
  if (link.status !== "ACTIVE") {
    throw new PaymentLinkStateError(`Payment link is ${link.status.toLowerCase()} and cannot accept a payment`);
  }

  if (input.status === "failed") {
    // Acknowledged, no side effect — the link stays ACTIVE and can be retried.
    return null;
  }

  let result;
  try {
    result = await db.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: link.invoiceId } });
      const activePayments = await tx.payment.findMany({ where: { invoiceId: link.invoiceId, isVoided: false } });
      const currentPaid = activePayments.reduce((acc, p) => acc.plus(new Money(p.amount.toString())), new Money(0));
      const wouldBeTotal = currentPaid.plus(new Money(input.amount));
      if (wouldBeTotal.gt(new Money(invoice.grandTotal.toString()))) {
        throw new PaymentLinkAmountError("Recorded payments would exceed the invoice's grand total");
      }

      const payment = await tx.payment.create({
        data: {
          invoiceId: link.invoiceId,
          amount: input.amount,
          paymentDate: new Date(),
          method: "GATEWAY",
          paymentLinkId: link.id,
          gatewayTransactionId: input.gatewayTransactionId,
        },
      });
      await tx.paymentLink.update({
        where: { id: link.id },
        data: { status: "PAID", externalPaymentId: input.gatewayTransactionId, paidAt: new Date() },
      });
      const { invoice: updatedInvoice, justCompleted } = await recomputeInvoicePaymentState(tx, link.invoiceId);
      return { payment, updatedInvoice, justCompleted };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Idempotent replay (the DB-level backstop) — the payment already
      // exists from an earlier delivery of this same gateway transaction,
      // so no new state change happened here; no webhook event to enqueue.
      return db.payment.findFirstOrThrow({ where: { gatewayTransactionId: input.gatewayTransactionId } });
    }
    throw err;
  }

  await enqueueWebhookEvent(
    "payment.created",
    "Payment",
    result.payment.id,
    result.payment.createdAt.toISOString(),
    { invoiceId: result.payment.invoiceId, amount: result.payment.amount.toString(), method: result.payment.method },
  );
  if (result.justCompleted) {
    await enqueueWebhookEvent(
      "payment.completed",
      "Invoice",
      result.updatedInvoice.id,
      result.updatedInvoice.updatedAt.toISOString(),
      {
        invoiceNumber: result.updatedInvoice.invoiceNumber,
        grandTotal: result.updatedInvoice.grandTotal.toString(),
        paidTotal: result.updatedInvoice.paidTotal.toString(),
      },
    );
  }
  return result.payment;
}
