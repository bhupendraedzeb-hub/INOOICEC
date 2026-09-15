"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_KEY_SCOPES } from "@/lib/validation/schemas/apiKey";

const inputCls = "rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function ApiKeyForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  function toggleScope(scope: string) {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/v1/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, scopes }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create API key.");
      return;
    }
    const key = await res.json();
    setCreated(key.plaintext);
    setLabel("");
    setScopes([]);
    router.refresh();
  }

  if (created) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Copy this key now — it won&apos;t be shown again.
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
      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Create API Key</h4>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-600 dark:text-zinc-400">Label</label>
        <input
          className={inputCls}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. LeadSquared integration"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-600 dark:text-zinc-400">Scopes</label>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {API_KEY_SCOPES.map((scope) => (
            <label key={scope} className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
              <input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)} />
              {scope}
            </label>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={saving || !label.trim() || scopes.length === 0}
        className="w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {saving ? "Creating…" : "Create Key"}
      </button>
    </div>
  );
}
