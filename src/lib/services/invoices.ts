import { db } from "@/lib/db";
import { calculateInvoiceTotals, derivePaymentStatus } from "@/lib/calc/gstEngine";
import { toMoneyString, Money } from "@/lib/calc/money";
import { reserveInvoiceNumber } from "@/lib/numbering/invoiceNumber";
import { getCompanySettings } from "@/lib/services/companySettings";
import type { InvoiceInput } from "@/lib/validation/schemas/invoice";
import type { InvoiceStatus, PaymentStatus, Prisma } from "@/generated/prisma/client";

const invoiceInclude = {
  items: { orderBy: { position: "asc" as const } },
  customer: true,
  template: true,
  templateVersion: true,
  createdBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.InvoiceInclude;

// The OVERDUE transition is time-dependent and has no write-time trigger of
// its own (derivePaymentStatus only runs on a Payment write or at /issue) —
// an invoice can cross its due date with no new event to recompute it. This
// bulk sync is the documented (Phase 9/10 notes) fix: run on every read that
// lists/aggregates invoices, so the stored column — used for both display
// and the Overdue filter — never lags. One-directional and idempotent: PAID
// invoices are untouched (PAID overrides OVERDUE), and dueDate is immutable
// once issued, so nothing ever needs to flip back out of OVERDUE.
export async function syncOverdueInvoices() {
  await db.invoice.updateMany({
    where: { status: "ISSUED", paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] }, dueDate: { lt: new Date() } },
    data: { paymentStatus: "OVERDUE" },
  });
}

export async function listInvoices(opts: {
  q?: string;
  status?: InvoiceStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  limit?: number;
}) {
  await syncOverdueInvoices();
  return db.invoice.findMany({
    where: {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.paymentStatus ? { paymentStatus: opts.paymentStatus } : {}),
      ...(opts.customerId ? { customerId: opts.customerId } : {}),
      ...(opts.q
        ? {
            OR: [
              { invoiceNumber: { contains: opts.q, mode: "insensitive" as const } },
              { customer: { name: { contains: opts.q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    ...(opts.limit ? { take: opts.limit } : {}),
  });
}

export async function getInvoice(id: string) {
  return db.invoice.findUnique({ where: { id }, include: invoiceInclude });
}

// Shared by create and update — recomputes totals server-side via the GST
// engine (Phase 8). Client-sent totals, if any slipped through, are never
// used: only quantity/rate/discount/gstRate per line feed the calculation.
async function computeInvoiceCalc(input: InvoiceInput, customerId: string) {
  const [company, customer] = await Promise.all([
    getCompanySettings(),
    db.customer.findUniqueOrThrow({ where: { id: customerId } }),
  ]);

  const calc = calculateInvoiceTotals(
    input.items.map((item) => ({
      quantity: item.quantity,
      rate: item.rate,
      discount: item.discount ?? "0",
      gstRatePercent: item.gstRate,
    })),
    { companyStateCode: company.stateCode ?? "", customerStateCode: customer.stateCode ?? "" },
  );

  return { calc, company, customer };
}

function itemCreateData(input: InvoiceInput, calc: ReturnType<typeof calculateInvoiceTotals>) {
  return input.items.map((item, i) => ({
    position: i,
    productId: item.productId || null,
    description: item.description,
    hsnSac: item.hsnSac || null,
    quantity: item.quantity,
    unit: item.unit || null,
    rate: item.rate,
    discount: item.discount ?? "0",
    gstRate: item.gstRate,
    taxAmount: toMoneyString(calc.lines[i].taxAmount),
    lineTotal: toMoneyString(calc.lines[i].lineTotal),
  }));
}

export async function createInvoiceDraft(input: InvoiceInput, actorId: string) {
  const { calc, company } = await computeInvoiceCalc(input, input.customerId);
  const dueDate = input.dueDate ? new Date(input.dueDate) : null;

  return db.invoice.create({
    data: {
      templateId: input.templateId,
      customerId: input.customerId,
      dueDate,
      notes: input.notes || null,
      terms: input.terms || null,
      currency: company.currency,
      createdById: actorId,
      subtotal: toMoneyString(calc.subtotal),
      discountTotal: toMoneyString(calc.discountTotal),
      taxableAmount: toMoneyString(calc.taxableAmount),
      cgstTotal: toMoneyString(calc.cgstTotal),
      sgstTotal: toMoneyString(calc.sgstTotal),
      igstTotal: toMoneyString(calc.igstTotal),
      taxTotal: toMoneyString(calc.taxTotal),
      roundOff: toMoneyString(calc.roundOff),
      grandTotal: toMoneyString(calc.grandTotal),
      balanceDue: toMoneyString(calc.grandTotal),
      items: { create: itemCreateData(input, calc) },
    },
    include: invoiceInclude,
  });
}

// Caller (the API route) is responsible for confirming the invoice is still
// DRAFT before calling this — editing an issued invoice is not this
// function's job to police, keeping the service layer a thin CRUD/calc
// layer consistent with customers.ts/products.ts/templates.ts.
export async function updateInvoiceDraft(id: string, input: InvoiceInput) {
  const { calc } = await computeInvoiceCalc(input, input.customerId);
  const dueDate = input.dueDate ? new Date(input.dueDate) : null;

  return db.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    return tx.invoice.update({
      where: { id },
      data: {
        templateId: input.templateId,
        customerId: input.customerId,
        dueDate,
        notes: input.notes || null,
        terms: input.terms || null,
        subtotal: toMoneyString(calc.subtotal),
        discountTotal: toMoneyString(calc.discountTotal),
        taxableAmount: toMoneyString(calc.taxableAmount),
        cgstTotal: toMoneyString(calc.cgstTotal),
        sgstTotal: toMoneyString(calc.sgstTotal),
        igstTotal: toMoneyString(calc.igstTotal),
        taxTotal: toMoneyString(calc.taxTotal),
        roundOff: toMoneyString(calc.roundOff),
        grandTotal: toMoneyString(calc.grandTotal),
        balanceDue: toMoneyString(calc.grandTotal),
        items: { create: itemCreateData(input, calc) },
      },
      include: invoiceInclude,
    });
  });
}

// The only place an invoice number is reserved and a TemplateVersion is
// pinned — never on preview, never on create/update. Caller must have
// already confirmed status === DRAFT.
export async function issueInvoice(id: string) {
  return db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id } });
    const [company, latestVersion] = await Promise.all([
      getCompanySettings(),
      tx.templateVersion.findFirst({
        where: { templateId: invoice.templateId },
        orderBy: { versionNumber: "desc" },
      }),
    ]);

    const issueDate = new Date();
    const invoiceNumber = await reserveInvoiceNumber(tx, {
      prefix: company.invoicePrefix,
      format: company.invoiceNumberFormat,
      issueDate,
    });

    // No payments can exist against a DRAFT invoice (Payments API only
    // accepts ISSUED ones), so paidTotal is always 0 here — derive whether
    // it's immediately OVERDUE (a backdated due date) rather than leaving it
    // at the UNPAID default until Phase 10's payment writes first touch it.
    const paymentStatus = derivePaymentStatus(
      new Money(invoice.grandTotal.toString()),
      new Money(0),
      invoice.dueDate,
      issueDate,
    );

    return tx.invoice.update({
      where: { id },
      data: {
        status: "ISSUED",
        invoiceNumber,
        issueDate,
        templateVersionId: latestVersion?.id ?? null,
        paymentStatus,
      },
      include: invoiceInclude,
    });
  });
}

// Status flag only — never deletes rows (plan.md: financial records are
// never silently destroyed).
export async function cancelInvoice(id: string, reason: string) {
  return db.invoice.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelledReason: reason },
    include: invoiceInclude,
  });
}

export async function duplicateInvoice(id: string, actorId: string) {
  const source = await getInvoice(id);
  if (!source) return null;

  return db.invoice.create({
    data: {
      templateId: source.templateId,
      customerId: source.customerId,
      dueDate: source.dueDate,
      notes: source.notes,
      terms: source.terms,
      currency: source.currency,
      createdById: actorId,
      subtotal: source.subtotal,
      discountTotal: source.discountTotal,
      taxableAmount: source.taxableAmount,
      cgstTotal: source.cgstTotal,
      sgstTotal: source.sgstTotal,
      igstTotal: source.igstTotal,
      taxTotal: source.taxTotal,
      roundOff: source.roundOff,
      grandTotal: source.grandTotal,
      balanceDue: source.grandTotal,
      items: {
        create: source.items.map((item) => ({
          position: item.position,
          productId: item.productId,
          description: item.description,
          hsnSac: item.hsnSac,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          discount: item.discount,
          gstRate: item.gstRate,
          taxAmount: item.taxAmount,
          lineTotal: item.lineTotal,
        })),
      },
    },
    include: invoiceInclude,
  });
}

// Only ever called by the route after confirming status === DRAFT — a real
// financial record (issued or cancelled) is never hard-deleted.
export async function deleteDraftInvoice(id: string) {
  return db.invoice.delete({ where: { id } });
}
