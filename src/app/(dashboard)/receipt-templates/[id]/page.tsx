import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getReceiptTemplate, getLatestReceiptVersion } from "@/lib/services/receiptTemplates";
import { ReceiptTemplateForm } from "@/components/receiptTemplates/ReceiptTemplateForm";
import { ReceiptTemplateActions } from "@/components/receiptTemplates/ReceiptTemplateActions";

export default async function EditReceiptTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const template = await getReceiptTemplate(id, session!.user.organizationId);
  if (!template) notFound();
  const latestVersion = await getLatestReceiptVersion(id, session!.user.organizationId);

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Edit Receipt Template</h1>
        <div className="flex items-center gap-3">
          <Link
            href={`/receipt-templates/${template.id}/builder`}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Open Builder
          </Link>
          <ReceiptTemplateActions templateId={template.id} />
        </div>
      </div>
      <div className="mt-6">
        <ReceiptTemplateForm
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
          href={`/receipt-templates/${template.id}/versions`}
          className="mt-1 inline-block text-sm text-zinc-900 hover:underline dark:text-zinc-50"
        >
          View version history →
        </Link>
      </div>
    </div>
  );
}
