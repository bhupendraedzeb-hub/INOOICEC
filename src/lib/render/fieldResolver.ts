import type { FieldRef, RichContent, TemplateDocument, TextProps, ImageProps, QrCodeProps } from "@/types/template";
import { getFieldDefinition } from "@/lib/render/fieldRegistry";

// Real invoice/business/customer/payment data doesn't exist until Phase 9 —
// this shape is defined now so the resolver, and everything that calls it
// (builder preview now, invoice preview + PDF later), can be written once
// against a stable contract. Money fields are strings, matching plan.md's
// "never use JS numbers for money across a boundary" rule; formatting them
// properly (currency symbol, locale, rounding) is centralized in
// lib/calc/money.ts once Phase 8 exists — this resolver only does the
// light, presentation-level formatting described below.
export type RenderContext = {
  business: Partial<Record<"logo" | "name" | "address" | "gstin" | "phone" | "email" | "website", string>>;
  customer: Partial<
    Record<"name" | "company" | "gstin" | "address" | "shipping_address" | "phone" | "email", string>
  >;
  invoice: Partial<Record<"number" | "date" | "due_date" | "po_number" | "reference" | "status", string>>;
  totals: Partial<
    Record<
      | "subtotal"
      | "discount"
      | "taxable_amount"
      | "cgst"
      | "sgst"
      | "igst"
      | "tax_total"
      | "round_off"
      | "grand_total"
      | "paid"
      | "balance",
      string
    >
  >;
  payment: Partial<Record<"bank_name" | "account_number" | "ifsc" | "upi", string>>;
  // Real invoice line items (Phase 9). Not part of the field-path registry —
  // ItemsTableView (components.tsx) reads this directly to render actual
  // rows instead of the design-mode dummy preview, keyed the same as
  // ItemsTableColumnKey so column config maps straight across.
  items?: Array<{
    index: string;
    item: string;
    description: string;
    hsn: string;
    qty: string;
    unit: string;
    rate: string;
    discount: string;
    gstPercent: string;
    taxAmount: string;
    amount: string;
  }>;
};

function rawValueAt(context: RenderContext, path: string): string | undefined {
  const [category, key] = path.split(".", 2) as [keyof RenderContext, string];
  const bucket = context[category] as Record<string, string | undefined> | undefined;
  return bucket?.[key];
}

function formatByType(raw: string, type: "text" | "date" | "currency" | "image"): string {
  switch (type) {
    case "currency": {
      const n = Number(raw);
      return Number.isFinite(n) ? n.toFixed(2) : raw;
    }
    case "date": {
      const d = new Date(raw);
      // Explicit locale, not the ambient default — this can run inside a
      // client-hydrated tree (the live invoice preview), where the server's
      // and browser's default locale/ICU data can differ and produce a real
      // hydration mismatch (the same class of bug Phase 5 hit with dnd-kit).
      return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString("en-IN");
    }
    default:
      return raw;
  }
}

// Resolves one FieldRef to display text. Returns undefined when there's no
// context to resolve against (design mode) or the path is unknown — callers
// decide what a "no value" case looks like (placeholder chip vs. fallback).
export function resolveFieldRef(ref: FieldRef, context: RenderContext | undefined): string | undefined {
  const definition = getFieldDefinition(ref.path);
  if (!context || !definition) return undefined;
  const raw = rawValueAt(context, ref.path);
  if (raw === undefined || raw === "") return ref.fallback;
  return formatByType(raw, definition.type);
}

export function resolveRichContent(content: RichContent, context: RenderContext | undefined): string {
  return content
    .map((run) => (typeof run === "string" ? run : (resolveFieldRef(run, context) ?? run.fallback ?? "")))
    .join("");
}

// Flags FieldRef paths in a template document that aren't in the registry —
// used by the builder to warn about stale/invalid paths (e.g. from a layout
// authored before a field was renamed or removed from the registry, or
// crafted directly via the API rather than the picker).
export function findUnknownFieldPaths(content: RichContent): string[] {
  return content
    .filter((run): run is FieldRef => typeof run !== "string")
    .map((ref) => ref.path)
    .filter((path) => !getFieldDefinition(path));
}

export function findUnknownFieldPathsInDocument(document: TemplateDocument): string[] {
  const unknown = new Set<string>();
  for (const c of document.components) {
    if (c.type === "text") {
      findUnknownFieldPaths((c.props as TextProps).content).forEach((p) => unknown.add(p));
    } else if (c.type === "image") {
      const src = (c.props as ImageProps).src;
      if (typeof src === "object" && !getFieldDefinition(src.path)) unknown.add(src.path);
    } else if (c.type === "qrcode") {
      const source = (c.props as QrCodeProps).source;
      if (typeof source === "object" && !getFieldDefinition(source.field.path)) unknown.add(source.field.path);
    }
  }
  return [...unknown];
}
