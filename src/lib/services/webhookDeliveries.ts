import { db } from "@/lib/db";

// WebhookDelivery has no organizationId column of its own — it inherits
// scope via its parent WebhookEndpoint relation, the same pattern
// InvoiceItem uses via Invoice.
export async function listWebhookDeliveries(organizationId: string, opts: { endpointId?: string; limit?: number }) {
  return db.webhookDelivery.findMany({
    where: { endpoint: { organizationId }, ...(opts.endpointId ? { endpointId: opts.endpointId } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 50,
  });
}

export async function getWebhookDelivery(id: string, organizationId: string) {
  return db.webhookDelivery.findFirst({ where: { id, endpoint: { organizationId } } });
}
