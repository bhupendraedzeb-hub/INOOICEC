import { NextResponse } from "next/server";
import { withAuthedJson } from "@/lib/api/handler";
import { createApiKeySchema } from "@/lib/validation/schemas/apiKey";
import { listApiKeys, createApiKey } from "@/lib/services/apiKeys";
import { writeAuditEvent } from "@/lib/audit/auditLog";

// OWNER/ADMIN, session-only — an API key can never mint another API key
// (no `scope` option here at all), so key management itself isn't part of
// the scope system it governs.
export const GET = withAuthedJson(null, async () => {
  const keys = await listApiKeys();
  return NextResponse.json(keys);
}, { roles: ["OWNER", "ADMIN"] });

export const POST = withAuthedJson(
  createApiKeySchema,
  async ({ session, body }) => {
    const key = await createApiKey(body, session.user.id);
    await writeAuditEvent({
      actorId: session.user.id,
      action: "api_key.created",
      entityType: "ApiKey",
      entityId: key.id,
      metadata: { label: body.label, scopes: body.scopes },
    });
    // The only response that will ever carry the plaintext secret.
    return NextResponse.json(key, { status: 201 });
  },
  { roles: ["OWNER", "ADMIN"] },
);
