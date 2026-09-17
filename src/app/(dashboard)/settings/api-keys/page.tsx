import { auth } from "@/lib/auth/auth";
import { listApiKeys } from "@/lib/services/apiKeys";
import { ApiKeyForm } from "@/components/settings/ApiKeyForm";
import { ApiKeyList } from "@/components/settings/ApiKeyList";

export default async function ApiKeysPage() {
  const session = await auth();
  const canManage = session?.user.role === "OWNER" || session?.user.role === "ADMIN";
  const keys = await listApiKeys(session!.user.organizationId);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">API Keys</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Issue scoped <code>Authorization: Bearer inv_live_…</code> keys for internal systems to use{" "}
        <code>/api/v1</code> programmatically, instead of writing to the database directly.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <ApiKeyList
          keys={keys.map((k) => ({
            id: k.id,
            label: k.label,
            prefix: k.prefix,
            scopes: k.scopes,
            lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
            revokedAt: k.revokedAt?.toISOString() ?? null,
            createdAt: k.createdAt.toISOString(),
            createdBy: k.createdBy,
          }))}
          canManage={canManage}
        />
        {canManage && <ApiKeyForm />}
      </div>
    </div>
  );
}
