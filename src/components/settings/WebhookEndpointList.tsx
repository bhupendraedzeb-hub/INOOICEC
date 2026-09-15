"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type WebhookEndpointRow = {
  id: string;
  url: string;
  label: string | null;
  events: string[];
  isActive: boolean;
  createdBy: { id: string; name: string } | null;
};

export function WebhookEndpointList({ endpoints, canManage }: { endpoints: WebhookEndpointRow[]; canManage: boolean }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleActive(endpoint: WebhookEndpointRow) {
    setBusyId(endpoint.id);
    const res = await fetch(`/api/v1/webhook-endpoints/${endpoint.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: endpoint.url, label: endpoint.label, events: endpoint.events, isActive: !endpoint.isActive }),
    });
    setBusyId(null);
    if (res.ok) router.refresh();
  }

  if (endpoints.length === 0) {
    return <p className="text-sm text-zinc-400">No webhook endpoints configured yet.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <th className="py-1.5 font-medium">Label</th>
          <th className="py-1.5 font-medium">URL</th>
          <th className="py-1.5 font-medium">Events</th>
          <th className="py-1.5 font-medium">Status</th>
          {canManage && <th className="py-1.5 font-medium" />}
        </tr>
      </thead>
      <tbody>
        {endpoints.map((e) => (
          <tr key={e.id} className="border-b border-zinc-100 dark:border-zinc-900">
            <td className="py-1.5 text-zinc-900 dark:text-zinc-50">
              <Link href={`/settings/webhooks/${e.id}`} className="hover:underline">
                {e.label || "(untitled)"}
              </Link>
            </td>
            <td className="max-w-xs truncate py-1.5 text-xs text-zinc-600 dark:text-zinc-400">{e.url}</td>
            <td className="py-1.5 text-xs text-zinc-600 dark:text-zinc-400">{e.events.join(", ")}</td>
            <td className="py-1.5">
              {e.isActive ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-950 dark:text-green-300">
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  Inactive
                </span>
              )}
            </td>
            {canManage && (
              <td className="py-1.5">
                <button
                  type="button"
                  onClick={() => toggleActive(e)}
                  disabled={busyId === e.id}
                  className="text-xs text-zinc-600 disabled:opacity-50 dark:text-zinc-400"
                >
                  {e.isActive ? "Deactivate" : "Activate"}
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
