import { describe, it, expect } from "vitest";
import { calculateLine, calculateInvoiceTotals, derivePaymentStatus } from "./gstEngine";
import { Money, toMoneyString } from "./money";

const SAME_STATE: { companyStateCode: string; customerStateCode: string } = {
  companyStateCode: "06",
  customerStateCode: "06",
};
const INTER_STATE: { companyStateCode: string; customerStateCode: string } = {
  companyStateCode: "06",
  customerStateCode: "27",
};

describe("calculateLine", () => {
  it("computes subtotal, tax, and total for a simple line", () => {
    const result = calculateLine({ quantity: 2, rate: "500", gstRatePercent: 18 });
    expect(toMoneyString(result.lineSubtotal)).toBe("1000.00");
    expect(toMoneyString(result.taxableAmount)).toBe("1000.00");
    expect(toMoneyString(result.taxAmount)).toBe("180.00");
    expect(toMoneyString(result.lineTotal)).toBe("1180.00");
  });

  it("subtracts a per-line discount before taxing", () => {
    const result = calculateLine({ quantity: 1, rate: "1000", discount: "100", gstRatePercent: 18 });
    expect(toMoneyString(result.taxableAmount)).toBe("900.00");
    expect(toMoneyString(result.taxAmount)).toBe("162.00");
    expect(toMoneyString(result.lineTotal)).toBe("1062.00");
  });

  it("defaults discount to zero when omitted", () => {
    const result = calculateLine({ quantity: 1, rate: "100", gstRatePercent: 0 });
    expect(toMoneyString(result.discount)).toBe("0.00");
    expect(toMoneyString(result.taxAmount)).toBe("0.00");
  });
});

describe("calculateInvoiceTotals — spec worked examples", () => {
  it("same-state: 50,000 subtotal / 18% combined -> 4,500 CGST + 4,500 SGST -> 59,000 total", () => {
    const result = calculateInvoiceTotals(
      [{ quantity: 1, rate: "50000", gstRatePercent: 18 }],
      SAME_STATE,
    );
    expect(result.isInterState).toBe(false);
    expect(toMoneyString(result.subtotal)).toBe("50000.00");
    expect(toMoneyString(result.cgstTotal)).toBe("4500.00");
    expect(toMoneyString(result.sgstTotal)).toBe("4500.00");
    expect(toMoneyString(result.igstTotal)).toBe("0.00");
    expect(toMoneyString(result.taxTotal)).toBe("9000.00");
    expect(toMoneyString(result.grandTotal)).toBe("59000.00");
  });

  it("inter-state: 50,000 subtotal / 18% -> 9,000 IGST -> 59,000 total", () => {
    const result = calculateInvoiceTotals(
      [{ quantity: 1, rate: "50000", gstRatePercent: 18 }],
      INTER_STATE,
    );
    expect(result.isInterState).toBe(true);
    expect(toMoneyString(result.igstTotal)).toBe("9000.00");
    expect(toMoneyString(result.cgstTotal)).toBe("0.00");
    expect(toMoneyString(result.sgstTotal)).toBe("0.00");
    expect(toMoneyString(result.grandTotal)).toBe("59000.00");
  });
});

describe("calculateInvoiceTotals — multi-line, discounts, rounding", () => {
  it("sums multiple lines with different rates correctly", () => {
    const result = calculateInvoiceTotals(
      [
        { quantity: 2, rate: "1000", gstRatePercent: 18 },
        { quantity: 1, rate: "500", gstRatePercent: 12 },
      ],
      SAME_STATE,
    );
    // line1: 2000 taxable, 360 tax; line2: 500 taxable, 60 tax
    expect(toMoneyString(result.subtotal)).toBe("2500.00");
    expect(toMoneyString(result.taxableAmount)).toBe("2500.00");
    expect(toMoneyString(result.taxTotal)).toBe("420.00");
    expect(toMoneyString(result.cgstTotal)).toBe("210.00");
    expect(toMoneyString(result.sgstTotal)).toBe("210.00");
    expect(toMoneyString(result.grandTotal)).toBe("2920.00");
  });

  it("applies a per-line discount before computing tax", () => {
    const result = calculateInvoiceTotals(
      [{ quantity: 1, rate: "1000", discount: "200", gstRatePercent: 18 }],
      SAME_STATE,
    );
    expect(toMoneyString(result.discountTotal)).toBe("200.00");
    expect(toMoneyString(result.taxableAmount)).toBe("800.00");
    expect(toMoneyString(result.taxTotal)).toBe("144.00");
    expect(toMoneyString(result.grandTotal)).toBe("944.00");
  });

  it("rounds the grand total half-up and records the delta as roundOff", () => {
    // taxable 100, 18.5% tax -> 18.5 tax -> raw total 118.5 exactly, no rounding needed here;
    // use a rate that produces a sub-cent remainder instead.
    const result = calculateInvoiceTotals(
      [{ quantity: 1, rate: "33.335", gstRatePercent: 18 }],
      SAME_STATE,
    );
    // taxable = 33.335, tax = 33.335 * 0.18 = 6.0003, raw total = 39.3353 -> rounds to 39.34
    expect(toMoneyString(result.grandTotal)).toBe("39.34");
    const rawTotal = new Money("33.335").plus(new Money("6.0003"));
    expect(result.roundOff.toNumber()).toBeCloseTo(new Money("39.34").minus(rawTotal).toNumber(), 6);
  });

  it("produces an empty-invoice result (zero lines) without throwing", () => {
    const result = calculateInvoiceTotals([], SAME_STATE);
    expect(toMoneyString(result.grandTotal)).toBe("0.00");
  });
});

describe("derivePaymentStatus", () => {
  const total = new Money("1000");
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);

  it("is UNPAID when nothing has been paid", () => {
    expect(derivePaymentStatus(total, new Money(0), future)).toBe("UNPAID");
  });

  it("is PARTIALLY_PAID when 0 < paid < total", () => {
    expect(derivePaymentStatus(total, new Money("400"), future)).toBe("PARTIALLY_PAID");
  });

  it("is PAID when paid >= total", () => {
    expect(derivePaymentStatus(total, new Money("1000"), future)).toBe("PAID");
  });

  it("is PAID even when paid slightly exceeds total (overpayment)", () => {
    expect(derivePaymentStatus(total, new Money("1000.01"), future)).toBe("PAID");
  });

  it("is OVERDUE when unpaid and past the due date", () => {
    expect(derivePaymentStatus(total, new Money(0), past)).toBe("OVERDUE");
  });

  it("is OVERDUE when partially paid and past the due date", () => {
    expect(derivePaymentStatus(total, new Money("400"), past)).toBe("OVERDUE");
  });

  it("PAID overrides OVERDUE even past the due date", () => {
    expect(derivePaymentStatus(total, new Money("1000"), past)).toBe("PAID");
  });

  it("ignores a missing due date (never OVERDUE without one)", () => {
    expect(derivePaymentStatus(total, new Money(0), null)).toBe("UNPAID");
  });
});
