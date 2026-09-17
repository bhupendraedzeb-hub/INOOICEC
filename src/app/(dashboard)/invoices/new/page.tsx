import { auth } from "@/lib/auth/auth";
import { listTemplates } from "@/lib/services/templates";
import { listCustomers } from "@/lib/services/customers";
import { listProducts } from "@/lib/services/products";
import { getCompanySettings } from "@/lib/services/companySettings";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";

export default async function NewInvoicePage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;
  const [templates, customers, products, company] = await Promise.all([
    listTemplates(organizationId, {}),
    listCustomers(organizationId, {}),
    listProducts(organizationId, {}),
    getCompanySettings(organizationId),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">New Invoice</h1>
      <InvoiceForm
        templates={templates.filter((t) => t.status !== "ARCHIVED")}
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
    </div>
  );
}
