import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { signWebhookPayload } from "@/lib/webhooks/signature";
import type { Prisma } from "@/generated/prisma/client";

// After this many attempts a delivery stops retrying automatically and
// moves to EXHAUSTED — only a manual replay (below) brings it back.
const MAX_ATTEMPTS = 8;
// Exponential-ish backoff: 1m, 5m, 15m, 1h, 3h, 6h, 12h, 24h (indexed by
// attempts-so-far, clamped to the last entry beyond that).
const BACKOFF_SCHEDULE_MS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  3 * 60 * 60_000,
  6 * 60 * 60_000,
  12 * 60 * 60_000,
  24 * 60 * 60_000,
];
const RESPONSE_BODY_TRUNCATE = 2000;

function nextBackoffMs(attempts: number): number {
  return BACKOFF_SCHEDULE_MS[Math.min(attempts - 1, BACKOFF_SCHEDULE_MS.length - 1)];
}

type DeliveryWithEndpoint = Prisma.WebhookDeliveryGetPayload<{ include: { endpoint: true } }>;

async function attemptDelivery(delivery: DeliveryWithEndpoint) {
  if (!delivery.endpoint.isActive) {
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", error: "Endpoint is inactive", nextAttemptAt: null },
    });
    return;
  }

  const body = JSON.stringify(delivery.payload);
  const { signature, timestamp } = signWebhookPayload(delivery.endpoint.signingSecret, body);
  const attempts = delivery.attempts + 1;

  try {
    const response = await fetch(delivery.endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Timestamp": String(timestamp),
        "X-Webhook-Event": delivery.event,
        "X-Webhook-Delivery-Id": delivery.id,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const responseBody = (await response.text().catch(() => "")).slice(0, RESPONSE_BODY_TRUNCATE);

    if (response.ok) {
      await db.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "SUCCESS",
          attempts,
          lastAttemptAt: new Date(),
          responseStatus: response.status,
          responseBody,
          error: null,
          nextAttemptAt: null,
        },
      });
      return;
    }
    throw new Error(`Endpoint responded with HTTP ${response.status}: ${responseBody.slice(0, 300)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const exhausted = attempts >= MAX_ATTEMPTS;
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: exhausted ? "EXHAUSTED" : "FAILED",
        attempts,
        lastAttemptAt: new Date(),
        nextAttemptAt: exhausted ? null : new Date(Date.now() + nextBackoffMs(attempts)),
        error: message,
      },
    });
    logger.warn(
      { deliveryId: delivery.id, endpointId: delivery.endpointId, attempts, exhausted, err: message },
      "webhook delivery attempt failed",
    );
  }
}

// Picks up every PENDING/FAILED delivery whose nextAttemptAt has arrived
// (or was never set — a fresh PENDING row) and attempts it once each.
// EXHAUSTED deliveries are deliberately excluded — they only move again via
// replayWebhookDelivery. Called on an interval by instrumentation.ts (the
// plan.md-specified "simple in-app queue... cron-triggered or node-cron",
// implemented here without a new dependency).
export async function deliverPendingWebhooks(limit = 20): Promise<number> {
  const due = await db.webhookDelivery.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
    },
    include: { endpoint: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  for (const delivery of due) {
    await attemptDelivery(delivery);
  }
  return due.length;
}

// Operator-initiated retry (plan.md: "Replay/retry capability") — resets
// attempts to 0 for a fresh backoff cycle. Works on FAILED and EXHAUSTED
// deliveries alike; the next worker tick picks it back up immediately
// (nextAttemptAt cleared).
export async function replayWebhookDelivery(id: string) {
  return db.webhookDelivery.update({
    where: { id },
    data: { status: "PENDING", attempts: 0, nextAttemptAt: null, error: null, responseStatus: null, responseBody: null },
  });
}
