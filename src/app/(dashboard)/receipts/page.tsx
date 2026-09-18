import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { listReceipts } from "@/lib/services/receipts";

export default async function ReceiptsPage() {
  const session = await auth();
  const receipts = await listReceipts(session!.user.organizationId, {});

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Receipts</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Auto-generated per payment. Configure a default template under Receipt Templates to enable generation.
          </p>
        </div>
      </div>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="py-2 font-medium">Receipt</th>
            <th className="py-2 font-medium">Invoice</th>
            <th className="py-2 font-medium">Customer</th>
            <th className="py-2 font-medium">Amount</th>
            <th className="py-2 font-medium">Date</th>
            <th className="py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((r) => (
            <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2 text-zinc-900 dark:text-zinc-50">{r.receiptNumber}</td>
              <td className="py-2">
                <Link href={`/invoices/${r.payment.invoiceId}`} className="text-zinc-600 hover:underline dark:text-zinc-400">
                  {r.payment.invoice.invoiceNumber ?? "Draft"}
                </Link>
              </td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">{r.payment.invoice.customer.name}</td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">{r.payment.amount.toString()}</td>
              <td className="py-2 text-zinc-600 dark:text-zinc-400">{r.issueDate.toISOString().slice(0, 10)}</td>
              <td className="py-2 text-right">
                <a
                  href={`/api/v1/receipts/${r.id}/pdf`}
                  className="text-zinc-900 hover:underline dark:text-zinc-50"
                >
                  Download
                </a>
              </td>
            </tr>
          ))}
          {receipts.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-zinc-400">
                No receipts yet — receipts auto-generate when a payment is recorded, as long as a default Active receipt template is configured.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
