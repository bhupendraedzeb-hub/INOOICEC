"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerInput } from "@/lib/validation/schemas/customer";

const FIELDS: Array<{ name: keyof CustomerInput; label: string; type?: string }> = [
  { name: "name", label: "Name" },
  { name: "companyName", label: "Company" },
  { name: "gstin", label: "GSTIN" },
  { name: "pan", label: "PAN" },
  { name: "billingAddress", label: "Billing address" },
  { name: "shippingAddress", label: "Shipping address" },
  { name: "state", label: "State" },
  { name: "stateCode", label: "State code" },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email", type: "email" },
];

export function CustomerForm({
  customerId,
  initialData,
}: {
  customerId?: string;
  initialData?: Partial<CustomerInput>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", ...initialData },
  });

  async function onSubmit(data: CustomerInput) {
    setServerError(null);
    const url = customerId ? `/api/v1/customers/${customerId}` : "/api/v1/customers";
    const res = await fetch(url, {
      method: customerId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setServerError("Failed to save customer.");
      return;
    }
    router.push("/customers");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      {FIELDS.map((field) => (
        <div key={field.name} className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{field.label}</label>
          <input
            type={field.type ?? "text"}
            {...register(field.name)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          {errors[field.name] && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {errors[field.name]?.message as string}
            </span>
          )}
        </div>
      ))}
      {customerId && (
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" {...register("isArchived")} />
          Archived (hidden from selection when creating invoices)
        </label>
      )}
      {serverError && <p className="text-sm text-red-600 dark:text-red-400">{serverError}</p>}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isSubmitting ? "Saving…" : customerId ? "Save changes" : "Create customer"}
        </button>
      </div>
    </form>
  );
}
