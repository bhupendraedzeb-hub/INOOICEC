import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { createReceiptVersionSchema, type CreateReceiptVersionInput } from "@/lib/validation/schemas/receiptTemplate";
import { listReceiptVersions, createReceiptTemplateVersion, getReceiptTemplate } from "@/lib/services/receiptTemplates";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    const versions = await listReceiptVersions(params.id, session.user.organizationId);
    return NextResponse.json(versions);
  },
  { scope: "receipt_templates:read" },
);

// Always creates a new version row — insert-only, same immutability rule as
// invoice TemplateVersion.
export const POST = withAuthedJson<CreateReceiptVersionInput, { id: string }>(
  createReceiptVersionSchema,
  async ({ session, body, params }) => {
    const template = await getReceiptTemplate(params.id, session.user.organizationId);
    if (!template) throw new ApiError(404, "Receipt template not found");
    const version = await createReceiptTemplateVersion(params.id, session.user.organizationId, body.layout, session.user.id);
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "receipt_template.version_created",
      entityType: "ReceiptTemplateVersion",
      entityId: version.id,
      metadata: { templateId: params.id, versionNumber: version.versionNumber },
    });
    return NextResponse.json(version, { status: 201 });
  },
  { scope: "receipt_templates:write" },
);
