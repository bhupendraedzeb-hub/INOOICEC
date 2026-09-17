import { NextResponse } from "next/server";
import { withAuthedJson } from "@/lib/api/handler";
import { companySettingsSchema } from "@/lib/validation/schemas/companySettings";
import { getCompanySettings, updateCompanySettings } from "@/lib/services/companySettings";
import { writeAuditEvent } from "@/lib/audit/auditLog";

export const GET = withAuthedJson(
  null,
  async ({ session }) => {
    const settings = await getCompanySettings(session.user.organizationId);
    return NextResponse.json(settings);
  },
  { scope: "settings:read" },
);

export const PUT = withAuthedJson(
  companySettingsSchema,
  async ({ session, body }) => {
    const settings = await updateCompanySettings(session.user.organizationId, body);
    await writeAuditEvent({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      action: "company_settings.updated",
      entityType: "CompanySettings",
      entityId: settings.id,
    });
    return NextResponse.json(settings);
  },
  { roles: ["OWNER", "ADMIN"], scope: "settings:write" },
);
