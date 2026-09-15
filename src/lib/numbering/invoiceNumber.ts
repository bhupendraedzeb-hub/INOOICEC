import type { Prisma } from "@/generated/prisma/client";

// Indian financial year convention: April 1 - March 31. An invoice dated
// September 2026 belongs to FY "2026"; one dated February 2026 belongs to
// FY "2025" (its year started the previous April).
export function financialYearLabel(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  return String(month >= 4 ? year : year - 1);
}

function formatInvoiceNumber(format: string, prefix: string, financialYear: string, sequence: number): string {
  return format
    .replaceAll("{prefix}", prefix)
    .replaceAll("{fy}", financialYear)
    .replaceAll("{seq}", String(sequence).padStart(4, "0"));
}

// Must be called inside the same transaction that flips Invoice.status to
// ISSUED (plan.md Critical Business Rule: numbers are never generated or
// consumed on preview, only reserved at issuance). Atomic under concurrent
// /issue calls via Prisma's upsert, which Postgres implements as
// INSERT ... ON CONFLICT DO UPDATE — no separate SELECT ... FOR UPDATE
// needed.
export async function reserveInvoiceNumber(
  tx: Prisma.TransactionClient,
  opts: { prefix: string; format: string; issueDate: Date },
): Promise<string> {
  const financialYear = financialYearLabel(opts.issueDate);
  const counter = await tx.invoiceNumberCounter.upsert({
    where: { prefix_financialYear: { prefix: opts.prefix, financialYear } },
    create: { prefix: opts.prefix, financialYear, lastSequence: 1 },
    update: { lastSequence: { increment: 1 } },
  });
  return formatInvoiceNumber(opts.format, opts.prefix, financialYear, counter.lastSequence);
}
