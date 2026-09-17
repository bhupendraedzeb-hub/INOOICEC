import type { Prisma } from "@/generated/prisma/client";
import { financialYearLabel } from "@/lib/numbering/invoiceNumber";

function formatReceiptNumber(format: string, prefix: string, financialYear: string, sequence: number): string {
  return format
    .replaceAll("{prefix}", prefix)
    .replaceAll("{fy}", financialYear)
    .replaceAll("{seq}", String(sequence).padStart(4, "0"));
}

// Same atomic-upsert pattern as reserveInvoiceNumber, against its own
// separate ReceiptNumberCounter table — receipt numbering can never
// interfere with (or share a sequence with) invoice numbering, even if an
// org uses the same prefix for both by coincidence.
export async function reserveReceiptNumber(
  tx: Prisma.TransactionClient,
  opts: { organizationId: string; prefix: string; format: string; issueDate: Date },
): Promise<string> {
  const financialYear = financialYearLabel(opts.issueDate);
  const counter = await tx.receiptNumberCounter.upsert({
    where: {
      organizationId_prefix_financialYear: { organizationId: opts.organizationId, prefix: opts.prefix, financialYear },
    },
    create: { organizationId: opts.organizationId, prefix: opts.prefix, financialYear, lastSequence: 1 },
    update: { lastSequence: { increment: 1 } },
  });
  return formatReceiptNumber(opts.format, opts.prefix, financialYear, counter.lastSequence);
}
