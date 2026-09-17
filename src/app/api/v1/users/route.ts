import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { createUserSchema } from "@/lib/validation/schemas/user";
import { listOrgUsers, createOrgUser, EmailAlreadyRegisteredError } from "@/lib/services/users";
import { writeAuditEvent } from "@/lib/audit/auditLog";

// OWNER/ADMIN, session-only — no `scope` option, so after the handler.ts
// fix an API key can never manage user accounts, regardless of scope.
export const GET = withAuthedJson(
  null,
  async ({ session }) => {
    const users = await listOrgUsers(session.user.organizationId);
    return NextResponse.json(users);
  },
  { roles: ["OWNER", "ADMIN"] },
);

export const POST = withAuthedJson(
  createUserSchema,
  async ({ session, body }) => {
    try {
      const user = await createOrgUser(session.user.organizationId, body);
      await writeAuditEvent({
        organizationId: session.user.organizationId,
        actorId: session.user.id,
        action: "user.created",
        entityType: "User",
        entityId: user.id,
        metadata: { role: body.role },
      });
      return NextResponse.json(user, { status: 201 });
    } catch (err) {
      if (err instanceof EmailAlreadyRegisteredError) throw new ApiError(409, err.message);
      throw err;
    }
  },
  { roles: ["OWNER", "ADMIN"] },
);
