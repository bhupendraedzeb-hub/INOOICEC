import { db } from "@/lib/db";

export async function listWebhookDeliveries(opts: { endpointId?: string; limit?: number }) {
  return db.webhookDelivery.findMany({
    where: opts.endpointId ? { endpointId: opts.endpointId } : {},
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 50,
  });
}

export async function getWebhookDelivery(id: string) {
  return db.webhookDelivery.findUnique({ where: { id } });
}
