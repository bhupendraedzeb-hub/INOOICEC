import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { getInvoice } from "@/lib/services/invoices";
import { renderInvoicePdf } from "@/lib/pdf/printInvoice";

// Works for both DRAFT (renders the template's current live version) and
// ISSUED/CANCELLED (renders the pinned TemplateVersion) invoices — the same
// draft-vs-pinned resolution resolveInvoiceRenderData already applies for
// the on-screen preview.
export const GET = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ params }) => {
    const invoice = await getInvoice(params.id);
    if (!invoice) throw new ApiError(404, "Invoice not found");

    const pdf = await renderInvoicePdf(params.id);
    const filename = invoice.invoiceNumber ? `${invoice.invoiceNumber}.pdf` : `draft-invoice-${invoice.id}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  },
  { scope: "invoices:read" },
);
