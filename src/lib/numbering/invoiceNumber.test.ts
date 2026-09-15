import { describe, it, expect } from "vitest";
import { financialYearLabel } from "./invoiceNumber";

describe("financialYearLabel", () => {
  it("assigns a September date to the FY starting that April", () => {
    expect(financialYearLabel(new Date(2026, 8, 14))).toBe("2026"); // Sept 2026
  });

  it("assigns a January/February/March date to the previous FY", () => {
    expect(financialYearLabel(new Date(2026, 1, 10))).toBe("2025"); // Feb 2026
  });

  it("treats April 1st as the start of the new FY", () => {
    expect(financialYearLabel(new Date(2026, 3, 1))).toBe("2026"); // Apr 1, 2026
  });

  it("treats March 31st as the end of the prior FY", () => {
    expect(financialYearLabel(new Date(2026, 2, 31))).toBe("2025"); // Mar 31, 2026
  });
});
