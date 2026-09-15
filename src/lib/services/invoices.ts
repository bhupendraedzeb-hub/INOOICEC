import { db } from "@/lib/db";
import { calculateInvoiceTotals } from "@/lib/calc/gstEngine";
import { toMoneyString } from "@/lib/calc/money";
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

export async function listInvoices(opts: {
  q?: string;
  status?: InvoiceStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
}) {
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

    return tx.invoice.update({
      where: { id },
      data: {
        status: "ISSUED",
        invoiceNumber,
        issueDate,
        templateVersionId: latestVersion?.id ?? null,
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
