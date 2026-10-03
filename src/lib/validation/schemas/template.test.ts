import { describe, it, expect } from "vitest";
import { templateDocumentSchema } from "./template";
import { DEFAULT_TEMPLATE_DOCUMENT, STARTER_INVOICE_LAYOUT, STARTER_RECEIPT_LAYOUT } from "@/types/template";

const baseComponent = {
  id: "c1",
  x: 0,
  y: 0,
  width: 50,
  height: 20,
  locked: false,
  visible: true,
  zIndex: 1,
};

describe("templateDocumentSchema", () => {
  it("accepts the empty default document", () => {
    expect(templateDocumentSchema.safeParse(DEFAULT_TEMPLATE_DOCUMENT).success).toBe(true);
  });

  it("accepts a document with one of each major component type", () => {
    const doc = {
      ...DEFAULT_TEMPLATE_DOCUMENT,
      components: [
        { ...baseComponent, id: "t1", type: "text", props: { content: ["Hello", { kind: "field", path: "customer.name" }] } },
        { ...baseComponent, id: "i1", type: "image", props: { src: "https://example.com/logo.png" } },
        {
          ...baseComponent,
          id: "q1",
          type: "qrcode",
          props: { source: { field: { kind: "field", path: "payment.upi" } } },
        },
        {
          ...baseComponent,
          id: "it1",
          type: "itemsTable",
          props: {
            columns: [{ key: "description", label: "Description", widthPercent: 100 }],
            repeatHeaderOnEachPage: true,
          },
        },
        { ...baseComponent, id: "tot1", type: "totals", props: {} },
      ],
    };
    const result = templateDocumentSchema.safeParse(doc);
    expect(result.success).toBe(true);
  });

  it("rejects a document missing a required page margin", () => {
    const doc = { page: { size: "A4", orientation: "portrait", marginTopMm: 15 }, components: [] };
    expect(templateDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects an unknown component type (discriminated union)", () => {
    const doc = {
      ...DEFAULT_TEMPLATE_DOCUMENT,
      components: [{ ...baseComponent, type: "video", props: {} }],
    };
    expect(templateDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects a non-positive component width", () => {
    const doc = {
      ...DEFAULT_TEMPLATE_DOCUMENT,
      components: [{ ...baseComponent, width: 0, type: "text", props: { content: [] } }],
    };
    expect(templateDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects an itemsTable missing repeatHeaderOnEachPage", () => {
    const doc = {
      ...DEFAULT_TEMPLATE_DOCUMENT,
      components: [
        {
          ...baseComponent,
          type: "itemsTable",
          props: { columns: [{ key: "description", label: "Description", widthPercent: 100 }] },
        },
      ],
    };
    expect(templateDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects a qrcode with an invalid source", () => {
    const doc = {
      ...DEFAULT_TEMPLATE_DOCUMENT,
      components: [{ ...baseComponent, type: "qrcode", props: { source: "bitcoin" } }],
    };
    expect(templateDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("accepts a qrcode with the literal 'upi' source", () => {
    const doc = {
      ...DEFAULT_TEMPLATE_DOCUMENT,
      components: [{ ...baseComponent, type: "qrcode", props: { source: "upi" } }],
    };
    expect(templateDocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("rejects an invalid page orientation", () => {
    const doc = { ...DEFAULT_TEMPLATE_DOCUMENT, page: { ...DEFAULT_TEMPLATE_DOCUMENT.page, orientation: "sideways" } };
    expect(templateDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("accepts the auto-provisioned starter invoice layout", () => {
    const result = templateDocumentSchema.safeParse(STARTER_INVOICE_LAYOUT);
    expect(result.success).toBe(true);
  });

  it("accepts the auto-provisioned starter receipt layout", () => {
    const result = templateDocumentSchema.safeParse(STARTER_RECEIPT_LAYOUT);
    expect(result.success).toBe(true);
  });
});
