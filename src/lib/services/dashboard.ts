import { listInvoices } from "@/lib/services/invoices";
import { Money, sumMoney, toMoneyString } from "@/lib/calc/money";

export type DashboardSummary = {
  totalInvoices: number;
  totalInvoicedAmount: string;
  paidAmount: string;
  unpaidAmount: string;
  partiallyPaidAmount: string;
  overdueAmount: string;
};

// Scoped to ISSUED invoices only — DRAFTs aren't real invoices yet and
// CANCELLED ones are void, so neither should count toward operational
// totals. Each amount bucket is the outstanding/collected value for exactly
// the invoices the matching paymentStatus filter on the Recent Invoices
// table below would show, so the cards and the filtered table never
// disagree. Goes through listInvoices (not a raw query) so the OVERDUE
// column sync (syncOverdueInvoices) always runs first.
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const invoices = await listInvoices({ status: "ISSUED" });

  const byStatus = (status: string) => invoices.filter((i) => i.paymentStatus === status);

  return {
    totalInvoices: invoices.length,
    totalInvoicedAmount: toMoneyString(sumMoney(invoices.map((i) => new Money(i.grandTotal.toString())))),
    paidAmount: toMoneyString(sumMoney(byStatus("PAID").map((i) => new Money(i.grandTotal.toString())))),
    unpaidAmount: toMoneyString(sumMoney(byStatus("UNPAID").map((i) => new Money(i.balanceDue.toString())))),
    partiallyPaidAmount: toMoneyString(
      sumMoney(byStatus("PARTIALLY_PAID").map((i) => new Money(i.balanceDue.toString()))),
    ),
    overdueAmount: toMoneyString(sumMoney(byStatus("OVERDUE").map((i) => new Money(i.balanceDue.toString())))),
  };
}
