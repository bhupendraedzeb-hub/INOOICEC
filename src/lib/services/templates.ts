import { db } from "@/lib/db";
import { DEFAULT_TEMPLATE_DOCUMENT, type TemplateDocument } from "@/types/template";
import { parseEnumParam } from "@/lib/validation/enumParam";
import type { TemplateMetadataInput } from "@/lib/validation/schemas/template";
import type { Prisma } from "@/generated/prisma/client";

const TEMPLATE_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

export async function listTemplates(organizationId: string, opts: { q?: string; status?: string }) {
  const status = parseEnumParam(opts.status ?? null, TEMPLATE_STATUSES);
  return db.template.findMany({
    where: {
      organizationId,
      ...(status ? { status } : {}),
      ...(opts.q ? { name: { contains: opts.q, mode: "insensitive" as const } } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getTemplate(id: string, organizationId: string) {
  return db.template.findFirst({ where: { id, organizationId } });
}

// TemplateVersion has no organizationId column of its own — it inherits
// scope via its parent Template relation.
export async function getLatestVersion(templateId: string, organizationId: string) {
  return db.templateVersion.findFirst({
    where: { templateId, template: { organizationId } },
    orderBy: { versionNumber: "desc" },
  });
}

export async function listVersions(templateId: string, organizationId: string) {
  return db.templateVersion.findMany({
    where: { templateId, template: { organizationId } },
    orderBy: { versionNumber: "desc" },
  });
}

// Creates the Template row plus its first (version 1) TemplateVersion, seeded
// with an empty starter layout — the visual builder (Phase 5) is what
// actually populates components; Phase 4 only establishes the data model.
export async function createTemplate(data: TemplateMetadataInput, actorId: string, organizationId: string) {
  return db.$transaction(async (tx) => {
    if (data.isDefault) {
      // Scoped by organizationId — otherwise this would silently unset
      // another organization's default template.
      await tx.template.updateMany({ where: { organizationId, isDefault: true }, data: { isDefault: false } });
    }
    const template = await tx.template.create({
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
    await tx.templateVersion.create({
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

export async function updateTemplateMetadata(
  id: string,
  organizationId: string,
  data: TemplateMetadataInput,
  actorId: string,
) {
  return db.$transaction(async (tx) => {
    await tx.template.findFirstOrThrow({ where: { id, organizationId } });
    if (data.isDefault) {
      // Scoped by organizationId — otherwise this would silently unset
      // another organization's default template.
      await tx.template.updateMany({
        where: { organizationId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }
    return tx.template.update({
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

// Soft delete: Templates aren't hard-deleted (consistent with the platform's
// "financial records / design assets aren't silently destroyed" posture, and
// once Invoices exist in Phase 9 a Template may already be referenced).
export async function archiveTemplate(id: string, organizationId: string) {
  await db.template.findFirstOrThrow({ where: { id, organizationId } });
  return db.template.update({ where: { id }, data: { status: "ARCHIVED", isDefault: false } });
}

// Insert-only — deliberately no updateTemplateVersion. Immutability of
// existing versions is enforced simply by never writing to them again.
export async function createTemplateVersion(
  templateId: string,
  organizationId: string,
  layout: TemplateDocument,
  actorId: string,
) {
  await db.template.findFirstOrThrow({ where: { id: templateId, organizationId } });
  const latest = await getLatestVersion(templateId, organizationId);
  const nextVersionNumber = (latest?.versionNumber ?? 0) + 1;
  return db.templateVersion.create({
    data: {
      templateId,
      versionNumber: nextVersionNumber,
      layout: layout as unknown as Prisma.InputJsonValue,
      createdById: actorId,
    },
  });
}

export async function duplicateTemplate(id: string, organizationId: string, actorId: string) {
  const source = await getTemplate(id, organizationId);
  if (!source) return null;
  const latestVersion = await getLatestVersion(id, organizationId);

  return db.$transaction(async (tx) => {
    const copy = await tx.template.create({
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
    await tx.templateVersion.create({
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
