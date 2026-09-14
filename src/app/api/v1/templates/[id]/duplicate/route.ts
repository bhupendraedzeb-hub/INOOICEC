import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { duplicateTemplate } from "@/lib/services/templates";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const POST = withAuthedJson<undefined, { id: string }>(null, async ({ session, params }) => {
  const copy = await duplicateTemplate(params.id, session.user.id);
  if (!copy) throw new ApiError(404, "Template not found");
  await writeAuditEvent({
    actorId: session.user.id,
    action: "template.duplicated",
    entityType: "Template",
    entityId: copy.id,
    metadata: { sourceTemplateId: params.id },
  });
  return NextResponse.json(copy, { status: 201 });
});
