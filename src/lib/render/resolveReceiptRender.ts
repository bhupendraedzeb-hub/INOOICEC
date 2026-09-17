import { getReceiptForInternalRender } from "@/lib/services/receipts";
import { getCompanySettings } from "@/lib/services/companySettings";
import { buildReceiptRenderContext } from "@/lib/render/buildRenderContext";
import type { TemplateDocument } from "@/types/template";

// Mirrors resolveInvoiceRender.ts's resolveInvoiceRenderData exactly — the
// shared assembly step behind both the internal PDF render route and (were
// a /preview API added later) any other receipt-rendering caller. Also
// deliberately org-unscoped for the same reason: reached by the internal
// token-gated route with no session; the receipt's own organizationId is
// what scopes the company-settings lookup below.
export async function resolveReceiptRenderData(receiptId: string) {
  const receipt = await getReceiptForInternalRender(receiptId);
  if (!receipt) return null;
  const company = await getCompanySettings(receipt.organizationId);

  const layout = (receipt.templateVersion.layout as unknown as TemplateDocument) ?? null;
  if (!layout) return null;

  const invoice = receipt.payment.invoice;
  const balanceRemaining = Number(invoice.balanceDue) > 0 ? invoice.balanceDue.toString() : null;

  const context = buildReceiptRenderContext({
    company,
    customer: invoice.customer,
    receipt: {
      receiptNumber: receipt.receiptNumber,
      issueDateIso: receipt.issueDate.toISOString(),
      amountPaid: receipt.payment.amount.toString(),
      paymentMethod: receipt.payment.method,
      transactionRef: receipt.payment.transactionRef,
      linkedInvoiceNumber: invoice.invoiceNumber,
      balanceRemaining,
    },
  });

  return { receipt, layout, context };
}
