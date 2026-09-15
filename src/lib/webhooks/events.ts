// AGENTS.md §Phase 15 event list — the only events a WebhookEndpoint can
// subscribe to. Kept fully generic (no vendor-specific event names).
export const WEBHOOK_EVENTS = [
  "invoice.created",
  "invoice.issued",
  "invoice.updated",
  "invoice.cancelled",
  "payment.created",
  "payment.updated",
  "payment.completed",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export function isWebhookEvent(value: string): value is WebhookEvent {
  return (WEBHOOK_EVENTS as readonly string[]).includes(value);
}
