"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ApiKeyRow = {
  id: string;
  label: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
};

export function ApiKeyList({ keys, canManage }: { keys: ApiKeyRow[]; canManage: boolean }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function revoke(id: string) {
    if (!confirm("Revoke this API key? Any client using it will immediately lose access.")) return;
    setBusyId(id);
    const res = await fetch(`/api/v1/api-keys/${id}/revoke`, { method: "POST" });
    setBusyId(null);
    if (res.ok) router.refresh();
  }

  if (keys.length === 0) {
    return <p className="text-sm text-zinc-400">No API keys created yet.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <th className="py-1.5 font-medium">Label</th>
          <th className="py-1.5 font-medium">Key</th>
          <th className="py-1.5 font-medium">Scopes</th>
          <th className="py-1.5 font-medium">Created By</th>
          <th className="py-1.5 font-medium">Last Used</th>
          <th className="py-1.5 font-medium">Status</th>
          {canManage && <th className="py-1.5 font-medium" />}
        </tr>
      </thead>
      <tbody>
        {keys.map((k) => (
          <tr key={k.id} className="border-b border-zinc-100 dark:border-zinc-900">
            <td className="py-1.5 text-zinc-900 dark:text-zinc-50">{k.label}</td>
            <td className="py-1.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">{k.prefix}…</td>
            <td className="py-1.5 text-xs text-zinc-600 dark:text-zinc-400">{k.scopes.join(", ")}</td>
            <td className="py-1.5 text-zinc-600 dark:text-zinc-400">{k.createdBy?.name ?? "—"}</td>
            <td className="py-1.5 text-zinc-600 dark:text-zinc-400">
              {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "Never"}
            </td>
            <td className="py-1.5">
              {k.revokedAt ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                  Revoked
                </span>
              ) : (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-950 dark:text-green-300">
                  Active
                </span>
              )}
            </td>
            {canManage && (
              <td className="py-1.5">
                {!k.revokedAt && (
                  <button
                    type="button"
                    onClick={() => revoke(k.id)}
                    disabled={busyId === k.id}
                    className="text-xs text-red-600 disabled:opacity-50 dark:text-red-400"
                  >
                    Revoke
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
