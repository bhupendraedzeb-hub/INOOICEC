import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getTemplate, listVersions } from "@/lib/services/templates";

export default async function TemplateVersionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const template = await getTemplate(id, session!.user.organizationId);
  if (!template) notFound();
  const versions = await listVersions(id, session!.user.organizationId);

  return (
    <div className="max-w-2xl">
      <Link href={`/templates/${id}`} className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
        ← Back to {template.name}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Version History</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Versions are immutable once created — editing the template later never changes an
        already-issued invoice that references an older version.
      </p>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="py-2 font-medium">Version</th>
            <th className="py-2 font-medium">Created</th>
            <th className="py-2 font-medium">Components</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => {
            const layout = v.layout as { components?: unknown[] } | null;
            return (
              <tr key={v.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2 font-medium text-zinc-900 dark:text-zinc-50">v{v.versionNumber}</td>
                <td className="py-2 text-zinc-600 dark:text-zinc-400">
                  {new Date(v.createdAt).toLocaleString("en-IN")}
                </td>
                <td className="py-2 text-zinc-600 dark:text-zinc-400">
                  {Array.isArray(layout?.components) ? layout.components.length : 0}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
