// The complete, static list of dynamic-field paths a template is allowed to
// bind to (AGENTS.md section 5). This is the single source of truth for:
// - the builder's "Insert Field" picker (never lets a user type a raw path)
// - fieldResolver.ts's formatting-by-type and unknown-path validation
//
// Real values for these paths don't exist until Phase 9 (invoices) — until
// then, fieldResolver renders these as labeled placeholders.

export type FieldValueType = "text" | "date" | "currency" | "image";

export type FieldDefinition = {
  path: string;
  label: string;
  category: "business" | "customer" | "invoice" | "totals" | "payment";
  type: FieldValueType;
};

export const FIELD_REGISTRY: FieldDefinition[] = [
  // Business
  { path: "business.logo", label: "Business Logo", category: "business", type: "image" },
  { path: "business.name", label: "Business Name", category: "business", type: "text" },
  { path: "business.address", label: "Business Address", category: "business", type: "text" },
  { path: "business.gstin", label: "Business GSTIN", category: "business", type: "text" },
  { path: "business.phone", label: "Business Phone", category: "business", type: "text" },
  { path: "business.email", label: "Business Email", category: "business", type: "text" },
  { path: "business.website", label: "Business Website", category: "business", type: "text" },

  // Customer
  { path: "customer.name", label: "Customer Name", category: "customer", type: "text" },
  { path: "customer.company", label: "Customer Company", category: "customer", type: "text" },
  { path: "customer.gstin", label: "Customer GSTIN", category: "customer", type: "text" },
  { path: "customer.address", label: "Customer Address", category: "customer", type: "text" },
  { path: "customer.shipping_address", label: "Shipping Address", category: "customer", type: "text" },
  { path: "customer.phone", label: "Customer Phone", category: "customer", type: "text" },
  { path: "customer.email", label: "Customer Email", category: "customer", type: "text" },

  // Invoice
  { path: "invoice.number", label: "Invoice Number", category: "invoice", type: "text" },
  { path: "invoice.date", label: "Invoice Date", category: "invoice", type: "date" },
  { path: "invoice.due_date", label: "Due Date", category: "invoice", type: "date" },
  { path: "invoice.po_number", label: "PO Number", category: "invoice", type: "text" },
  { path: "invoice.reference", label: "Reference", category: "invoice", type: "text" },
  { path: "invoice.status", label: "Invoice Status", category: "invoice", type: "text" },

  // Totals
  { path: "totals.subtotal", label: "Subtotal", category: "totals", type: "currency" },
  { path: "totals.discount", label: "Discount", category: "totals", type: "currency" },
  { path: "totals.taxable_amount", label: "Taxable Amount", category: "totals", type: "currency" },
  { path: "totals.cgst", label: "CGST", category: "totals", type: "currency" },
  { path: "totals.sgst", label: "SGST", category: "totals", type: "currency" },
  { path: "totals.igst", label: "IGST", category: "totals", type: "currency" },
  { path: "totals.tax_total", label: "Tax Total", category: "totals", type: "currency" },
  { path: "totals.round_off", label: "Round Off", category: "totals", type: "currency" },
  { path: "totals.grand_total", label: "Grand Total", category: "totals", type: "currency" },
  { path: "totals.paid", label: "Paid", category: "totals", type: "currency" },
  { path: "totals.balance", label: "Balance", category: "totals", type: "currency" },

  // Payment
  { path: "payment.bank_name", label: "Bank Name", category: "payment", type: "text" },
  { path: "payment.account_number", label: "Account Number", category: "payment", type: "text" },
  { path: "payment.ifsc", label: "IFSC", category: "payment", type: "text" },
  { path: "payment.upi", label: "UPI ID", category: "payment", type: "text" },
];

const FIELD_BY_PATH = new Map(FIELD_REGISTRY.map((f) => [f.path, f]));

export function getFieldDefinition(path: string): FieldDefinition | undefined {
  return FIELD_BY_PATH.get(path);
}

export function isKnownFieldPath(path: string): boolean {
  return FIELD_BY_PATH.has(path);
}

export const FIELD_CATEGORIES: FieldDefinition["category"][] = [
  "business",
  "customer",
  "invoice",
  "totals",
  "payment",
];

export function fieldsByCategory(category: FieldDefinition["category"]) {
  return FIELD_REGISTRY.filter((f) => f.category === category);
}
