import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { receiptTemplateMetadataSchema, type ReceiptTemplateMetadataInput } from "@/lib/validation/schemas/receiptTemplate";
import {
  getReceiptTemplate,
  updateReceiptTemplateMetadata,
  archiveReceiptTemplate,
  getLatestReceiptVersion,
} from "@/lib/services/receiptTemplates";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    const template = await getReceiptTemplate(params.id, session.user.organizationId);
    if (!template) throw new ApiError(404, "Receipt template not found");
    const latestVersion = await getLatestReceiptVersion(params.id, session.user.organizationId);
    return NextResponse.json({ ...template, latestVersion });
  },
  { scope: "receipt_templates:read" },
);

export const PUT = withAuthedJson<ReceiptTemplateMetadataInput, { id: string }>(
  receiptTemplateMetadataSchema,
  async ({ session, body, params }) => {
    const existing = await getReceiptTemplate(params.id, session.user.organizationId);
    if (!existing) throw new ApiError(404, "Receipt template not found");
    const template = await updateReceiptTemplateMetadata(params.id, session.user.organizationId, body, session.user.id);
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "receipt_template.updated",
      entityType: "ReceiptTemplate",
      entityId: template.id,
    });
    return NextResponse.json(template);
  },
  { scope: "receipt_templates:write" },
);

// Soft delete — see archiveReceiptTemplate: sets status=ARCHIVED, never removes the row.
export const DELETE = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    const existing = await getReceiptTemplate(params.id, session.user.organizationId);
    if (!existing) throw new ApiError(404, "Receipt template not found");
    const template = await archiveReceiptTemplate(params.id, session.user.organizationId);
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "receipt_template.archived",
      entityType: "ReceiptTemplate",
      entityId: template.id,
    });
    return NextResponse.json(template);
  },
  { scope: "receipt_templates:write" },
);
