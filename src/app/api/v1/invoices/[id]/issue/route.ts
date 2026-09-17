import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { getInvoice, issueInvoice } from "@/lib/services/invoices";
import { writeAuditEvent } from "@/lib/audit/auditLog";

// The only place an invoice number is reserved and a TemplateVersion is
// pinned. See lib/services/invoices.ts issueInvoice / lib/numbering.
export const POST = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    const existing = await getInvoice(params.id, session.user.organizationId);
    if (!existing) throw new ApiError(404, "Invoice not found");
    if (existing.status !== "DRAFT") throw new ApiError(409, "Only draft invoices can be issued");
    if (existing.items.length === 0) throw new ApiError(422, "Cannot issue an invoice with no items");

    const invoice = await issueInvoice(params.id, session.user.organizationId);
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "invoice.issued",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: { invoiceNumber: invoice.invoiceNumber },
    });
    return NextResponse.json(invoice);
  },
  { scope: "invoices:write" },
);
