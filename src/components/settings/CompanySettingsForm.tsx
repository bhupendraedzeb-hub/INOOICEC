"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  companySettingsSchema,
  type CompanySettingsInput,
} from "@/lib/validation/schemas/companySettings";
import { GST_STATE_CODES } from "@/lib/constants/gstStateCodes";

type CompanySettingsData = CompanySettingsInput & { id: string };

const FIELD_GROUPS: Array<{
  title: string;
  fields: Array<{ name: keyof CompanySettingsInput; label: string; type?: string; options?: Array<{ value: string; label: string }> }>;
}> = [
  {
    title: "Identity",
    fields: [
      { name: "name", label: "Company name" },
      { name: "logoUrl", label: "Logo URL" },
      { name: "phone", label: "Phone" },
      { name: "email", label: "Email", type: "email" },
      { name: "website", label: "Website" },
    ],
  },
  {
    title: "Address",
    fields: [
      { name: "addressLine1", label: "Address line 1" },
      { name: "addressLine2", label: "Address line 2" },
      { name: "city", label: "City" },
      {
        name: "stateCode",
        label: "State",
        type: "select",
        options: GST_STATE_CODES.map((s) => ({ value: s.code, label: `${s.name} (${s.code})` })),
      },
      { name: "postalCode", label: "Postal code" },
      { name: "country", label: "Country" },
    ],
  },
  {
    title: "Tax identifiers",
    fields: [
      { name: "gstin", label: "GSTIN" },
      { name: "pan", label: "PAN" },
    ],
  },
  {
    title: "Bank details",
    fields: [
      { name: "bankName", label: "Bank name" },
      { name: "bankAccountHolder", label: "Account holder" },
      { name: "bankAccountNumber", label: "Account number" },
      { name: "bankIfsc", label: "IFSC" },
      { name: "bankBranch", label: "Branch" },
      { name: "upiId", label: "UPI ID" },
    ],
  },
  {
    title: "Invoice defaults",
    fields: [
      { name: "currency", label: "Currency" },
      { name: "invoicePrefix", label: "Invoice prefix" },
      { name: "invoiceNumberFormat", label: "Invoice number format" },
      { name: "defaultPaymentTerms", label: "Default payment terms" },
      { name: "defaultNotes", label: "Default notes" },
      { name: "defaultTerms", label: "Default terms & conditions" },
    ],
  },
];

export function CompanySettingsForm({
  initialData,
  canEdit,
}: {
  initialData: CompanySettingsData;
  canEdit: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanySettingsInput>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: initialData,
  });

  async function onSubmit(data: CompanySettingsInput) {
    setStatus("saving");
    // `state` (the human-readable name) is derived from the stateCode
    // dropdown rather than directly editable — it's what folds into the
    // printed business address, so keep it in sync automatically.
    const payload: CompanySettingsInput = {
      ...data,
      state: GST_STATE_CODES.find((s) => s.code === data.stateCode)?.name ?? null,
    };
    const res = await fetch("/api/v1/settings/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setStatus(res.ok ? "saved" : "error");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      {FIELD_GROUPS.map((group) => (
        <fieldset key={group.title} disabled={!canEdit} className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {group.title}
          </legend>
          {group.fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {field.label}
              </label>
              {field.type === "select" ? (
                <select
                  {...register(field.name)}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="">— Select state —</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type ?? "text"}
                  {...register(field.name)}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
                />
              )}
              {errors[field.name] && (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {errors[field.name]?.message as string}
                </span>
              )}
            </div>
          ))}
        </fieldset>
      ))}

      {canEdit ? (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isSubmitting ? "Saving…" : "Save changes"}
          </button>
          {status === "saved" && <span className="text-sm text-green-600">Saved.</span>}
          {status === "error" && <span className="text-sm text-red-600">Failed to save.</span>}
        </div>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Only Owner/Admin users can edit company settings.
        </p>
      )}
    </form>
  );
}
