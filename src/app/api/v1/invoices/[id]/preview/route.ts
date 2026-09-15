import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { getInvoice } from "@/lib/services/invoices";
import { getCompanySettings } from "@/lib/services/companySettings";
import { getLatestVersion } from "@/lib/services/templates";
import { buildRenderContext } from "@/lib/render/buildRenderContext";

// Pure read/render — never touches numbering, versioning, or status. Safe to
// call unlimited times, including for a still-DRAFT invoice. Returns the
// layout (pinned TemplateVersion if issued, else the template's latest) plus
// the resolved RenderContext, for a client to feed into TemplateRenderer.
// The full server-rendered HTML print route is Phase 12.
export const GET = withAuthedJson<undefined, { id: string }>(null, async ({ params }) => {
  const invoice = await getInvoice(params.id);
  if (!invoice) throw new ApiError(404, "Invoice not found");
  const company = await getCompanySettings();

  // Issued invoices always render from their pinned version; drafts follow
  // the template's current (latest) version since nothing is pinned yet.
  const version = invoice.templateVersion ?? (await getLatestVersion(invoice.templateId));
  const layout = version?.layout ?? null;

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

  return NextResponse.json({ invoice, layout, context });
});
