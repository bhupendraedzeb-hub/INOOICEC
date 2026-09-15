import Link from "next/link";
import { getDashboardSummary } from "@/lib/services/dashboard";
import { listInvoices } from "@/lib/services/invoices";
import { Badge } from "@/components/invoices/StatusBadge";
import type { InvoiceStatus, PaymentStatus } from "@/generated/prisma/client";

const FILTERS: { key: string; label: string; query: { status?: InvoiceStatus; paymentStatus?: PaymentStatus } }[] = [
  { key: "all", label: "All", query: {} },
  { key: "paid", label: "Paid", query: { paymentStatus: "PAID" } },
  { key: "unpaid", label: "Unpaid", query: { paymentStatus: "UNPAID" } },
  { key: "partially_paid", label: "Partially Paid", query: { paymentStatus: "PARTIALLY_PAID" } },
  { key: "overdue", label: "Overdue", query: { paymentStatus: "OVERDUE" } },
  { key: "cancelled", label: "Cancelled", query: { status: "CANCELLED" } },
];

function Card({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-zinc-200 p-4 transition hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
    >
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
    </Link>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];

  // Both go through listInvoices, so the time-dependent OVERDUE sync
  // (syncOverdueInvoices) always runs before either the cards or the table
  // below are computed — the two can never disagree about what's overdue.
  const [summary, invoices] = await Promise.all([
    getDashboardSummary(),
    listInvoices({ ...active.query, limit: 20 }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Dashboard</h1>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card label="Total Invoices" value={String(summary.totalInvoices)} href="/dashboard?filter=all" />
        <Card label="Total Invoiced" value={summary.totalInvoicedAmount} href="/dashboard?filter=all" />
        <Card label="Paid" value={summary.paidAmount} href="/dashboard?filter=paid" />
        <Card label="Unpaid" value={summary.unpaidAmount} href="/dashboard?filter=unpaid" />
        <Card label="Partially Paid" value={summary.partiallyPaidAmount} href="/dashboard?filter=partially_paid" />
        <Card label="Overdue" value={summary.overdueAmount} href="/dashboard?filter=overdue" />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Recent Invoices</h2>
        <Link href="/invoices" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
          View all invoices →
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/dashboard?filter=${f.key}`}
            className={`rounded-full px-3 py-1 text-xs ${
              f.key === active.key
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="py-2 font-medium">Invoice</th>
            <th className="py-2 font-medium">Customer</th>
            <th className="py-2 font-medium">Date</th>
            <th className="py-2 font-medium">Total</th>
            <th className="py-2 font-medium">Paid</th>
            <th className="py-2 font-medium">Balance</th>
            <th className="py-2 font-medium">Payment</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">
                <Link href={`/invoices/${inv.id}`} className="text-zinc-900 hover:underline dark:text-zinc-50">
                  {inv.invoiceNumber ?? "Draft"}
                </Link>
              </td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">{inv.customer.name}</td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">
                {(inv.issueDate ?? inv.createdAt).toLocaleDateString("en-IN")}
              </td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">{inv.grandTotal.toString()}</td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">{inv.paidTotal.toString()}</td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">{inv.balanceDue.toString()}</td>
              <td className="py-2">
                <Badge label={inv.paymentStatus} />
              </td>
              <td className="py-2">
                <Badge label={inv.status} />
              </td>
              <td className="py-2">
                <Link href={`/invoices/${inv.id}`} className="text-xs text-zinc-500 hover:underline dark:text-zinc-400">
                  View
                </Link>
              </td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr>
              <td colSpan={9} className="py-6 text-center text-zinc-400">
                No invoices found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
