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
import { resolveFieldRef, type RenderContext } from "@/lib/render/fieldResolver";

// Invoice-bound structural components still render as clearly-labeled
// placeholders (real invoice data is Phase 9). FieldRef *values*, however,
// resolve for real when a RenderContext is supplied (Phase 6); with no
// context — the builder's design-mode canvas — a FieldRef renders as a chip
// showing its path instead of a value.

function FieldChip({ path }: { path: string }) {
  return (
    <span
      className="rounded bg-blue-100 px-1 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
      style={{ fontSize: "0.85em" }}
    >
      {`{{${path}}}`}
    </span>
  );
}

function RichContentView({ content, context }: { content: RichContent; context?: RenderContext }) {
  return (
    <>
      {content.map((run, i) => {
        if (typeof run === "string") return <span key={i}>{run}</span>;
        const resolved = resolveFieldRef(run, context);
        return resolved !== undefined ? <span key={i}>{resolved}</span> : <FieldChip key={i} path={run.path} />;
      })}
    </>
  );
}

const DEFAULT_SAMPLE_ROWS = 4;

// Deliberately longer than the other sample cells — proves the
// "long descriptions" requirement (word-wrap within the cell, no overflow
// breaking the table layout) without needing real invoice data yet.
const SAMPLE_DESCRIPTION =
  "Annual maintenance and support contract covering priority email/phone response and quarterly on-site review";

function itemsTableSampleValue(key: string, rowIndex: number): string {
  if (key === "index") return String(rowIndex + 1);
  if (key === "description") return SAMPLE_DESCRIPTION;
  return (
    {
      item: "Sample Item",
      hsn: "9983",
      qty: "1",
      unit: "pcs",
      rate: "0.00",
      discount: "0.00",
      gstPercent: "18%",
      taxAmount: "0.00",
      amount: "0.00",
    }[key] ?? ""
  );
}

// previewRowCount is a builder-only rendering knob (not part of the saved
// template JSON) — it exists so the multi-row/wrapping/print-readiness
// behavior can be verified against a long dummy list before real invoice
// data exists. `items`, when supplied via RenderContext (Phase 9+), are the
// invoice's actual line items and always take priority over the dummy
// preview rows — a real invoice must never show placeholder "Sample Item"
// rows.
function ItemsTableView({
  props,
  items,
  previewRowCount = DEFAULT_SAMPLE_ROWS,
}: {
  props: ItemsTableProps;
  items?: RenderContext["items"];
  previewRowCount?: number;
}) {
  const rows: Record<string, string>[] =
    items ?? Array.from({ length: previewRowCount }, (_, i) => Object.fromEntries(
      props.columns.map((col) => [col.key, itemsTableSampleValue(col.key, i)]),
    ));

  return (
    <table className="h-full w-full border-collapse text-xs" style={{ tableLayout: "fixed" }}>
      <thead>
        <tr>
          {props.columns.map((col) => (
            <th
              key={col.key}
              style={{ width: `${col.widthPercent}%`, textAlign: col.align ?? "left" }}
              className="border border-zinc-300 bg-zinc-100 px-1 py-0.5 font-medium dark:border-zinc-700 dark:bg-zinc-800"
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={props.columns.length} className="border border-zinc-200 px-1 py-2 text-center text-zinc-400 dark:border-zinc-800">
              No items
            </td>
          </tr>
        )}
        {rows.map((row, i) => (
          <tr key={i} style={{ breakInside: "avoid" }}>
            {props.columns.map((col) => (
              <td
                key={col.key}
                style={{ textAlign: col.align ?? "left", whiteSpace: "normal", wordBreak: "break-word" }}
                className={`border border-zinc-200 px-1 py-0.5 align-top dark:border-zinc-800 ${items ? "" : "text-zinc-400"}`}
              >
                {row[col.key] ?? ""}
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

function QrCodeView({ props, context }: { props: QrCodeProps; context?: RenderContext }) {
  if (typeof props.source === "object") {
    const resolved = resolveFieldRef(props.source.field, context);
    if (resolved) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center border border-zinc-300 bg-white p-1 text-center text-[9px] text-zinc-500 dark:border-zinc-700">
          <span>QR</span>
          <span className="truncate">{resolved}</span>
        </div>
      );
    }
    return (
      <div className="flex h-full w-full items-center justify-center border border-zinc-300 bg-white text-[10px] text-zinc-400 dark:border-zinc-700">
        <FieldChip path={props.source.field.path} />
      </div>
    );
  }
  const label = props.source === "upi" ? "QR: UPI" : "QR: URL";
  return (
    <div className="flex h-full w-full items-center justify-center border border-zinc-300 bg-white text-[10px] text-zinc-400 dark:border-zinc-700">
      {label}
    </div>
  );
}

function ImageView({ props, context }: { props: ImageProps; context?: RenderContext }) {
  if (typeof props.src === "object") {
    const resolved = resolveFieldRef(props.src, context);
    if (resolved) {
      // eslint-disable-next-line @next/next/no-img-element -- content is a user-provided/resolved arbitrary URL, not a local static asset
      return <img src={resolved} alt="" className="h-full w-full" style={{ objectFit: props.fit ?? "contain" }} />;
    }
    return (
      <div className="flex h-full w-full items-center justify-center border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
        <FieldChip path={props.src.path} />
      </div>
    );
  }
  if (props.src) {
    // eslint-disable-next-line @next/next/no-img-element -- content is a user-provided arbitrary URL, not a local static asset
    return <img src={props.src} alt="" className="h-full w-full" style={{ objectFit: props.fit ?? "contain" }} />;
  }
  return <StructuralPlaceholder label="Image" />;
}

export function ComponentContent({
  component,
  context,
  itemsTablePreviewRowCount,
}: {
  component: ComponentNode;
  context?: RenderContext;
  itemsTablePreviewRowCount?: number;
}) {
  // ComponentNode.props is a plain ComponentProps union, not discriminated
  // against `type` at the TS level (the Zod schema is; mirroring that in the
  // TS type would mean converting ComponentNode itself into a discriminated
  // union, touching every consumer). A per-branch cast here is the same
  // pattern PropertiesPanel already uses.
  switch (component.type) {
    case "text":
      return <RichContentView content={(component.props as TextProps).content} context={context} />;
    case "image":
      return <ImageView props={component.props as ImageProps} context={context} />;
    case "logo":
      return <StructuralPlaceholder label="Logo" />;
    case "divider": {
      const props = component.props as DividerProps;
      return <div className="w-full" style={{ height: props.thickness ?? 1, background: props.color ?? "#d4d4d8" }} />;
    }
    case "shape":
      return <ShapeView props={component.props as ShapeProps} />;
    case "qrcode":
      return <QrCodeView props={component.props as QrCodeProps} context={context} />;
    case "itemsTable":
      return (
        <ItemsTableView
          props={component.props as ItemsTableProps}
          items={context?.items}
          previewRowCount={itemsTablePreviewRowCount}
        />
      );
    default:
      return <StructuralPlaceholder label={STRUCTURAL_LABELS[component.type] ?? component.type} />;
  }
}
