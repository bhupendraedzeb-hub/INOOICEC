import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { getApiKey, revokeApiKey } from "@/lib/services/apiKeys";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const POST = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    const existing = await getApiKey(params.id);
    if (!existing) throw new ApiError(404, "API key not found");
    if (existing.revokedAt) throw new ApiError(409, "API key is already revoked");

    const key = await revokeApiKey(params.id);
    await writeAuditEvent({
      actorId: session.user.id,
      action: "api_key.revoked",
      entityType: "ApiKey",
      entityId: key.id,
    });
    return NextResponse.json({ id: key.id, revokedAt: key.revokedAt });
  },
  { roles: ["OWNER", "ADMIN"] },
);
