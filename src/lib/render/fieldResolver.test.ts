import { describe, it, expect } from "vitest";
import {
  resolveFieldRef,
  resolveRichContent,
  findUnknownFieldPaths,
  findUnknownFieldPathsInDocument,
  type RenderContext,
} from "./fieldResolver";
import { isKnownFieldPath } from "./fieldRegistry";
import type { TemplateDocument } from "@/types/template";

const context: RenderContext = {
  business: { name: "EdZeb Pvt Ltd" },
  customer: { name: "ABC Pvt Ltd" },
  invoice: { number: "INV-2026-0001", date: "2026-09-14" },
  totals: { grand_total: "59000" },
  payment: { upi: "edzeb@upi" },
};

describe("fieldRegistry", () => {
  it("knows every documented field path", () => {
    expect(isKnownFieldPath("business.name")).toBe(true);
    expect(isKnownFieldPath("totals.grand_total")).toBe(true);
    expect(isKnownFieldPath("payment.upi")).toBe(true);
  });

  it("rejects an unregistered path", () => {
    expect(isKnownFieldPath("business.fax_number")).toBe(false);
  });
});

describe("resolveFieldRef", () => {
  it("returns undefined with no context (design mode)", () => {
    expect(resolveFieldRef({ kind: "field", path: "customer.name" }, undefined)).toBeUndefined();
  });

  it("resolves a known text field", () => {
    expect(resolveFieldRef({ kind: "field", path: "customer.name" }, context)).toBe("ABC Pvt Ltd");
  });

  it("formats a currency field to two decimals", () => {
    expect(resolveFieldRef({ kind: "field", path: "totals.grand_total" }, context)).toBe("59000.00");
  });

  it("formats a date field", () => {
    const resolved = resolveFieldRef({ kind: "field", path: "invoice.date" }, context);
    expect(resolved).toBe(new Date("2026-09-14").toLocaleDateString());
  });

  it("uses the fallback when the value is missing", () => {
    expect(
      resolveFieldRef({ kind: "field", path: "customer.gstin", fallback: "N/A" }, context),
    ).toBe("N/A");
  });

  it("returns undefined for an unknown path", () => {
    expect(resolveFieldRef({ kind: "field", path: "customer.fax" }, context)).toBeUndefined();
  });
});

describe("resolveRichContent", () => {
  it("joins literal text and resolved fields", () => {
    const result = resolveRichContent(
      ["Bill to: ", { kind: "field", path: "customer.name" }, " (", { kind: "field", path: "invoice.number" }, ")"],
      context,
    );
    expect(result).toBe("Bill to: ABC Pvt Ltd (INV-2026-0001)");
  });

  it("falls back to the FieldRef fallback text when unresolved", () => {
    const result = resolveRichContent(
      [{ kind: "field", path: "customer.gstin", fallback: "—" }],
      context,
    );
    expect(result).toBe("—");
  });
});

describe("findUnknownFieldPaths / findUnknownFieldPathsInDocument", () => {
  it("flags a bogus path in rich content", () => {
    expect(findUnknownFieldPaths([{ kind: "field", path: "customer.fax" }])).toEqual(["customer.fax"]);
  });

  it("does not flag a known path", () => {
    expect(findUnknownFieldPaths([{ kind: "field", path: "customer.name" }])).toEqual([]);
  });

  it("scans text, image, and qrcode components across a document", () => {
    const doc: TemplateDocument = {
      page: { size: "A4", orientation: "portrait", marginTopMm: 15, marginRightMm: 15, marginBottomMm: 15, marginLeftMm: 15 },
      components: [
        {
          id: "t1",
          type: "text",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          locked: false,
          visible: true,
          zIndex: 1,
          props: { content: [{ kind: "field", path: "customer.bogus" }] },
        },
        {
          id: "i1",
          type: "image",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          locked: false,
          visible: true,
          zIndex: 1,
          props: { src: { kind: "field", path: "business.logo" } },
        },
        {
          id: "q1",
          type: "qrcode",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          locked: false,
          visible: true,
          zIndex: 1,
          props: { source: { field: { kind: "field", path: "payment.not_real" } } },
        },
      ],
    };
    expect(findUnknownFieldPathsInDocument(doc).sort()).toEqual(["customer.bogus", "payment.not_real"]);
  });
});
