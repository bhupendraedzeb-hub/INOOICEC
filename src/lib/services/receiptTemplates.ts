import { db } from "@/lib/db";
import { DEFAULT_TEMPLATE_DOCUMENT, type TemplateDocument } from "@/types/template";
import { parseEnumParam } from "@/lib/validation/enumParam";
import type { ReceiptTemplateMetadataInput } from "@/lib/validation/schemas/receiptTemplate";
import type { Prisma } from "@/generated/prisma/client";

// Mirrors src/lib/services/templates.ts exactly, against the separate
// ReceiptTemplate/ReceiptTemplateVersion models (see prisma/schema.prisma
// Phase 21 comment for why this is a sibling table pair rather than a
// `kind` discriminator on Template).
const TEMPLATE_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

export async function listReceiptTemplates(organizationId: string, opts: { q?: string; status?: string }) {
  const status = parseEnumParam(opts.status ?? null, TEMPLATE_STATUSES);
  return db.receiptTemplate.findMany({
    where: {
      organizationId,
      ...(status ? { status } : {}),
      ...(opts.q ? { name: { contains: opts.q, mode: "insensitive" as const } } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getReceiptTemplate(id: string, organizationId: string) {
  return db.receiptTemplate.findFirst({ where: { id, organizationId } });
}

export async function getLatestReceiptVersion(templateId: string, organizationId: string) {
  return db.receiptTemplateVersion.findFirst({
    where: { templateId, template: { organizationId } },
    orderBy: { versionNumber: "desc" },
  });
}

export async function listReceiptVersions(templateId: string, organizationId: string) {
  return db.receiptTemplateVersion.findMany({
    where: { templateId, template: { organizationId } },
    orderBy: { versionNumber: "desc" },
  });
}

export async function createReceiptTemplate(data: ReceiptTemplateMetadataInput, actorId: string, organizationId: string) {
  return db.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.receiptTemplate.updateMany({ where: { organizationId, isDefault: true }, data: { isDefault: false } });
    }
    const template = await tx.receiptTemplate.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description || null,
        thumbnailUrl: data.thumbnailUrl || null,
        status: data.status ?? "DRAFT",
        isDefault: data.isDefault ?? false,
        createdById: actorId,
      },
    });
    await tx.receiptTemplateVersion.create({
      data: {
        templateId: template.id,
        versionNumber: 1,
        layout: DEFAULT_TEMPLATE_DOCUMENT as unknown as Prisma.InputJsonValue,
        createdById: actorId,
      },
    });
    return template;
  });
}

export async function updateReceiptTemplateMetadata(
  id: string,
  organizationId: string,
  data: ReceiptTemplateMetadataInput,
  actorId: string,
) {
  return db.$transaction(async (tx) => {
    await tx.receiptTemplate.findFirstOrThrow({ where: { id, organizationId } });
    if (data.isDefault) {
      await tx.receiptTemplate.updateMany({
        where: { organizationId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }
    return tx.receiptTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null,
        thumbnailUrl: data.thumbnailUrl || null,
        status: data.status,
        isDefault: data.isDefault,
        updatedById: actorId,
      },
    });
  });
}

export async function archiveReceiptTemplate(id: string, organizationId: string) {
  await db.receiptTemplate.findFirstOrThrow({ where: { id, organizationId } });
  return db.receiptTemplate.update({ where: { id }, data: { status: "ARCHIVED", isDefault: false } });
}

export async function createReceiptTemplateVersion(
  templateId: string,
  organizationId: string,
  layout: TemplateDocument,
  actorId: string,
) {
  await db.receiptTemplate.findFirstOrThrow({ where: { id: templateId, organizationId } });
  const latest = await getLatestReceiptVersion(templateId, organizationId);
  const nextVersionNumber = (latest?.versionNumber ?? 0) + 1;
  return db.receiptTemplateVersion.create({
    data: {
      templateId,
      versionNumber: nextVersionNumber,
      layout: layout as unknown as Prisma.InputJsonValue,
      createdById: actorId,
    },
  });
}

export async function duplicateReceiptTemplate(id: string, organizationId: string, actorId: string) {
  const source = await getReceiptTemplate(id, organizationId);
  if (!source) return null;
  const latestVersion = await getLatestReceiptVersion(id, organizationId);

  return db.$transaction(async (tx) => {
    const copy = await tx.receiptTemplate.create({
      data: {
        organizationId,
        name: `${source.name} (Copy)`,
        description: source.description,
        thumbnailUrl: source.thumbnailUrl,
        status: "DRAFT",
        isDefault: false,
        createdById: actorId,
      },
    });
    await tx.receiptTemplateVersion.create({
      data: {
        templateId: copy.id,
        versionNumber: 1,
        layout: (latestVersion?.layout ?? (DEFAULT_TEMPLATE_DOCUMENT as unknown)) as Prisma.InputJsonValue,
        createdById: actorId,
      },
    });
    return copy;
  });
}
