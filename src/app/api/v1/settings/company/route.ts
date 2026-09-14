import { NextResponse } from "next/server";
import { withAuthedJson } from "@/lib/api/handler";
import { companySettingsSchema } from "@/lib/validation/schemas/companySettings";
import { getCompanySettings, updateCompanySettings } from "@/lib/services/companySettings";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson(null, async () => {
  const settings = await getCompanySettings();
  return NextResponse.json(settings);
});

export const PUT = withAuthedJson(
  companySettingsSchema,
  async ({ session, body }) => {
    const settings = await updateCompanySettings(body);
    await writeAuditEvent({
      actorId: session.user.id,
      action: "company_settings.updated",
      entityType: "CompanySettings",
      entityId: settings.id,
    });
    return NextResponse.json(settings);
  },
  { roles: ["OWNER", "ADMIN"] },
);
