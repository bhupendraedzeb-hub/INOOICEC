import { db } from "@/lib/db";
import type { CompanySettingsInput } from "@/lib/validation/schemas/companySettings";

// CompanySettings is a conceptual singleton: exactly one row for this
// deployment. No unique constraint enforces that in the schema (it isn't
// worth a migration for a one-row table); this service is the single place
// that reads/writes it, so "singleton" behavior is enforced here instead.
export async function getCompanySettings() {
  const existing = await db.companySettings.findFirst();
  if (existing) return existing;
  return db.companySettings.create({ data: { name: "Your Company" } });
}

export async function updateCompanySettings(data: CompanySettingsInput) {
  const existing = await db.companySettings.findFirst();
  if (existing) {
    return db.companySettings.update({ where: { id: existing.id }, data });
  }
  return db.companySettings.create({ data });
}
