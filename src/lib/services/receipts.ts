import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getCompanySettings } from "@/lib/services/companySettings";
import { reserveReceiptNumber } from "@/lib/numbering/receiptNumber";
import type { Payment } from "@/generated/prisma/client";

// Auto-generates a Receipt for a just-created Payment — a best-effort side
// effect, deliberately called *after* the payment's own transaction commits
// (see lib/services/payments.ts createPayment), never inside it: a missing
// or misconfigured receipt template must never block recording a real
// customer payment. Pins the org's current default ReceiptTemplate's latest
// version at creation time, mirroring how Invoice pins a TemplateVersion at
// /issue — editing the receipt template later never changes a receipt
// already generated. Returns null (no error) if the org hasn't configured a
// default receipt template yet.
export async function createReceiptForPayment(payment: Payment, organizationId: string) {
  const template = await db.receiptTemplate.findFirst({
    where: { organizationId, isDefault: true, status: "ACTIVE" },
  });
  if (!template) {
    logger.warn({ organizationId, paymentId: payment.id }, "no default active receipt template configured — skipping receipt generation");
    return null;
  }

  const version = await db.receiptTemplateVersion.findFirst({
    where: { templateId: template.id },
    orderBy: { versionNumber: "desc" },
  });
  if (!version) {
    logger.warn({ organizationId, paymentId: payment.id, templateId: template.id }, "default receipt template has no versions — skipping receipt generation");
    return null;
  }

  const company = await getCompanySettings(organizationId);

  return db.$transaction(async (tx) => {
    const receiptNumber = await reserveReceiptNumber(tx, {
      organizationId,
      prefix: company.receiptPrefix,
      format: company.receiptNumberFormat,
      issueDate: payment.paymentDate,
    });
    return tx.receipt.create({
      data: {
        organizationId,
        receiptNumber,
        paymentId: payment.id,
        templateId: template.id,
        templateVersionId: version.id,
        issueDate: payment.paymentDate,
      },
    });
  });
}

export async function getReceipt(id: string, organizationId: string) {
  return db.receipt.findFirst({
    where: { id, organizationId },
    include: { payment: { include: { invoice: { include: { customer: true } } } } },
  });
}

export async function listReceipts(organizationId: string, opts: { paymentId?: string; invoiceId?: string }) {
  return db.receipt.findMany({
    where: {
      organizationId,
      ...(opts.paymentId ? { paymentId: opts.paymentId } : {}),
      ...(opts.invoiceId ? { payment: { invoiceId: opts.invoiceId } } : {}),
    },
    include: { payment: { include: { invoice: { include: { customer: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

// Deliberately org-unscoped — used only by the internal, token-gated PDF
// render route, the same rationale as invoices.ts's
// getInvoiceForInternalRender.
export async function getReceiptForInternalRender(id: string) {
  return db.receipt.findUnique({
    where: { id },
    include: { payment: { include: { invoice: { include: { customer: true } } } }, templateVersion: true },
  });
}
