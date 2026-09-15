import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { duplicateInvoice } from "@/lib/services/invoices";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const POST = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    const copy = await duplicateInvoice(params.id, session.user.id);
    if (!copy) throw new ApiError(404, "Invoice not found");
    await writeAuditEvent({
      actorId: session.user.id,
      action: "invoice.duplicated",
      entityType: "Invoice",
      entityId: copy.id,
      metadata: { sourceInvoiceId: params.id },
    });
    return NextResponse.json(copy, { status: 201 });
  },
  { scope: "invoices:write" },
);
