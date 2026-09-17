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
  category: "business" | "customer" | "invoice" | "totals" | "payment" | "receipt";
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

  // Receipt (Phase 21) — business/customer/payment categories above are
  // reused as-is for receipt templates too.
  { path: "receipt.number", label: "Receipt Number", category: "receipt", type: "text" },
  { path: "receipt.date", label: "Receipt Date", category: "receipt", type: "date" },
  { path: "receipt.amount_paid", label: "Amount Paid", category: "receipt", type: "currency" },
  { path: "receipt.payment_method", label: "Payment Method", category: "receipt", type: "text" },
  { path: "receipt.transaction_ref", label: "Transaction Reference", category: "receipt", type: "text" },
  { path: "receipt.linked_invoice_number", label: "Invoice Number", category: "receipt", type: "text" },
  { path: "receipt.balance_remaining", label: "Balance Remaining on Invoice", category: "receipt", type: "currency" },
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
  "receipt",
];

export function fieldsByCategory(category: FieldDefinition["category"]) {
  return FIELD_REGISTRY.filter((f) => f.category === category);
}

// Which field categories the builder's FieldPicker offers, per document
// kind (src/components/builder/PropertiesPanel.tsx) — a receipt template
// should never be offered invoice-only totals.*/invoice.* fields, and vice
// versa, even though both sets of categories live in the one shared
// FIELD_REGISTRY above.
export const CATEGORIES_BY_DOCUMENT_KIND: Record<"invoice" | "receipt", FieldDefinition["category"][]> = {
  invoice: ["business", "customer", "invoice", "totals", "payment"],
  receipt: ["business", "customer", "payment", "receipt"],
};
