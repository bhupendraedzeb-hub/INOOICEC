import type { ComponentNode, ComponentProps, ComponentType, ItemsTableColumnKey } from "@/types/template";

const SHARED_CONTENT_TYPES: ComponentType[] = ["text", "image", "logo", "divider", "shape", "qrcode"];

// Which palette groups src/components/builder/Palette.tsx shows, per
// document kind (see TemplateBuilder's documentKind prop). The "Content"
// group is reused verbatim by both kinds; only the structural-block group
// differs, since receipt templates bind to receiptDetails/paymentSummary
// instead of invoiceDetails/totals/taxSummary — but still reuse
// header/businessDetails/customerDetails/paymentDetails/signature/terms/
// notes/footer as-is.
export const PALETTE_GROUPS_BY_KIND: Record<"invoice" | "receipt", Array<{ title: string; types: ComponentType[] }>> = {
  invoice: [
    { title: "Content", types: SHARED_CONTENT_TYPES },
    {
      title: "Invoice",
      types: [
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
      ],
    },
  ],
  receipt: [
    { title: "Content", types: SHARED_CONTENT_TYPES },
    {
      title: "Receipt",
      types: [
        "header",
        "businessDetails",
        "customerDetails",
        "receiptDetails",
        "paymentSummary",
        "paymentDetails",
        "signature",
        "terms",
        "notes",
        "footer",
      ],
    },
  ],
};

export const COMPONENT_LABELS: Record<ComponentType, string> = {
  text: "Text",
  image: "Image",
  logo: "Logo",
  divider: "Divider",
  shape: "Shape",
  qrcode: "QR Code",
  header: "Invoice Header",
  businessDetails: "Business Details",
  customerDetails: "Customer Details",
  invoiceDetails: "Invoice Details",
  itemsTable: "Items Table",
  taxSummary: "Tax Summary",
  totals: "Totals",
  paymentDetails: "Payment Details",
  signature: "Signature",
  terms: "Terms & Conditions",
  notes: "Notes",
  footer: "Footer",
  receiptDetails: "Receipt Details",
  paymentSummary: "Payment Summary",
};

const DEFAULT_ITEMS_TABLE_COLUMNS: Array<{ key: ItemsTableColumnKey; label: string; widthPercent: number }> = [
  { key: "index", label: "#", widthPercent: 5 },
  { key: "item", label: "Item", widthPercent: 20 },
  { key: "description", label: "Description", widthPercent: 20 },
  { key: "hsn", label: "HSN/SAC", widthPercent: 10 },
  { key: "qty", label: "Qty", widthPercent: 8 },
  { key: "unit", label: "Unit", widthPercent: 7 },
  { key: "rate", label: "Rate", widthPercent: 10 },
  { key: "gstPercent", label: "GST %", widthPercent: 8 },
  { key: "amount", label: "Amount", widthPercent: 12 },
];

function defaultSize(type: ComponentType): { width: number; height: number } {
  switch (type) {
    case "logo":
      return { width: 30, height: 30 };
    case "image":
      return { width: 40, height: 40 };
    case "qrcode":
      return { width: 25, height: 25 };
    case "divider":
      return { width: 100, height: 2 };
    case "itemsTable":
      return { width: 180, height: 60 };
    case "header":
      return { width: 180, height: 25 };
    default:
      return { width: 80, height: 20 };
  }
}

function defaultProps(type: ComponentType): ComponentProps {
  switch (type) {
    case "text":
      return { content: ["New text"] };
    case "image":
      return { src: "" };
    case "logo":
      return {};
    case "divider":
      return { color: "#d4d4d8", thickness: 1 };
    case "shape":
      return { shape: "rect", background: "#e4e4e7" };
    case "qrcode":
      return { source: "upi" };
    case "itemsTable":
      return { columns: DEFAULT_ITEMS_TABLE_COLUMNS, repeatHeaderOnEachPage: true };
    default:
      return {};
  }
}

export function createDefaultComponent(
  type: ComponentType,
  opts: { id: string; x: number; y: number; zIndex: number },
): ComponentNode {
  const size = defaultSize(type);
  return {
    id: opts.id,
    type,
    x: opts.x,
    y: opts.y,
    width: size.width,
    height: size.height,
    locked: false,
    visible: true,
    zIndex: opts.zIndex,
    props: defaultProps(type),
  };
}
