import Link from "next/link";
import { notFound } from "next/navigation";
import { getWebhookEndpoint } from "@/lib/services/webhookEndpoints";
import { listWebhookDeliveries } from "@/lib/services/webhookDeliveries";
import { WebhookDeliveryLog } from "@/components/settings/WebhookDeliveryLog";

export default async function WebhookEndpointDeliveriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const endpoint = await getWebhookEndpoint(id);
  if (!endpoint) notFound();
  const deliveries = await listWebhookDeliveries({ endpointId: id });

  return (
    <div className="max-w-4xl">
      <Link href="/settings/webhooks" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
        ← Back to Webhooks
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {endpoint.label || endpoint.url}
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {endpoint.url} · {endpoint.events.join(", ")}
      </p>

      <div className="mt-6">
        <WebhookDeliveryLog
          deliveries={deliveries.map((d) => ({
            id: d.id,
            event: d.event,
            status: d.status,
            attempts: d.attempts,
            lastAttemptAt: d.lastAttemptAt?.toISOString() ?? null,
            nextAttemptAt: d.nextAttemptAt?.toISOString() ?? null,
            responseStatus: d.responseStatus,
            error: d.error,
            createdAt: d.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
