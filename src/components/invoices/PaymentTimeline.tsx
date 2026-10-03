"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PaymentRow = {
  id: string;
  amount: string;
  paymentDate: string;
  method: string;
  transactionRef: string | null;
  notes: string | null;
  isVoided: boolean;
  voidedReason: string | null;
  // Null when no default receipt template was configured for the
  // organization at the time this payment was recorded (see
  // lib/services/receipts.ts createReceiptForPayment) — the payment itself
  // always still succeeds either way.
  receiptId: string | null;
};

const METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  CARD: "Card",
  CASH: "Cash",
  GATEWAY: "Payment Gateway",
  OTHER: "Other",
};

export function PaymentTimeline({ payments }: { payments: PaymentRow[] }) {
  const router = useRouter();
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirmVoid(id: string) {
    if (!reason.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/v1/payments/${id}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setBusy(false);
    if (res.ok) {
      setVoidingId(null);
      setReason("");
      router.refresh();
    }
  }

  if (payments.length === 0) {
    return <p className="text-sm text-zinc-400">No payments recorded yet.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <th className="py-1.5 font-medium">Date</th>
          <th className="py-1.5 font-medium">Amount</th>
          <th className="py-1.5 font-medium">Method</th>
          <th className="py-1.5 font-medium">Reference</th>
          <th className="py-1.5 font-medium">Status</th>
          <th className="py-1.5 font-medium">Receipt</th>
          <th className="py-1.5 font-medium" />
        </tr>
      </thead>
      <tbody>
        {payments.map((p) => (
          <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-900">
            <td className="py-1.5 text-zinc-600 dark:text-zinc-400">
              {new Date(p.paymentDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
            </td>
            <td className={`py-1.5 ${p.isVoided ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-50"}`}>
              {p.amount}
            </td>
            <td className="py-1.5 text-zinc-600 dark:text-zinc-400">{METHOD_LABEL[p.method] ?? p.method}</td>
            <td className="py-1.5 text-zinc-600 dark:text-zinc-400">{p.transactionRef ?? "—"}</td>
            <td className="py-1.5">
              {p.isVoided ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                  Voided
                </span>
              ) : (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-950 dark:text-green-300">
                  Active
                </span>
              )}
            </td>
            <td className="py-1.5">
              {p.receiptId ? (
                <a
                  href={`/api/v1/receipts/${p.receiptId}/pdf`}
                  className="text-xs text-zinc-900 hover:underline dark:text-zinc-50"
                >
                  Download
                </a>
              ) : (
                <span className="text-xs text-zinc-400">—</span>
              )}
            </td>
            <td className="py-1.5">
              {!p.isVoided &&
                (voidingId === p.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason"
                      className="w-28 rounded border border-zinc-300 px-1.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => confirmVoid(p.id)}
                      disabled={busy || !reason.trim()}
                      className="text-xs text-red-600 disabled:opacity-50 dark:text-red-400"
                    >
                      Confirm
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setVoidingId(p.id)}
                    className="text-xs text-red-600 dark:text-red-400"
                  >
                    Void
                  </button>
                ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
