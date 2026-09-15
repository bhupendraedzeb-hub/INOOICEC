import { describe, it, expect } from "vitest";
import { paginateDocument } from "./paginate";
import type { TemplateDocument } from "@/types/template";
import type { RenderContext } from "./fieldResolver";

const page = { size: "A4" as const, orientation: "portrait" as const, marginTopMm: 10, marginRightMm: 10, marginBottomMm: 10, marginLeftMm: 10 };

function makeDocument(repeatHeaderOnEachPage: boolean): TemplateDocument {
  return {
    page,
    components: [
      {
        id: "hdr",
        type: "header",
        x: 0,
        y: 0,
        width: 190,
        height: 20,
        locked: false,
        visible: true,
        zIndex: 1,
        props: {},
      },
      {
        id: "items",
        type: "itemsTable",
        x: 0,
        y: 20,
        width: 190,
        height: 42, // (42 - 6mm header) / 6mm per row = 6 rows/page
        locked: false,
        visible: true,
        zIndex: 1,
        props: { columns: [{ key: "description", label: "Item", widthPercent: 100 }], repeatHeaderOnEachPage },
      },
      {
        id: "tot",
        type: "totals",
        x: 0,
        y: 65,
        width: 190,
        height: 30,
        locked: false,
        visible: true,
        zIndex: 1,
        props: {},
      },
    ],
  };
}

function makeContext(itemCount: number): RenderContext {
  return {
    business: {},
    customer: {},
    invoice: {},
    totals: { grand_total: "1000" },
    payment: {},
    items: Array.from({ length: itemCount }, (_, i) => ({
      index: String(i + 1),
      item: `Item ${i + 1}`,
      description: `Item ${i + 1}`,
      hsn: "",
      qty: "1",
      unit: "",
      rate: "10",
      discount: "0",
      gstPercent: "0%",
      taxAmount: "0",
      amount: "10",
    })),
  };
}

describe("paginateDocument", () => {
  it("returns a single page when there's no itemsTable", () => {
    const doc: TemplateDocument = { page, components: [{ id: "t", type: "totals", x: 0, y: 0, width: 10, height: 10, locked: false, visible: true, zIndex: 1, props: {} }] };
    const pages = paginateDocument(doc, makeContext(0));
    expect(pages).toHaveLength(1);
    expect(pages[0].document).toBe(doc);
  });

  it("returns a single page when all items fit in the itemsTable's box", () => {
    const doc = makeDocument(true);
    const pages = paginateDocument(doc, makeContext(6));
    expect(pages).toHaveLength(1);
    expect(pages[0].context.items).toHaveLength(6);
  });

  it("splits into multiple pages when items exceed one page's capacity", () => {
    const doc = makeDocument(true);
    const pages = paginateDocument(doc, makeContext(14));
    expect(pages).toHaveLength(3);
    expect(pages[0].context.items).toHaveLength(6);
    expect(pages[1].context.items).toHaveLength(6);
    expect(pages[2].context.items).toHaveLength(2);
  });

  it("repeats every-page components (header) on all pages and confines last-page-only components (totals) to the final page", () => {
    const doc = makeDocument(true);
    const pages = paginateDocument(doc, makeContext(14));
    for (const p of pages) {
      expect(p.document.components.some((c) => c.type === "header")).toBe(true);
      expect(p.document.components.some((c) => c.type === "itemsTable")).toBe(true);
    }
    expect(pages[0].document.components.some((c) => c.type === "totals")).toBe(false);
    expect(pages[1].document.components.some((c) => c.type === "totals")).toBe(false);
    expect(pages[2].document.components.some((c) => c.type === "totals")).toBe(true);
  });

  it("shows the itemsTable header on every page when repeatHeaderOnEachPage is true", () => {
    const pages = paginateDocument(makeDocument(true), makeContext(14));
    expect(pages.map((p) => p.showItemsTableHeader)).toEqual([true, true, true]);
  });

  it("shows the itemsTable header only on the first page when repeatHeaderOnEachPage is false", () => {
    const pages = paginateDocument(makeDocument(false), makeContext(14));
    expect(pages.map((p) => p.showItemsTableHeader)).toEqual([true, false, false]);
  });
});
