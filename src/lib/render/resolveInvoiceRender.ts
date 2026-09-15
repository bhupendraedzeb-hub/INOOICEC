import { getInvoice } from "@/lib/services/invoices";
import { getCompanySettings } from "@/lib/services/companySettings";
import { getLatestVersion } from "@/lib/services/templates";
import { buildRenderContext } from "@/lib/render/buildRenderContext";
import type { TemplateDocument } from "@/types/template";

// Single shared assembly step behind both the /preview API route and the
// Phase 12 internal PDF render route, so "preview and PDF use the same
// rendering logic" (plan.md) holds for the data layer too, not just the
// TemplateRenderer/MultiPageRenderer component tree. Issued invoices always
// resolve their pinned TemplateVersion; drafts follow the template's current
// (latest) version since nothing is pinned yet.
export async function resolveInvoiceRenderData(invoiceId: string) {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) return null;
  const company = await getCompanySettings();

  const version = invoice.templateVersion ?? (await getLatestVersion(invoice.templateId));
  const layout = (version?.layout as unknown as TemplateDocument) ?? null;

  const context = buildRenderContext({
    company,
    customer: invoice.customer,
    invoice: {
      invoiceNumber: invoice.invoiceNumber,
      issueDateIso: invoice.issueDate?.toISOString() ?? null,
      dueDateIso: invoice.dueDate?.toISOString() ?? null,
      status: invoice.status,
      subtotal: invoice.subtotal.toString(),
      discountTotal: invoice.discountTotal.toString(),
      taxableAmount: invoice.taxableAmount.toString(),
      cgstTotal: invoice.cgstTotal.toString(),
      sgstTotal: invoice.sgstTotal.toString(),
      igstTotal: invoice.igstTotal.toString(),
      taxTotal: invoice.taxTotal.toString(),
      roundOff: invoice.roundOff.toString(),
      grandTotal: invoice.grandTotal.toString(),
      paidTotal: invoice.paidTotal.toString(),
      balanceDue: invoice.balanceDue.toString(),
      notes: invoice.notes,
      terms: invoice.terms,
    },
    items: invoice.items.map((item) => ({
      description: item.description,
      hsnSac: item.hsnSac,
      quantity: item.quantity.toString(),
      unit: item.unit,
      rate: item.rate.toString(),
      discount: item.discount.toString(),
      gstRate: item.gstRate.toString(),
      taxAmount: item.taxAmount.toString(),
      lineTotal: item.lineTotal.toString(),
    })),
  });

  return { invoice, layout, context };
}
