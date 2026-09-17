import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { cancelInvoiceSchema, type CancelInvoiceInput } from "@/lib/validation/schemas/invoice";
import { getInvoice, cancelInvoice } from "@/lib/services/invoices";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const POST = withAuthedJson<CancelInvoiceInput, { id: string }>(
  cancelInvoiceSchema,
  async ({ session, body, params }) => {
    const existing = await getInvoice(params.id, session.user.organizationId);
    if (!existing) throw new ApiError(404, "Invoice not found");
    if (existing.status === "CANCELLED") throw new ApiError(409, "Invoice is already cancelled");

    const invoice = await cancelInvoice(params.id, session.user.organizationId, body.reason);
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "invoice.cancelled",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: { reason: body.reason },
    });
    return NextResponse.json(invoice);
  },
  { scope: "invoices:write" },
);
