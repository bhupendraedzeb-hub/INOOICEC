"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputCls = "rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function PaymentForm({ invoiceId, balanceDue }: { invoiceId: string; balanceDue: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState(balanceDue);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/v1/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId,
        amount,
        paymentDate,
        method,
        transactionRef: transactionRef || null,
        notes: notes || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to record payment.");
      return;
    }
    setAmount("0.00");
    setTransactionRef("");
    setNotes("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Record Payment</h4>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-600 dark:text-zinc-400">Amount</label>
          <input className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-600 dark:text-zinc-400">Date</label>
          <input type="date" className={inputCls} value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-600 dark:text-zinc-400">Method</label>
          <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="CASH">Cash</option>
            <option value="GATEWAY">Payment Gateway</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-600 dark:text-zinc-400">Reference</label>
          <input className={inputCls} value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-600 dark:text-zinc-400">Notes</label>
        <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className="w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {saving ? "Saving…" : "Add Payment"}
      </button>
    </div>
  );
}
