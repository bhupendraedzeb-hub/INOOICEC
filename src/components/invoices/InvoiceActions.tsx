"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InvoiceActions({ invoiceId, status }: { invoiceId: string; status: "DRAFT" | "ISSUED" | "CANCELLED" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);

  async function issue() {
    setBusy(true);
    const res = await fetch(`/api/v1/invoices/${invoiceId}/issue`, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
    else {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Failed to issue invoice.");
    }
  }

  async function cancel() {
    if (!cancelReason.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/v1/invoices/${invoiceId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: cancelReason }),
    });
    setBusy(false);
    if (res.ok) {
      setShowCancelForm(false);
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Failed to cancel invoice.");
    }
  }

  async function duplicate() {
    setBusy(true);
    const res = await fetch(`/api/v1/invoices/${invoiceId}/duplicate`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const copy = await res.json();
      router.push(`/invoices/${copy.id}`);
      router.refresh();
    }
  }

  async function deleteDraft() {
    if (!confirm("Delete this draft invoice? This cannot be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/v1/invoices/${invoiceId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.push("/invoices");
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {status === "DRAFT" && (
          <button
            type="button"
            onClick={issue}
            disabled={busy}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Issue
          </button>
        )}
        {status === "ISSUED" && (
          <button
            type="button"
            onClick={() => setShowCancelForm((v) => !v)}
            disabled={busy}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-60 dark:border-red-800 dark:text-red-400"
          >
            Cancel Invoice
          </button>
        )}
        <button
          type="button"
          onClick={duplicate}
          disabled={busy}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-zinc-700"
        >
          Duplicate
        </button>
        {status === "DRAFT" && (
          <button
            type="button"
            onClick={deleteDraft}
            disabled={busy}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-60 dark:border-red-800 dark:text-red-400"
          >
            Delete
          </button>
        )}
      </div>
      {showCancelForm && (
        <div className="flex items-center gap-2">
          <input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation"
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={cancel}
            disabled={busy || !cancelReason.trim()}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-60"
          >
            Confirm Cancel
          </button>
        </div>
      )}
    </div>
  );
}
