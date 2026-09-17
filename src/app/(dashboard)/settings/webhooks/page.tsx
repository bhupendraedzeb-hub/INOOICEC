import { auth } from "@/lib/auth/auth";
import { listWebhookEndpoints } from "@/lib/services/webhookEndpoints";
import { WebhookEndpointForm } from "@/components/settings/WebhookEndpointForm";
import { WebhookEndpointList } from "@/components/settings/WebhookEndpointList";

export default async function WebhooksPage() {
  const session = await auth();
  const canManage = session?.user.role === "OWNER" || session?.user.role === "ADMIN";
  const endpoints = await listWebhookEndpoints(session!.user.organizationId);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Webhooks</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Notify other internal systems (LMS, payment system, website) of invoice/payment events instead of them reading
        the database directly. Deliveries are HMAC-signed and retried with backoff on failure.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <WebhookEndpointList
          endpoints={endpoints.map((e) => ({
            id: e.id,
            url: e.url,
            label: e.label,
            events: e.events,
            isActive: e.isActive,
            createdBy: e.createdBy,
          }))}
          canManage={canManage}
        />
        {canManage && <WebhookEndpointForm />}
      </div>
    </div>
  );
}
