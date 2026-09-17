import { NextResponse } from "next/server";
import { withAuthedJson, ApiError } from "@/lib/api/handler";
import { getWebhookDelivery } from "@/lib/services/webhookDeliveries";
import { replayWebhookDelivery } from "@/lib/webhooks/worker";
import { writeAuditEvent } from "@/lib/audit/auditLog";

// Resets the delivery to PENDING with attempts=0 — the next worker tick
// (instrumentation.ts's poller) picks it up immediately since nextAttemptAt
// is cleared. Works on FAILED and EXHAUSTED deliveries alike.
export const POST = withAuthedJson<undefined, { id: string }>(
  null,
  async ({ session, params }) => {
    const existing = await getWebhookDelivery(params.id, session.user.organizationId);
    if (!existing) throw new ApiError(404, "Webhook delivery not found");

    const delivery = await replayWebhookDelivery(params.id);
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "webhook_delivery.replayed",
      entityType: "WebhookDelivery",
      entityId: delivery.id,
    });
    return NextResponse.json(delivery);
  },
  { roles: ["OWNER", "ADMIN"] },
);
