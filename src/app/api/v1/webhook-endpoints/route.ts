import { NextResponse } from "next/server";
import { withAuthedJson } from "@/lib/api/handler";
import { createWebhookEndpointSchema } from "@/lib/validation/schemas/webhookEndpoint";
import { listWebhookEndpoints, createWebhookEndpoint } from "@/lib/services/webhookEndpoints";
import { writeAuditEvent } from "@/lib/audit/auditLog";

// OWNER/ADMIN, session-only — configuring where invoice/payment data flows
// externally is at least as sensitive as issuing an API key, so it gets the
// same gating (and isn't exposed to API-key scopes at all).
export const GET = withAuthedJson(
  null,
  async () => {
    const endpoints = await listWebhookEndpoints();
    return NextResponse.json(endpoints);
  },
  { roles: ["OWNER", "ADMIN"] },
);

export const POST = withAuthedJson(
  createWebhookEndpointSchema,
  async ({ session, body }) => {
    const endpoint = await createWebhookEndpoint(body, session.user.id);
    await writeAuditEvent({
      actorId: session.user.id,
      action: "webhook_endpoint.created",
      entityType: "WebhookEndpoint",
      entityId: endpoint.id,
      metadata: { url: body.url, events: body.events },
    });
    return NextResponse.json(endpoint, { status: 201 });
  },
  { roles: ["OWNER", "ADMIN"] },
);
