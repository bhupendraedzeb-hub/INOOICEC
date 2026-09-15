"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events";

const inputCls = "rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function WebhookEndpointForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  function toggleEvent(event: string) {
    setEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]));
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/v1/webhook-endpoints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, label: label || null, events }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create webhook endpoint.");
      return;
    }
    const endpoint = await res.json();
    setCreated(endpoint.signingSecret);
    setUrl("");
    setLabel("");
    setEvents([]);
    router.refresh();
  }

  if (created) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Signing secret — configure this on the receiving end to verify delivery signatures.
        </p>
        <code className="break-all rounded bg-white px-2 py-1 text-xs dark:bg-zinc-900">{created}</code>
        <button
          type="button"
          onClick={() => setCreated(null)}
          className="w-fit rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Add Webhook Endpoint</h4>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-600 dark:text-zinc-400">URL</label>
          <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-600 dark:text-zinc-400">Label</label>
          <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. LMS sync" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-600 dark:text-zinc-400">Events</label>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {WEBHOOK_EVENTS.map((event) => (
            <label key={event} className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
              <input type="checkbox" checked={events.includes(event)} onChange={() => toggleEvent(event)} />
              {event}
            </label>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={saving || !url.trim() || events.length === 0}
        className="w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {saving ? "Adding…" : "Add Endpoint"}
      </button>
    </div>
  );
}
