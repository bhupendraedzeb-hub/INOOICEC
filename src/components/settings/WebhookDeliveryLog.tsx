"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type WebhookDeliveryRow = {
  id: string;
  event: string;
  status: string;
  attempts: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  responseStatus: number | null;
  error: string | null;
  createdAt: string;
};

const STATUS_CLS: Record<string, string> = {
  PENDING: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  SUCCESS: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  FAILED: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  EXHAUSTED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function WebhookDeliveryLog({ deliveries }: { deliveries: WebhookDeliveryRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function replay(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/v1/webhook-deliveries/${id}/replay`, { method: "POST" });
    setBusyId(null);
    if (res.ok) router.refresh();
  }

  if (deliveries.length === 0) {
    return <p className="text-sm text-zinc-400">No deliveries yet.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <th className="py-1.5 font-medium">Event</th>
          <th className="py-1.5 font-medium">Status</th>
          <th className="py-1.5 font-medium">Attempts</th>
          <th className="py-1.5 font-medium">Last Attempt</th>
          <th className="py-1.5 font-medium">Response</th>
          <th className="py-1.5 font-medium">Error</th>
          <th className="py-1.5 font-medium" />
        </tr>
      </thead>
      <tbody>
        {deliveries.map((d) => (
          <tr key={d.id} className="border-b border-zinc-100 dark:border-zinc-900">
            <td className="py-1.5 font-mono text-xs text-zinc-900 dark:text-zinc-50">{d.event}</td>
            <td className="py-1.5">
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLS[d.status] ?? ""}`}>{d.status}</span>
            </td>
            <td className="py-1.5 text-zinc-600 dark:text-zinc-400">{d.attempts}</td>
            <td className="py-1.5 text-zinc-600 dark:text-zinc-400">
              {d.lastAttemptAt ? new Date(d.lastAttemptAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}
            </td>
            <td className="py-1.5 text-zinc-600 dark:text-zinc-400">{d.responseStatus ?? "—"}</td>
            <td className="max-w-xs truncate py-1.5 text-xs text-red-600 dark:text-red-400">{d.error ?? "—"}</td>
            <td className="py-1.5">
              {(d.status === "FAILED" || d.status === "EXHAUSTED") && (
                <button
                  type="button"
                  onClick={() => replay(d.id)}
                  disabled={busyId === d.id}
                  className="text-xs text-zinc-600 disabled:opacity-50 dark:text-zinc-400"
                >
                  Replay
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
