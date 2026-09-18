import { db } from "@/lib/db";
import { calculateInvoiceTotals, derivePaymentStatus } from "@/lib/calc/gstEngine";
import { toMoneyString, Money } from "@/lib/calc/money";
import { reserveInvoiceNumber } from "@/lib/numbering/invoiceNumber";
import { getCompanySettings } from "@/lib/services/companySettings";
import { enqueueWebhookEvent } from "@/lib/webhooks/dispatch";
import type { InvoiceInput } from "@/lib/validation/schemas/invoice";
import type { InvoiceStatus, PaymentStatus, Prisma } from "@/generated/prisma/client";

// Structural, not the full Invoice type — every function below returns a
// differently-shaped Prisma result (customer-only include vs. full
// invoiceInclude), so this only asks for the fields the webhook payload
// actually needs.
type InvoiceForWebhook = {
  id: string;
  updatedAt: Date;
  invoiceNumber: string | null;
  customerId: string;
  status: string;
  grandTotal: { toString(): string };
};

function invoiceWebhookData(invoice: InvoiceForWebhook) {
  return {
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    status: invoice.status,
    grandTotal: invoice.grandTotal.toString(),
  };
}

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
// once issued, so nothing ever needs to flip back out of OVERDUE. Scoped by
// organizationId — otherwise this would flip OVERDUE across every
// organization's invoices in one call.
export async function syncOverdueInvoices(organizationId: string) {
  await db.invoice.updateMany({
    where: {
      organizationId,
      status: "ISSUED",
      paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] },
      dueDate: { lt: new Date() },
    },
    data: { paymentStatus: "OVERDUE" },
  });
}

export async function listInvoices(
  organizationId: string,
  opts: {
    q?: string;
    status?: InvoiceStatus;
    paymentStatus?: PaymentStatus;
    customerId?: string;
    limit?: number;
  },
) {
  await syncOverdueInvoices(organizationId);
  return db.invoice.findMany({
    where: {
      organizationId,
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

export async function getInvoice(id: string, organizationId: string) {
  return db.invoice.findFirst({ where: { id, organizationId }, include: invoiceInclude });
}

// Deliberately org-unscoped — used only by the internal, token-gated PDF
// render route (src/app/internal/render/[invoiceId]), which is reached by
// Playwright's own server-side navigation, never a browser, and has no
// session to scope by. Every real caller of that route has already
// validated org ownership of this invoiceId before navigating there (see
// GET /api/v1/invoices/:id/pdf's getInvoice check), so this trusts the id
// directly and returns the invoice's own organizationId for the caller to
// scope its own subsequent lookups (company settings, template version) by.
export async function getInvoiceForInternalRender(id: string) {
  return db.invoice.findUnique({ where: { id }, include: invoiceInclude });
}

// Shared by create and update — recomputes totals server-side via the GST
// engine (Phase 8). Client-sent totals, if any slipped through, are never
// used: only quantity/rate/discount/gstRate per line feed the calculation.
// customerId is client-supplied, so it's looked up scoped to the caller's
// org — otherwise a request could compute (and later attach) totals against
// another organization's customer.
async function computeInvoiceCalc(input: InvoiceInput, customerId: string, organizationId: string) {
  const [company, customer] = await Promise.all([
    getCompanySettings(organizationId),
    db.customer.findFirstOrThrow({ where: { id: customerId, organizationId } }),
  ]);

  const calc = calculateInvoiceTotals(
    input.items.map((item) => ({
      quantity: item.quantity,
      rate: item.rate,
      discount: item.discount ?? "0",
      gstRatePercent: item.gstRate,
    })),
    {
      companyStateCode: company.stateCode ?? "",
      customerStateCode: customer.stateCode ?? "",
      taxTypeOverride: input.taxType ?? "AUTO",
      pricesIncludeTax: input.pricesIncludeTax ?? false,
    },
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

export async function createInvoiceDraft(input: InvoiceInput, actorId: string, organizationId: string) {
  // templateId is client-supplied and otherwise has no existence check at
  // all — without this, an invoice could be pointed at another
  // organization's template, and PDF rendering would render that other
  // org's branding/layout onto this invoice.
  await db.template.findFirstOrThrow({ where: { id: input.templateId, organizationId } });
  const { calc, company } = await computeInvoiceCalc(input, input.customerId, organizationId);
  const dueDate = input.dueDate ? new Date(input.dueDate) : null;

  const invoice = await db.invoice.create({
    data: {
      organizationId,
      templateId: input.templateId,
      customerId: input.customerId,
      dueDate,
      notes: input.notes || null,
      terms: input.terms || null,
      currency: company.currency,
      createdById: actorId,
      taxType: input.taxType ?? "AUTO",
      pricesIncludeTax: input.pricesIncludeTax ?? false,
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
  await enqueueWebhookEvent("invoice.created", "Invoice", invoice.id, invoice.updatedAt.toISOString(), invoiceWebhookData(invoice));
  return invoice;
}

// Caller (the API route) is responsible for confirming the invoice is still
// DRAFT before calling this — editing an issued invoice is not this
// function's job to police, keeping the service layer a thin CRUD/calc
// layer consistent with customers.ts/products.ts/templates.ts.
export async function updateInvoiceDraft(id: string, organizationId: string, input: InvoiceInput) {
  await db.template.findFirstOrThrow({ where: { id: input.templateId, organizationId } });
  const { calc } = await computeInvoiceCalc(input, input.customerId, organizationId);
  const dueDate = input.dueDate ? new Date(input.dueDate) : null;

  const invoice = await db.$transaction(async (tx) => {
    await tx.invoice.findFirstOrThrow({ where: { id, organizationId } });
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    return tx.invoice.update({
      where: { id },
      data: {
        templateId: input.templateId,
        customerId: input.customerId,
        dueDate,
        notes: input.notes || null,
        terms: input.terms || null,
        taxType: input.taxType ?? "AUTO",
        pricesIncludeTax: input.pricesIncludeTax ?? false,
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
  await enqueueWebhookEvent("invoice.updated", "Invoice", invoice.id, invoice.updatedAt.toISOString(), invoiceWebhookData(invoice));
  return invoice;
}

// The only place an invoice number is reserved and a TemplateVersion is
// pinned — never on preview, never on create/update. Caller must have
// already confirmed status === DRAFT.
export async function issueInvoice(id: string, organizationId: string) {
  const invoice = await db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirstOrThrow({ where: { id, organizationId } });
    const [company, latestVersion] = await Promise.all([
      getCompanySettings(organizationId),
      tx.templateVersion.findFirst({
        where: { templateId: invoice.templateId, template: { organizationId } },
        orderBy: { versionNumber: "desc" },
      }),
    ]);

    const issueDate = new Date();
    const invoiceNumber = await reserveInvoiceNumber(tx, {
      organizationId,
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
  await enqueueWebhookEvent("invoice.issued", "Invoice", invoice.id, invoice.updatedAt.toISOString(), invoiceWebhookData(invoice));
  return invoice;
}

// Status flag only — never deletes rows (plan.md: financial records are
// never silently destroyed).
export async function cancelInvoice(id: string, organizationId: string, reason: string) {
  await db.invoice.findFirstOrThrow({ where: { id, organizationId } });
  const invoice = await db.invoice.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelledReason: reason },
    include: invoiceInclude,
  });
  await enqueueWebhookEvent("invoice.cancelled", "Invoice", invoice.id, invoice.updatedAt.toISOString(), invoiceWebhookData(invoice));
  return invoice;
}

export async function duplicateInvoice(id: string, organizationId: string, actorId: string) {
  const source = await getInvoice(id, organizationId);
  if (!source) return null;

  const invoice = await db.invoice.create({
    data: {
      organizationId,
      templateId: source.templateId,
      customerId: source.customerId,
      dueDate: source.dueDate,
      notes: source.notes,
      terms: source.terms,
      currency: source.currency,
      createdById: actorId,
      taxType: source.taxType,
      pricesIncludeTax: source.pricesIncludeTax,
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
  await enqueueWebhookEvent("invoice.created", "Invoice", invoice.id, invoice.updatedAt.toISOString(), invoiceWebhookData(invoice));
  return invoice;
}

// Only ever called by the route after confirming status === DRAFT — a real
// financial record (issued or cancelled) is never hard-deleted.
export async function deleteDraftInvoice(id: string, organizationId: string) {
  await db.invoice.findFirstOrThrow({ where: { id, organizationId } });
  return db.invoice.delete({ where: { id } });
}
