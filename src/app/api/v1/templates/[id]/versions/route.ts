import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { createVersionSchema, type CreateVersionInput } from "@/lib/validation/schemas/template";
import { listVersions, createTemplateVersion, getTemplate } from "@/lib/services/templates";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ params }) => {
    const versions = await listVersions(params.id);
    return NextResponse.json(versions);
  },
  { scope: "templates:read" },
);

// Always creates a new version row — see templates.ts: there is no update
// path for an existing TemplateVersion. This is the enforcement point for
// "editing a template must never change an old invoice" (plan.md Critical
// Business Rules): old versions are simply never touched again.
export const POST = withAuthedJson<CreateVersionInput, { id: string }>(
  createVersionSchema,
  async ({ session, body, params }) => {
    const template = await getTemplate(params.id);
    if (!template) throw new ApiError(404, "Template not found");
    const version = await createTemplateVersion(params.id, body.layout, session.user.id);
    await writeAuditEvent({
      actorId: session.user.id,
      action: "template.version_created",
      entityType: "TemplateVersion",
      entityId: version.id,
      metadata: { templateId: params.id, versionNumber: version.versionNumber },
    });
    return NextResponse.json(version, { status: 201 });
  },
  { scope: "templates:write" },
);
