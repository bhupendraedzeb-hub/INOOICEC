import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { getOrgUser, deactivateOrgUser } from "@/lib/services/users";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const POST = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    if (params.id === session.user.id) throw new ApiError(422, "You cannot deactivate your own account");

    const existing = await getOrgUser(params.id, session.user.organizationId);
    if (!existing) throw new ApiError(404, "User not found");

    const user = await deactivateOrgUser(params.id, session.user.organizationId);
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "user.deactivated",
      entityType: "User",
      entityId: user.id,
    });
    return NextResponse.json(user);
  },
  { roles: ["OWNER", "ADMIN"] },
);
