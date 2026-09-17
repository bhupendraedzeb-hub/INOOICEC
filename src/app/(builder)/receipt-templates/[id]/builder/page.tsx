import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getReceiptTemplate, getLatestReceiptVersion } from "@/lib/services/receiptTemplates";
import { DEFAULT_TEMPLATE_DOCUMENT, type TemplateDocument } from "@/types/template";
import { TemplateBuilderClientOnly } from "@/components/builder/TemplateBuilderClientOnly";

export default async function ReceiptTemplateBuilderPage({
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
    <TemplateBuilderClientOnly
      templateId={id}
      documentKind="receipt"
      initialLayout={(latestVersion?.layout as unknown as TemplateDocument) ?? DEFAULT_TEMPLATE_DOCUMENT}
      initialVersionNumber={latestVersion?.versionNumber ?? 0}
    />
  );
}
