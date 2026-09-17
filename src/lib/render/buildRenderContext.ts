import type { RenderContext } from "@/lib/render/fieldResolver";

// Pure, framework-agnostic assembly of a RenderContext from
// company/customer/invoice data — used both server-side (the /preview API
// route) and client-side (the live preview pane while editing an invoice,
// recomputed on every keystroke with no network round-trip). All money/date
// fields are pre-stringified by the caller; this function does no DB access
// and no Decimal-specific handling so it stays usable from a "use client"
// component.

type CompanyForContext = {
  logoUrl: string | null;
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  bankName: string | null;
  bankAccountHolder: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  upiId: string | null;
};

type CustomerForContext = {
  name: string;
  companyName: string | null;
  gstin: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
  phone: string | null;
  email: string | null;
};

type InvoiceForContext = {
  invoiceNumber: string | null;
  issueDateIso: string | null;
  dueDateIso: string | null;
  status: string;
  subtotal: string;
  discountTotal: string;
  taxableAmount: string;
  cgstTotal: string;
  sgstTotal: string;
  igstTotal: string;
  taxTotal: string;
  roundOff: string;
  grandTotal: string;
  paidTotal: string;
  balanceDue: string;
  notes: string | null;
  terms: string | null;
};

export type ItemForContext = {
  description: string;
  hsnSac: string | null;
  quantity: string;
  unit: string | null;
  rate: string;
  discount: string;
  gstRate: string;
  taxAmount: string;
  lineTotal: string;
};

// Shared by buildRenderContext (invoice) and buildReceiptRenderContext
// (Phase 21) — the business/customer/payment buckets are identical company
// and customer data regardless of which document is being rendered.
function buildBusinessBucket(company: CompanyForContext): RenderContext["business"] {
  const address = [company.addressLine1, company.addressLine2, company.city, company.state, company.postalCode, company.country]
    .filter(Boolean)
    .join(", ");
  return {
    logo: company.logoUrl ?? undefined,
    name: company.name,
    address: address || undefined,
    gstin: company.gstin ?? undefined,
    phone: company.phone ?? undefined,
    email: company.email ?? undefined,
    website: company.website ?? undefined,
  };
}

function buildCustomerBucket(customer: CustomerForContext): RenderContext["customer"] {
  return {
    name: customer.name,
    company: customer.companyName ?? undefined,
    gstin: customer.gstin ?? undefined,
    address: customer.billingAddress ?? undefined,
    shipping_address: customer.shippingAddress ?? undefined,
    phone: customer.phone ?? undefined,
    email: customer.email ?? undefined,
  };
}

function buildPaymentBucket(company: CompanyForContext): RenderContext["payment"] {
  return {
    bank_name: company.bankName ?? undefined,
    account_number: company.bankAccountNumber ?? undefined,
    ifsc: company.bankIfsc ?? undefined,
    upi: company.upiId ?? undefined,
  };
}

export function buildRenderContext(opts: {
  company: CompanyForContext;
  customer: CustomerForContext;
  invoice: InvoiceForContext;
  items?: ItemForContext[];
}): RenderContext {
  const { company, customer, invoice, items } = opts;

  return {
    business: buildBusinessBucket(company),
    customer: buildCustomerBucket(customer),
    invoice: {
      number: invoice.invoiceNumber ?? undefined,
      date: invoice.issueDateIso ?? undefined,
      due_date: invoice.dueDateIso ?? undefined,
      status: invoice.status,
    },
    totals: {
      subtotal: invoice.subtotal,
      discount: invoice.discountTotal,
      taxable_amount: invoice.taxableAmount,
      cgst: invoice.cgstTotal,
      sgst: invoice.sgstTotal,
      igst: invoice.igstTotal,
      tax_total: invoice.taxTotal,
      round_off: invoice.roundOff,
      grand_total: invoice.grandTotal,
      paid: invoice.paidTotal,
      balance: invoice.balanceDue,
    },
    payment: buildPaymentBucket(company),
    notes: invoice.notes ?? undefined,
    terms: invoice.terms ?? undefined,
    items: items?.map((item, i) => ({
      index: String(i + 1),
      item: item.description,
      description: item.description,
      hsn: item.hsnSac ?? "",
      qty: item.quantity,
      unit: item.unit ?? "",
      rate: item.rate,
      discount: item.discount,
      gstPercent: `${item.gstRate}%`,
      taxAmount: item.taxAmount,
      amount: item.lineTotal,
    })),
  };
}

// Phase 21 — Payment Receipts. Business/customer/payment buckets are
// identical to the invoice path (reused via the helpers above); invoice and
// totals buckets are left empty (receipt templates never bind to
// invoice.*/totals.* paths — see fieldRegistry.ts's per-kind category
// filtering in the builder), and a new `receipt` bucket carries the
// receipt-specific fields instead.
export type ReceiptForContext = {
  receiptNumber: string;
  issueDateIso: string;
  amountPaid: string;
  paymentMethod: string;
  transactionRef: string | null;
  linkedInvoiceNumber: string | null;
  balanceRemaining: string | null;
};

export function buildReceiptRenderContext(opts: {
  company: CompanyForContext;
  customer: CustomerForContext;
  receipt: ReceiptForContext;
}): RenderContext {
  const { company, customer, receipt } = opts;

  return {
    business: buildBusinessBucket(company),
    customer: buildCustomerBucket(customer),
    invoice: {},
    totals: {},
    payment: buildPaymentBucket(company),
    receipt: {
      number: receipt.receiptNumber,
      date: receipt.issueDateIso,
      amount_paid: receipt.amountPaid,
      payment_method: receipt.paymentMethod,
      transaction_ref: receipt.transactionRef ?? undefined,
      linked_invoice_number: receipt.linkedInvoiceNumber ?? undefined,
      balance_remaining: receipt.balanceRemaining ?? undefined,
    },
  };
}
