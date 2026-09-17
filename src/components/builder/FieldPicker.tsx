"use client";

import { FIELD_CATEGORIES, fieldsByCategory, type FieldDefinition, type FieldValueType } from "@/lib/render/fieldRegistry";

const CATEGORY_LABELS: Record<string, string> = {
  business: "Business",
  customer: "Customer",
  invoice: "Invoice",
  totals: "Totals",
  payment: "Payment",
  receipt: "Receipt",
};

export function FieldPicker({
  allowedTypes,
  categories,
  onSelect,
}: {
  allowedTypes?: FieldValueType[];
  // Restricts which field categories show (e.g. a receipt template builder
  // passes CATEGORIES_BY_DOCUMENT_KIND.receipt so it never offers
  // invoice-only totals.*/invoice.* fields) — defaults to every category
  // when omitted.
  categories?: FieldDefinition["category"][];
  onSelect: (path: string) => void;
}) {
  const allowedCategories = categories ?? FIELD_CATEGORIES;
  return (
    <select
      value=""
      onChange={(e) => {
        if (e.target.value) onSelect(e.target.value);
        e.target.value = "";
      }}
      className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
    >
      <option value="">+ Insert field…</option>
      {FIELD_CATEGORIES.filter((category) => allowedCategories.includes(category)).map((category) => {
        const fields = fieldsByCategory(category).filter((f) => !allowedTypes || allowedTypes.includes(f.type));
        if (fields.length === 0) return null;
        return (
          <optgroup key={category} label={CATEGORY_LABELS[category]}>
            {fields.map((f) => (
              <option key={f.path} value={f.path}>
                {f.label}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
