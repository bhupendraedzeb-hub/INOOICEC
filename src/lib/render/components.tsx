import type {
  ComponentNode,
  RichContent,
  ItemsTableProps,
  QrCodeProps,
  ShapeProps,
  ImageProps,
  TextProps,
  DividerProps,
} from "@/types/template";

// Phase 5 scope: no real invoice/business/customer data exists yet (that's
// Phase 6 field resolution + Phase 9 invoice data), so dynamic content and
// invoice-bound structural components render as clearly-labeled placeholders.
// A FieldRef always renders as a chip showing its path, never a resolved
// value, until fieldResolver.ts (Phase 6) is wired in.

function RichContentView({ content }: { content: RichContent }) {
  return (
    <>
      {content.map((run, i) =>
        typeof run === "string" ? (
          <span key={i}>{run}</span>
        ) : (
          <span
            key={i}
            className="rounded bg-blue-100 px-1 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
            style={{ fontSize: "0.85em" }}
          >
            {`{{${run.path}}}`}
          </span>
        ),
      )}
    </>
  );
}

const SAMPLE_ITEMS_TABLE_ROWS = 3;

const ITEMS_TABLE_COLUMN_SAMPLE: Record<string, string> = {
  index: "1",
  item: "Sample Item",
  description: "Description",
  hsn: "9983",
  qty: "1",
  unit: "pcs",
  rate: "0.00",
  discount: "0.00",
  gstPercent: "18%",
  taxAmount: "0.00",
  amount: "0.00",
};

function ItemsTableView({ props }: { props: ItemsTableProps }) {
  return (
    <table className="h-full w-full border-collapse text-xs">
      <thead>
        <tr>
          {props.columns.map((col) => (
            <th
              key={col.key}
              style={{ width: `${col.widthPercent}%` }}
              className="border border-zinc-300 bg-zinc-100 px-1 py-0.5 text-left font-medium dark:border-zinc-700 dark:bg-zinc-800"
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: SAMPLE_ITEMS_TABLE_ROWS }).map((_, i) => (
          <tr key={i}>
            {props.columns.map((col) => (
              <td key={col.key} className="border border-zinc-200 px-1 py-0.5 text-zinc-400 dark:border-zinc-800">
                {ITEMS_TABLE_COLUMN_SAMPLE[col.key] ?? ""}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StructuralPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
      {label}
    </div>
  );
}

const STRUCTURAL_LABELS: Record<string, string> = {
  header: "Invoice Header",
  businessDetails: "Business Details",
  customerDetails: "Customer Details",
  invoiceDetails: "Invoice Details",
  taxSummary: "Tax Summary",
  totals: "Totals",
  paymentDetails: "Payment Details",
  signature: "Signature",
  terms: "Terms & Conditions",
  notes: "Notes",
  footer: "Footer",
};

function ShapeView({ props }: { props: ShapeProps }) {
  if (props.shape === "line") {
    return <div className="h-px w-full" style={{ background: props.color ?? "#000" }} />;
  }
  return (
    <div
      className="h-full w-full"
      style={{
        background: props.background,
        border: props.borderWidth ? `${props.borderWidth}px solid ${props.borderColor ?? "#000"}` : undefined,
        borderRadius: props.shape === "circle" ? "9999px" : undefined,
      }}
    />
  );
}

function QrCodeView({ props }: { props: QrCodeProps }) {
  const label = props.source === "upi" ? "QR: UPI" : props.source === "customUrl" ? "QR: URL" : "QR: field";
  return (
    <div className="flex h-full w-full items-center justify-center border border-zinc-300 bg-white text-[10px] text-zinc-400 dark:border-zinc-700">
      {label}
    </div>
  );
}

function ImageView({ props }: { props: ImageProps }) {
  if (typeof props.src === "string" && props.src) {
    // eslint-disable-next-line @next/next/no-img-element -- content is a user-provided arbitrary URL, not a local static asset
    return <img src={props.src} alt="" className="h-full w-full" style={{ objectFit: props.fit ?? "contain" }} />;
  }
  return <StructuralPlaceholder label="Image" />;
}

export function ComponentContent({ component }: { component: ComponentNode }) {
  // ComponentNode.props is a plain ComponentProps union, not discriminated
  // against `type` at the TS level (the Zod schema is; mirroring that in the
  // TS type would mean converting ComponentNode itself into a discriminated
  // union, touching every consumer). A per-branch cast here is the same
  // pattern PropertiesPanel already uses.
  switch (component.type) {
    case "text":
      return <RichContentView content={(component.props as TextProps).content} />;
    case "image":
      return <ImageView props={component.props as ImageProps} />;
    case "logo":
      return <StructuralPlaceholder label="Logo" />;
    case "divider": {
      const props = component.props as DividerProps;
      return <div className="w-full" style={{ height: props.thickness ?? 1, background: props.color ?? "#d4d4d8" }} />;
    }
    case "shape":
      return <ShapeView props={component.props as ShapeProps} />;
    case "qrcode":
      return <QrCodeView props={component.props as QrCodeProps} />;
    case "itemsTable":
      return <ItemsTableView props={component.props as ItemsTableProps} />;
    default:
      return <StructuralPlaceholder label={STRUCTURAL_LABELS[component.type] ?? component.type} />;
  }
}
