import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { invoiceInputSchema, type InvoiceInput } from "@/lib/validation/schemas/invoice";
import { getInvoice, updateInvoiceDraft, deleteDraftInvoice } from "@/lib/services/invoices";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ params }) => {
    const invoice = await getInvoice(params.id);
    if (!invoice) throw new ApiError(404, "Invoice not found");
    return NextResponse.json(invoice);
  },
  { scope: "invoices:read" },
);

export const PUT = withAuthedJson<InvoiceInput, { id: string }>(
  invoiceInputSchema,
  async ({ session, body, params }) => {
    const existing = await getInvoice(params.id);
    if (!existing) throw new ApiError(404, "Invoice not found");
    if (existing.status !== "DRAFT") throw new ApiError(409, "Only draft invoices can be edited");

    const invoice = await updateInvoiceDraft(params.id, body);
    await writeAuditEvent({
      actorId: session.user.id,
      action: "invoice.updated",
      entityType: "Invoice",
      entityId: invoice.id,
    });
    return NextResponse.json(invoice);
  },
  { scope: "invoices:write" },
);

// Hard delete — only ever allowed while still DRAFT (no invoice number
// issued yet, not a real financial record). Issued/cancelled invoices must
// use /cancel instead; they are never deleted.
export const DELETE = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    const existing = await getInvoice(params.id);
    if (!existing) throw new ApiError(404, "Invoice not found");
    if (existing.status !== "DRAFT") throw new ApiError(409, "Only draft invoices can be deleted — cancel issued invoices instead");

    await deleteDraftInvoice(params.id);
    await writeAuditEvent({
      actorId: session.user.id,
      action: "invoice.deleted",
      entityType: "Invoice",
      entityId: params.id,
    });
    return NextResponse.json({ ok: true });
  },
  { scope: "invoices:write" },
);
