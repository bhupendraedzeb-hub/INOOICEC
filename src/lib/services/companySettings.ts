import { db } from "@/lib/db";
import type { CompanySettingsInput } from "@/lib/validation/schemas/companySettings";

// One CompanySettings row per Organization — organizationId's @unique
// constraint (schema.prisma) enforces that at the DB level.
export async function getCompanySettings(organizationId: string) {
  const existing = await db.companySettings.findFirst({ where: { organizationId } });
  if (existing) return existing;
  return db.companySettings.create({ data: { organizationId, name: "Your Company" } });
}

export async function updateCompanySettings(organizationId: string, data: CompanySettingsInput) {
  const existing = await db.companySettings.findFirst({ where: { organizationId } });
  if (existing) {
    return db.companySettings.update({ where: { id: existing.id }, data });
  }
  return db.companySettings.create({ data: { ...data, organizationId } });
}
