"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PaymentLinkRow = {
  id: string;
  token: string;
  amount: string;
  provider: string;
  status: string;
  expiresAt: string | null;
  paidAt: string | null;
};

const STATUS_CLS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  PAID: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  EXPIRED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  DEACTIVATED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function PaymentLinkList({ links }: { links: PaymentLinkRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function deactivate(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/v1/payment-links/${id}/deactivate`, { method: "POST" });
    setBusyId(null);
    if (res.ok) router.refresh();
  }

  if (links.length === 0) {
    return <p className="text-sm text-zinc-400">No payment links created yet.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <th className="py-1.5 font-medium">Token</th>
          <th className="py-1.5 font-medium">Amount</th>
          <th className="py-1.5 font-medium">Provider</th>
          <th className="py-1.5 font-medium">Expires</th>
          <th className="py-1.5 font-medium">Status</th>
          <th className="py-1.5 font-medium" />
        </tr>
      </thead>
      <tbody>
        {links.map((l) => (
          <tr key={l.id} className="border-b border-zinc-100 dark:border-zinc-900">
            <td className="py-1.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">{l.token.slice(0, 10)}…</td>
            <td className="py-1.5 text-zinc-900 dark:text-zinc-50">{l.amount}</td>
            <td className="py-1.5 text-zinc-600 dark:text-zinc-400">{l.provider}</td>
            <td className="py-1.5 text-zinc-600 dark:text-zinc-400">
              {l.expiresAt ? new Date(l.expiresAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}
            </td>
            <td className="py-1.5">
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLS[l.status] ?? ""}`}>{l.status}</span>
            </td>
            <td className="py-1.5">
              {l.status === "ACTIVE" && (
                <button
                  type="button"
                  onClick={() => deactivate(l.id)}
                  disabled={busyId === l.id}
                  className="text-xs text-red-600 disabled:opacity-50 dark:text-red-400"
                >
                  Deactivate
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
