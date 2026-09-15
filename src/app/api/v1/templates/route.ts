import { NextResponse } from "next/server";
import { withAuthedJson } from "@/lib/api/handler";
import { templateMetadataSchema } from "@/lib/validation/schemas/template";
import { listTemplates, createTemplate } from "@/lib/services/templates";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson(
  null,
  async ({ request }) => {
    const q = request.nextUrl.searchParams.get("q") ?? undefined;
    const status = request.nextUrl.searchParams.get("status") ?? undefined;
    const templates = await listTemplates({ q, status });
    return NextResponse.json(templates);
  },
  { scope: "templates:read" },
);

export const POST = withAuthedJson(
  templateMetadataSchema,
  async ({ session, body }) => {
    const template = await createTemplate(body, session.user.id);
    await writeAuditEvent({
      actorId: session.user.id,
      action: "template.created",
      entityType: "Template",
      entityId: template.id,
    });
    return NextResponse.json(template, { status: 201 });
  },
  { scope: "templates:write" },
);
