import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Prisma } from "@/generated/prisma/client";
import type { WebhookEvent } from "@/lib/webhooks/events";

// Enqueues one WebhookDelivery row per active endpoint subscribed to this
// event — called from the invoice/payment service layer on every state
// change the Phase 15 event list covers. Never throws: a webhook enqueue
// failure must never take down the business operation it's attached to,
// the same rule lib/audit/auditLog.ts's writeAuditEvent follows.
export async function enqueueWebhookEvent(
  event: WebhookEvent,
  entityType: string,
  entityId: string,
  // ISO timestamp of the triggering write (the entity's own updatedAt/
  // createdAt) — folded into the idempotency key below so the exact same
  // state change can never be enqueued twice for the same endpoint, even
  // if the caller somehow runs the enqueue twice.
  version: string,
  data: Record<string, unknown>,
) {
  try {
    const endpoints = await db.webhookEndpoint.findMany({ where: { isActive: true, events: { has: event } } });
    if (endpoints.length === 0) return;

    const payload = { event, timestamp: new Date().toISOString(), data: { entityType, entityId, ...data } };

    await Promise.all(
      endpoints.map(async (endpoint) => {
        const idempotencyKey = `${endpoint.id}:${event}:${entityId}:${version}`;
        try {
          await db.webhookDelivery.create({ data: { endpointId: endpoint.id, event, payload, idempotencyKey } });
        } catch (err) {
          // Already enqueued for this exact state change — not an error.
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
          throw err;
        }
      }),
    );
  } catch (err) {
    logger.error({ err, event, entityType, entityId }, "failed to enqueue webhook delivery");
  }
}
