import { NextResponse } from "next/server";
import { withAuthedJson } from "@/lib/api/handler";
import { receiptTemplateMetadataSchema } from "@/lib/validation/schemas/receiptTemplate";
import { listReceiptTemplates, createReceiptTemplate } from "@/lib/services/receiptTemplates";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson(
  null,
  async ({ request, session }) => {
    const q = request.nextUrl.searchParams.get("q") ?? undefined;
    const status = request.nextUrl.searchParams.get("status") ?? undefined;
    const templates = await listReceiptTemplates(session.user.organizationId, { q, status });
    return NextResponse.json(templates);
  },
  { scope: "receipt_templates:read" },
);

export const POST = withAuthedJson(
  receiptTemplateMetadataSchema,
  async ({ session, body }) => {
    const template = await createReceiptTemplate(body, session.user.id, session.user.organizationId);
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "receipt_template.created",
      entityType: "ReceiptTemplate",
      entityId: template.id,
    });
    return NextResponse.json(template, { status: 201 });
  },
  { scope: "receipt_templates:write" },
);
