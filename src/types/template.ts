// The Template JSON schema — stored as TemplateVersion.layout (jsonb).
// See plan.md "Template JSON Schema" for the design rationale: this is the
// single source of truth consumed by the builder canvas (Phase 5), the
// invoice preview, and the PDF print route (Phase 12) — one shape, one
// resolver, rendered by the same component tree everywhere.

export const COMPONENT_TYPES = [
  "text",
  "image",
  "logo",
  "divider",
  "shape",
  "qrcode",
  "header",
  "businessDetails",
  "customerDetails",
  "invoiceDetails",
  "itemsTable",
  "taxSummary",
  "totals",
  "paymentDetails",
  "signature",
  "terms",
  "notes",
  "footer",
  // Phase 21 — Payment Receipts. Every other type above is reused as-is by
  // receipt templates (header/logo/businessDetails/customerDetails/
  // paymentDetails/signature/terms/notes/footer/qrcode); these two are
  // receipt-specific.
  "receiptDetails",
  "paymentSummary",
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

// Every allowed dynamic-field path a template can bind to. The builder never
// lets a user type these as raw syntax — see fieldRegistry.ts (Phase 6) for
// the picker UI that inserts a FieldRef instead.
export type FieldRef = {
  kind: "field";
  path: string; // e.g. "customer.name", "invoice.date", "totals.grand_total"
  fallback?: string;
};

export type RichContentRun = string | FieldRef;
export type RichContent = RichContentRun[];

export type BaseStyle = {
  font?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  align?: "left" | "center" | "right";
  color?: string;
  background?: string;
  borderColor?: string;
  borderWidth?: number;
  paddingMm?: number;
  marginMm?: number;
};

export type TextProps = BaseStyle & { content: RichContent };
export type ImageProps = { src: string | FieldRef; fit?: "contain" | "cover" };
export type LogoProps = { fit?: "contain" | "cover" };
export type DividerProps = { color?: string; thickness?: number };
export type ShapeProps = BaseStyle & { shape: "rect" | "circle" | "line" };
export type QrCodeProps = BaseStyle & { source: "upi" | "customUrl" | { field: FieldRef } };

export type ItemsTableColumnKey =
  | "index"
  | "item"
  | "description"
  | "hsn"
  | "qty"
  | "unit"
  | "rate"
  | "discount"
  | "gstPercent"
  | "taxAmount"
  | "amount";

export type ItemsTableColumn = {
  key: ItemsTableColumnKey;
  label: string;
  widthPercent: number;
  align?: "left" | "center" | "right";
};

export type ItemsTableProps = BaseStyle & {
  // Order of this array is column (left-to-right) order — reordering in the
  // builder just reorders the array, no separate "position" field needed.
  columns: ItemsTableColumn[];
  repeatHeaderOnEachPage: boolean;
};

// Structural/invoice-bound components with no configurable content beyond
// shared styling in V1 — they render fixed sub-layouts sourced from the
// render context (business/customer/invoice/totals/payment).
export type StructuralProps = BaseStyle;

export type ComponentProps =
  | TextProps
  | ImageProps
  | LogoProps
  | DividerProps
  | ShapeProps
  | QrCodeProps
  | ItemsTableProps
  | StructuralProps;

export type ComponentNode = {
  id: string;
  type: ComponentType;
  // Position/size are all millimeters, matching page.marginXMm — the same
  // units print CSS (@page, mm-based) uses natively. This is what lets the
  // builder canvas, browser preview, and Playwright PDF output stay pixel/mm
  // consistent without any unit conversion at render time (only the builder's
  // *editing* UI converts mm<->px, purely for on-screen dragging).
  x: number;
  y: number;
  width: number;
  height: number;
  locked: boolean;
  visible: boolean;
  zIndex: number;
  props: ComponentProps;
};

export type TemplateDocument = {
  page: {
    size: "A4";
    orientation: "portrait" | "landscape";
    marginTopMm: number;
    marginRightMm: number;
    marginBottomMm: number;
    marginLeftMm: number;
  };
  components: ComponentNode[];
};

export const DEFAULT_TEMPLATE_DOCUMENT: TemplateDocument = {
  page: {
    size: "A4",
    orientation: "portrait",
    marginTopMm: 15,
    marginRightMm: 15,
    marginBottomMm: 15,
    marginLeftMm: 15,
  },
  components: [],
};

const STARTER_PAGE = DEFAULT_TEMPLATE_DOCUMENT.page;

function structuralComponent(
  id: string,
  type: ComponentType,
  x: number,
  y: number,
  width: number,
  height: number,
): ComponentNode {
  return { id, type, x, y, width, height, locked: false, visible: true, zIndex: 1, props: {} };
}

// Auto-provisioned for every new organization at signup (organizations.ts)
// so a first-time user can issue a real, professional-looking invoice
// immediately — without ever opening the drag-and-drop builder. Every block
// here is a structural/composite component (src/lib/render/components.tsx
// already knows how to render each from just its type + position), so this
// is pure layout data, not a special rendering path. Coordinates are mm,
// relative to the page's content box (inside the margins) per
// TemplateRenderer.tsx. Users can still open this in the builder afterward
// to restyle or rearrange it like any other template.
export const STARTER_INVOICE_LAYOUT: TemplateDocument = {
  page: STARTER_PAGE,
  components: [
    structuralComponent("header", "header", 0, 0, 180, 14),
    structuralComponent("business", "businessDetails", 0, 16, 88, 30),
    structuralComponent("invoiceDetails", "invoiceDetails", 92, 16, 88, 30),
    structuralComponent("customer", "customerDetails", 0, 48, 88, 30),
    {
      ...structuralComponent("items", "itemsTable", 0, 80, 180, 100),
      props: {
        columns: [
          { key: "index", label: "#", widthPercent: 5, align: "center" },
          { key: "item", label: "Item", widthPercent: 25 },
          { key: "hsn", label: "HSN/SAC", widthPercent: 10 },
          { key: "qty", label: "Qty", widthPercent: 8, align: "right" },
          { key: "unit", label: "Unit", widthPercent: 8 },
          { key: "rate", label: "Rate", widthPercent: 12, align: "right" },
          { key: "gstPercent", label: "GST%", widthPercent: 7, align: "right" },
          { key: "taxAmount", label: "Tax", widthPercent: 10, align: "right" },
          { key: "amount", label: "Amount", widthPercent: 15, align: "right" },
        ],
        repeatHeaderOnEachPage: true,
      } satisfies ItemsTableProps,
    },
    structuralComponent("taxSummary", "taxSummary", 0, 184, 86, 36),
    structuralComponent("totals", "totals", 92, 184, 88, 36),
    structuralComponent("paymentDetails", "paymentDetails", 0, 224, 86, 20),
    structuralComponent("signature", "signature", 92, 224, 88, 20),
    structuralComponent("terms", "terms", 0, 248, 180, 10),
    structuralComponent("footer", "footer", 0, 262, 180, 5),
  ],
};

// Same idea as STARTER_INVOICE_LAYOUT, for receipts — shorter document so
// the blocks sit near the top of the page rather than spanning it.
export const STARTER_RECEIPT_LAYOUT: TemplateDocument = {
  page: STARTER_PAGE,
  components: [
    structuralComponent("header", "header", 0, 0, 180, 14),
    structuralComponent("business", "businessDetails", 0, 16, 88, 30),
    structuralComponent("receiptDetails", "receiptDetails", 92, 16, 88, 24),
    structuralComponent("customer", "customerDetails", 0, 48, 88, 30),
    structuralComponent("paymentSummary", "paymentSummary", 92, 48, 88, 34),
    structuralComponent("paymentDetails", "paymentDetails", 0, 86, 88, 22),
    structuralComponent("signature", "signature", 92, 86, 88, 22),
    structuralComponent("footer", "footer", 0, 112, 180, 6),
  ],
};
