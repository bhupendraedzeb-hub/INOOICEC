import { describe, it, expect, afterEach } from "vitest";
import { db } from "@/lib/db";
import { reserveInvoiceNumber, financialYearLabel } from "./invoiceNumber";

describe("financialYearLabel", () => {
  it("a date in September belongs to the FY that started the preceding April", () => {
    expect(financialYearLabel(new Date("2026-09-15"))).toBe("2026");
  });

  it("a date in February belongs to the FY that started the previous calendar year's April", () => {
    expect(financialYearLabel(new Date("2026-02-15"))).toBe("2025");
  });

  it("April 1 is the first day of the new financial year", () => {
    expect(financialYearLabel(new Date("2026-04-01"))).toBe("2026");
  });

  it("March 31 is the last day of the prior financial year", () => {
    expect(financialYearLabel(new Date("2026-03-31"))).toBe("2025");
  });
});

// Hits the real dev Postgres DB (via Prisma) — unlike every other test in
// this repo. plan.md's Phase 17 explicitly calls for "invoice numbering
// uniqueness under concurrency," which is meaningless as a pure-function
// test: the atomicity guarantee reserveInvoiceNumber relies on (Prisma's
// upsert -> Postgres INSERT ... ON CONFLICT DO UPDATE) is a property of the
// database, not the JS code, so only a real concurrent-transaction test
// against a real DB can actually verify it.
describe("reserveInvoiceNumber concurrency", () => {
  const prefix = "VTEST";
  const format = "{prefix}-{fy}-{seq}";

  afterEach(async () => {
    await db.invoiceNumberCounter.deleteMany({ where: { prefix } });
  });

  it("assigns unique, gapless sequential numbers to N concurrent reservations", async () => {
    const issueDate = new Date("2026-09-15");
    const concurrency = 20;

    const results = await Promise.all(
      Array.from({ length: concurrency }, () =>
        db.$transaction((tx) => reserveInvoiceNumber(tx, { prefix, format, issueDate })),
      ),
    );

    expect(new Set(results).size).toBe(concurrency);

    const sequences = results.map((r) => Number(r.split("-")[2])).sort((a, b) => a - b);
    expect(sequences).toEqual(Array.from({ length: concurrency }, (_, i) => i + 1));
  });

  it("keeps separate counters per financial year", async () => {
    const [inFy2025, inFy2026] = await Promise.all([
      db.$transaction((tx) => reserveInvoiceNumber(tx, { prefix, format, issueDate: new Date("2026-02-01") })),
      db.$transaction((tx) => reserveInvoiceNumber(tx, { prefix, format, issueDate: new Date("2026-09-01") })),
    ]);
    expect(inFy2025).toBe("VTEST-2025-0001");
    expect(inFy2026).toBe("VTEST-2026-0001");
  });
});
