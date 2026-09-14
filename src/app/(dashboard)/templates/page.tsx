import Link from "next/link";
import { listTemplates } from "@/lib/services/templates";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const templates = await listTemplates({ q, status });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Templates</h1>
        <Link
          href="/templates/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New Template
        </Link>
      </div>

      <form className="mt-4 flex items-center gap-3" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search templates…"
          className="w-80 rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
          Search
        </button>
      </form>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <Link
            key={t.id}
            href={`/templates/${t.id}`}
            className="rounded-lg border border-zinc-200 p-4 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-zinc-900 dark:text-zinc-50">{t.name}</h2>
              {t.isDefault && (
                <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-white dark:bg-zinc-50 dark:text-zinc-900">
                  Default
                </span>
              )}
            </div>
            {t.description && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.description}</p>
            )}
            <p className="mt-2 text-xs text-zinc-400">{t.status}</p>
          </Link>
        ))}
        {templates.length === 0 && (
          <p className="col-span-full py-6 text-center text-zinc-400">No templates found.</p>
        )}
      </div>
    </div>
  );
}
