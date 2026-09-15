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

export function buildRenderContext(opts: {
  company: CompanyForContext;
  customer: CustomerForContext;
  invoice: InvoiceForContext;
  items?: ItemForContext[];
}): RenderContext {
  const { company, customer, invoice, items } = opts;
  const address = [company.addressLine1, company.addressLine2, company.city, company.state, company.postalCode, company.country]
    .filter(Boolean)
    .join(", ");

  return {
    business: {
      logo: company.logoUrl ?? undefined,
      name: company.name,
      address: address || undefined,
      gstin: company.gstin ?? undefined,
      phone: company.phone ?? undefined,
      email: company.email ?? undefined,
      website: company.website ?? undefined,
    },
    customer: {
      name: customer.name,
      company: customer.companyName ?? undefined,
      gstin: customer.gstin ?? undefined,
      address: customer.billingAddress ?? undefined,
      shipping_address: customer.shippingAddress ?? undefined,
      phone: customer.phone ?? undefined,
      email: customer.email ?? undefined,
    },
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
    payment: {
      bank_name: company.bankName ?? undefined,
      account_number: company.bankAccountNumber ?? undefined,
      ifsc: company.bankIfsc ?? undefined,
      upi: company.upiId ?? undefined,
    },
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
