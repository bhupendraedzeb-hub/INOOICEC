// Centralized, backend-only GST/tax calculation engine (plan.md Phase 8).
// No DB or Next.js imports — pure functions over plain data, fully
// unit-testable. This is the single source of truth for invoice totals;
// API routes must always recalculate through here and never trust
// client-sent totals (plan.md Critical Business Rule #1).

import { Money, roundMoney, sumMoney, type MoneyValue } from "@/lib/calc/money";

export type LineInput = {
  quantity: string | number;
  rate: string | number;
  discount?: string | number; // absolute amount, per line; default 0
  gstRatePercent: string | number; // combined rate, e.g. 18 for 9% CGST + 9% SGST
};

export type LineResult = {
  lineSubtotal: MoneyValue; // quantity * rate
  discount: MoneyValue;
  taxableAmount: MoneyValue; // lineSubtotal - discount
  taxAmount: MoneyValue; // taxableAmount * gstRatePercent / 100
  lineTotal: MoneyValue; // taxableAmount + taxAmount
};

export function calculateLine(input: LineInput): LineResult {
  const quantity = new Money(input.quantity);
  const rate = new Money(input.rate);
  const discount = new Money(input.discount ?? 0);
  const gstRatePercent = new Money(input.gstRatePercent);

  const lineSubtotal = quantity.times(rate);
  const taxableAmount = lineSubtotal.minus(discount);
  const taxAmount = taxableAmount.times(gstRatePercent).dividedBy(100);
  const lineTotal = taxableAmount.plus(taxAmount);

  return { lineSubtotal, discount, taxableAmount, taxAmount, lineTotal };
}

export type InvoiceTaxContext = {
  companyStateCode: string;
  customerStateCode: string;
};

export type InvoiceCalculationResult = {
  lines: LineResult[];
  isInterState: boolean;
  subtotal: MoneyValue;
  discountTotal: MoneyValue;
  taxableAmount: MoneyValue;
  cgstTotal: MoneyValue;
  sgstTotal: MoneyValue;
  igstTotal: MoneyValue;
  taxTotal: MoneyValue;
  roundOff: MoneyValue; // grandTotal - (taxableAmount + taxTotal), before rounding
  grandTotal: MoneyValue;
};

// Same-state: CGST/SGST — each half of the combined rate. Inter-state: IGST
// — the full combined rate. Splitting the already-summed tax total in half
// is mathematically identical to summing each line's own half-split, as
// long as nothing is rounded in between (division distributes over sum) —
// so this stays correct regardless of how many lines there are.
export function calculateInvoiceTotals(
  linesInput: LineInput[],
  ctx: InvoiceTaxContext,
): InvoiceCalculationResult {
  const lines = linesInput.map(calculateLine);
  const isInterState = ctx.companyStateCode !== ctx.customerStateCode;

  const subtotal = sumMoney(lines.map((l) => l.lineSubtotal));
  const discountTotal = sumMoney(lines.map((l) => l.discount));
  const taxableAmount = sumMoney(lines.map((l) => l.taxableAmount));
  const taxTotalRaw = sumMoney(lines.map((l) => l.taxAmount));

  const cgstTotal = isInterState ? new Money(0) : taxTotalRaw.dividedBy(2);
  const sgstTotal = isInterState ? new Money(0) : taxTotalRaw.dividedBy(2);
  const igstTotal = isInterState ? taxTotalRaw : new Money(0);

  const rawGrandTotal = taxableAmount.plus(cgstTotal).plus(sgstTotal).plus(igstTotal);
  const grandTotal = roundMoney(rawGrandTotal);
  const roundOff = grandTotal.minus(rawGrandTotal);

  return {
    lines,
    isInterState,
    subtotal: roundMoney(subtotal),
    discountTotal: roundMoney(discountTotal),
    taxableAmount: roundMoney(taxableAmount),
    cgstTotal: roundMoney(cgstTotal),
    sgstTotal: roundMoney(sgstTotal),
    igstTotal: roundMoney(igstTotal),
    taxTotal: roundMoney(taxTotalRaw),
    roundOff,
    grandTotal,
  };
}

export type PaymentStatusValue = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";

// Paid always wins over overdue — a fully paid invoice past its due date is
// PAID, not OVERDUE. Called transactionally on every Payment write (Phase
// 10); the OVERDUE transition is time-dependent (no payment event triggers
// it), so it's also recomputed on dashboard/list reads rather than relying
// solely on a cached column that a cron sweep would lag.
export function derivePaymentStatus(
  grandTotal: MoneyValue,
  paidTotal: MoneyValue,
  dueDate: Date | null,
  now: Date = new Date(),
): PaymentStatusValue {
  if (paidTotal.gte(grandTotal)) return "PAID";
  if (dueDate && now > dueDate) return "OVERDUE";
  return paidTotal.gt(0) ? "PARTIALLY_PAID" : "UNPAID";
}
