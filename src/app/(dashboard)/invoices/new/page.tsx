import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { listTemplates } from "@/lib/services/templates";
import { listCustomers } from "@/lib/services/customers";
import { listProducts } from "@/lib/services/products";
import { getCompanySettings } from "@/lib/services/companySettings";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";

function MissingPrerequisite({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      {children}
    </div>
  );
}

export default async function NewInvoicePage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;
  const [templates, customers, products, company] = await Promise.all([
    listTemplates(organizationId, {}),
    listCustomers(organizationId, {}),
    listProducts(organizationId, {}),
    getCompanySettings(organizationId),
  ]);

  const activeTemplates = templates.filter((t) => t.status !== "ARCHIVED");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">New Invoice</h1>
      {activeTemplates.length === 0 || customers.length === 0 ? (
        <MissingPrerequisite>
          You need {activeTemplates.length === 0 && "an active invoice template"}
          {activeTemplates.length === 0 && customers.length === 0 && " and "}
          {customers.length === 0 && "at least one customer"} before you can create an invoice.{" "}
          {activeTemplates.length === 0 && (
            <>
              <Link href="/templates" className="font-medium underline">
                Manage templates
              </Link>
              {customers.length === 0 && " · "}
            </>
          )}
          {customers.length === 0 && (
            <Link href="/customers/new" className="font-medium underline">
              Add a customer
            </Link>
          )}
        </MissingPrerequisite>
      ) : (
        <InvoiceForm
          templates={activeTemplates}
          customers={customers}
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            hsnSac: p.hsnSac,
            defaultRate: p.defaultRate.toString(),
            gstRate: p.gstRate.toString(),
            unit: p.unit,
          }))}
          company={company}
        />
      )}
    </div>
  );
}
