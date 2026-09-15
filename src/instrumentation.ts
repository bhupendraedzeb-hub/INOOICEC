// The "simple in-app queue... cron-triggered or node-cron" plan.md asks for
// (explicitly not Redis/BullMQ) — a `register()` hook that runs once when
// the Next.js server starts (dev or production) and kicks off an in-process
// interval poller for lib/webhooks/worker.ts. No new dependency: setInterval
// is the "node-cron" here.
export async function register() {
  // Prisma (via lib/webhooks/worker.ts -> lib/db.ts) isn't edge-compatible;
  // this file can theoretically load under either runtime, so the actual
  // work is gated to Node and dynamically imported rather than statically
  // imported at module scope.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Guards against starting a second interval on every Next dev hot-reload
  // — globalThis survives module reloads in the same process, the same
  // pattern lib/db.ts's PrismaClient singleton uses.
  const globalForWebhooks = globalThis as unknown as { webhookWorkerStarted?: boolean };
  if (globalForWebhooks.webhookWorkerStarted) return;
  globalForWebhooks.webhookWorkerStarted = true;

  const POLL_INTERVAL_MS = 30_000;

  setInterval(() => {
    void (async () => {
      const { deliverPendingWebhooks } = await import("@/lib/webhooks/worker");
      const { logger } = await import("@/lib/logger");
      try {
        await deliverPendingWebhooks();
      } catch (err) {
        logger.error({ err }, "webhook delivery poll failed");
      }
    })();
  }, POLL_INTERVAL_MS);
}
