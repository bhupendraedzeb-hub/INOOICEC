import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { templateMetadataSchema, type TemplateMetadataInput } from "@/lib/validation/schemas/template";
import { getTemplate, updateTemplateMetadata, archiveTemplate, getLatestVersion } from "@/lib/services/templates";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    const template = await getTemplate(params.id, session.user.organizationId);
    if (!template) throw new ApiError(404, "Template not found");
    const latestVersion = await getLatestVersion(params.id, session.user.organizationId);
    return NextResponse.json({ ...template, latestVersion });
  },
  { scope: "templates:read" },
);

export const PUT = withAuthedJson<TemplateMetadataInput, { id: string }>(
  templateMetadataSchema,
  async ({ session, body, params }) => {
    const existing = await getTemplate(params.id, session.user.organizationId);
    if (!existing) throw new ApiError(404, "Template not found");
    const template = await updateTemplateMetadata(params.id, session.user.organizationId, body, session.user.id);
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "template.updated",
      entityType: "Template",
      entityId: template.id,
    });
    return NextResponse.json(template);
  },
  { scope: "templates:write" },
);

// Soft delete — see archiveTemplate: sets status=ARCHIVED, never removes the row.
export const DELETE = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    const existing = await getTemplate(params.id, session.user.organizationId);
    if (!existing) throw new ApiError(404, "Template not found");
    const template = await archiveTemplate(params.id, session.user.organizationId);
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "template.archived",
      entityType: "Template",
      entityId: template.id,
    });
    return NextResponse.json(template);
  },
  { scope: "templates:write" },
);
