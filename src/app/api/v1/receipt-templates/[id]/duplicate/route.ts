import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { duplicateReceiptTemplate } from "@/lib/services/receiptTemplates";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const POST = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    const copy = await duplicateReceiptTemplate(params.id, session.user.organizationId, session.user.id);
    if (!copy) throw new ApiError(404, "Receipt template not found");
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "receipt_template.duplicated",
      entityType: "ReceiptTemplate",
      entityId: copy.id,
      metadata: { sourceTemplateId: params.id },
    });
    return NextResponse.json(copy, { status: 201 });
  },
  { scope: "receipt_templates:write" },
);
