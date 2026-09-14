import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/services/customers";
import { CustomerForm } from "@/components/customers/CustomerForm";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Edit Customer</h1>
      <div className="mt-6">
        <CustomerForm customerId={customer.id} initialData={{ ...customer, email: customer.email ?? "" }} />
      </div>
    </div>
  );
}
