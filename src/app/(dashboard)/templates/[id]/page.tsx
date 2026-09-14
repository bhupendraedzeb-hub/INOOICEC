import Link from "next/link";
import { notFound } from "next/navigation";
import { getTemplate, getLatestVersion } from "@/lib/services/templates";
import { TemplateForm } from "@/components/templates/TemplateForm";
import { TemplateActions } from "@/components/templates/TemplateActions";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();
  const latestVersion = await getLatestVersion(id);

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Edit Template</h1>
        <TemplateActions templateId={template.id} />
      </div>
      <div className="mt-6">
        <TemplateForm
          templateId={template.id}
          initialData={{
            name: template.name,
            description: template.description ?? "",
            thumbnailUrl: template.thumbnailUrl ?? "",
            status: template.status,
            isDefault: template.isDefault,
          }}
        />
      </div>
      <div className="mt-8 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Current version: <span className="font-medium">v{latestVersion?.versionNumber ?? "—"}</span>
        </p>
        <Link
          href={`/templates/${template.id}/versions`}
          className="mt-1 inline-block text-sm text-zinc-900 hover:underline dark:text-zinc-50"
        >
          View version history →
        </Link>
      </div>
    </div>
  );
}
