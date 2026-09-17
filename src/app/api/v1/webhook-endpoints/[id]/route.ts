import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { updateWebhookEndpointSchema, type UpdateWebhookEndpointInput } from "@/lib/validation/schemas/webhookEndpoint";
import { getWebhookEndpoint, updateWebhookEndpoint } from "@/lib/services/webhookEndpoints";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    const endpoint = await getWebhookEndpoint(params.id, session.user.organizationId);
    if (!endpoint) throw new ApiError(404, "Webhook endpoint not found");
    return NextResponse.json(endpoint);
  },
  { roles: ["OWNER", "ADMIN"] },
);

// Also how an endpoint is deactivated — set isActive:false with the other
// fields unchanged. No hard delete: the delivery log (WebhookDelivery) keeps
// pointing at this row, so it's never removed, only turned off.
export const PUT = withAuthedJson<UpdateWebhookEndpointInput, { id: string }>(
  updateWebhookEndpointSchema,
  async ({ session, body, params }) => {
    const existing = await getWebhookEndpoint(params.id, session.user.organizationId);
    if (!existing) throw new ApiError(404, "Webhook endpoint not found");
    const endpoint = await updateWebhookEndpoint(params.id, session.user.organizationId, body);
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "webhook_endpoint.updated",
      entityType: "WebhookEndpoint",
      entityId: endpoint.id,
      metadata: { url: body.url, events: body.events, isActive: body.isActive },
    });
    return NextResponse.json(endpoint);
  },
  { roles: ["OWNER", "ADMIN"] },
);
