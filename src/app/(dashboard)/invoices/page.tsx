import Link from "next/link";
import { listInvoices } from "@/lib/services/invoices";
import type { InvoiceStatus, PaymentStatus } from "@/generated/prisma/client";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  ISSUED: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  UNPAID: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  PAID: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

function Badge({ label }: { label: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[label] ?? ""}`}>
      {label.replace("_", " ")}
    </span>
  );
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; paymentStatus?: string }>;
}) {
  const { q, status, paymentStatus } = await searchParams;
  const invoices = await listInvoices({
    q,
    status: status as InvoiceStatus | undefined,
    paymentStatus: paymentStatus as PaymentStatus | undefined,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Invoices</h1>
        <Link
          href="/invoices/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New Invoice
        </Link>
      </div>

      <form className="mt-4 flex items-center gap-3" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search invoice # or customer…"
          className="w-64 rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select name="status" defaultValue={status ?? ""} className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ISSUED">Issued</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select name="paymentStatus" defaultValue={paymentStatus ?? ""} className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <option value="">All payment statuses</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Paid</option>
          <option value="OVERDUE">Overdue</option>
        </select>
        <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
          Search
        </button>
      </form>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="py-2 font-medium">Invoice</th>
            <th className="py-2 font-medium">Customer</th>
            <th className="py-2 font-medium">Grand Total</th>
            <th className="py-2 font-medium">Balance</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium">Payment</th>
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
              <td className="py-2 text-zinc-600 dark:text-zinc-400">{inv.grandTotal.toString()}</td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">{inv.balanceDue.toString()}</td>
              <td className="py-2">
                <Badge label={inv.status} />
              </td>
              <td className="py-2">
                <Badge label={inv.paymentStatus} />
              </td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-zinc-400">
                No invoices found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
