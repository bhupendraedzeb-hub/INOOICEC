import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getTemplate, getLatestVersion } from "@/lib/services/templates";
import { DEFAULT_TEMPLATE_DOCUMENT, type TemplateDocument } from "@/types/template";
import { TemplateBuilderClientOnly } from "@/components/builder/TemplateBuilderClientOnly";

export default async function TemplateBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const template = await getTemplate(id, session!.user.organizationId);
  if (!template) notFound();
  const latestVersion = await getLatestVersion(id, session!.user.organizationId);

  return (
    <TemplateBuilderClientOnly
      templateId={id}
      initialLayout={(latestVersion?.layout as unknown as TemplateDocument) ?? DEFAULT_TEMPLATE_DOCUMENT}
      initialVersionNumber={latestVersion?.versionNumber ?? 0}
    />
  );
}
