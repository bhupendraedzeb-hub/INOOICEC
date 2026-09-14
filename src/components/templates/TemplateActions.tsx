"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TemplateActions({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function duplicate() {
    setBusy(true);
    const res = await fetch(`/api/v1/templates/${templateId}/duplicate`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const copy = await res.json();
      router.push(`/templates/${copy.id}`);
      router.refresh();
    }
  }

  async function archive() {
    setBusy(true);
    const res = await fetch(`/api/v1/templates/${templateId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      router.push("/templates");
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={duplicate}
        disabled={busy}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        Duplicate
      </button>
      <button
        type="button"
        onClick={archive}
        disabled={busy}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
      >
        Archive
      </button>
    </div>
  );
}
