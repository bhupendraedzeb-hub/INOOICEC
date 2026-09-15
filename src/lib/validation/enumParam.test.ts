import { describe, it, expect } from "vitest";
import { parseEnumParam } from "./enumParam";

const STATUSES = ["DRAFT", "ISSUED", "CANCELLED"] as const;

describe("parseEnumParam", () => {
  it("returns the value when it's in the allowed list", () => {
    expect(parseEnumParam("ISSUED", STATUSES)).toBe("ISSUED");
  });

  it("returns undefined for a value not in the allowed list", () => {
    expect(parseEnumParam("garbage", STATUSES)).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(parseEnumParam(null, STATUSES)).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(parseEnumParam("", STATUSES)).toBeUndefined();
  });

  it("is case-sensitive (does not coerce lowercase to the matching uppercase member)", () => {
    expect(parseEnumParam("issued", STATUSES)).toBeUndefined();
  });
});
