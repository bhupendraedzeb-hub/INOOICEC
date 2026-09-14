import { auth } from "@/lib/auth/auth";
import { getCompanySettings } from "@/lib/services/companySettings";
import { CompanySettingsForm } from "@/components/settings/CompanySettingsForm";

export default async function CompanySettingsPage() {
  const session = await auth();
  const settings = await getCompanySettings();
  const canEdit = session?.user.role === "OWNER" || session?.user.role === "ADMIN";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Company Settings</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Used on invoice templates and GST calculations (state code determines CGST/SGST vs IGST).
      </p>
      <div className="mt-6">
        <CompanySettingsForm initialData={settings} canEdit={canEdit} />
      </div>
    </div>
  );
}
