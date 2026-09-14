import { notFound } from "next/navigation";
import { getTemplate, getLatestVersion } from "@/lib/services/templates";
import { DEFAULT_TEMPLATE_DOCUMENT, type TemplateDocument } from "@/types/template";
import { TemplateBuilderClientOnly } from "@/components/builder/TemplateBuilderClientOnly";

export default async function TemplateBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();
  const latestVersion = await getLatestVersion(id);

  return (
    <TemplateBuilderClientOnly
      templateId={id}
      initialLayout={(latestVersion?.layout as unknown as TemplateDocument) ?? DEFAULT_TEMPLATE_DOCUMENT}
      initialVersionNumber={latestVersion?.versionNumber ?? 0}
    />
  );
}
