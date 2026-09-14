import { CustomerForm } from "@/components/customers/CustomerForm";

export default function NewCustomerPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">New Customer</h1>
      <div className="mt-6">
        <CustomerForm />
      </div>
    </div>
  );
}
