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

export type ItemsTableProps = BaseStyle & {
  columns: Array<{ key: ItemsTableColumnKey; label: string; widthPercent: number }>;
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
