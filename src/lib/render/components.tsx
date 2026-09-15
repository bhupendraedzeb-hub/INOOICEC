import QRCode from "qrcode";
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

// Shared shorthand used by every structural view below — resolves a
// registered field path through the exact same fieldResolver.ts path
// text/image/qrcode FieldRefs use, so currency/date formatting stays
// consistent across the whole document.
function field(path: string, context?: RenderContext): string | undefined {
  return resolveFieldRef({ kind: "field", path }, context);
}

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
  showHeader = true,
}: {
  props: ItemsTableProps;
  items?: RenderContext["items"];
  previewRowCount?: number;
  // Multi-page-only knob (Phase 12's paginateDocument), not part of the
  // saved template JSON — honors props.repeatHeaderOnEachPage by omitting
  // the <thead> on every page after the first when that flag is false.
  showHeader?: boolean;
}) {
  const rows: Record<string, string>[] =
    items ?? Array.from({ length: previewRowCount }, (_, i) => Object.fromEntries(
      props.columns.map((col) => [col.key, itemsTableSampleValue(col.key, i)]),
    ));

  return (
    <table className="h-full w-full border-collapse text-xs" style={{ tableLayout: "fixed" }}>
      {showHeader && (
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
      )}
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

// A real, scannable QR code rendered as inline SVG from qrcode's synchronous
// low-level `create()` API (a plain module bitmatrix, not the async
// toDataURL/toBuffer renderers) — this keeps every render path here fully
// synchronous, which matters because ComponentContent/TemplateRenderer are
// shared, non-async components used both from a "use client" live preview
// (InvoicePreviewPane) and from the server-rendered PDF route; an async
// component tree would break the client usage. SVG also prints losslessly at
// any size, unlike a rasterized PNG.
function QrSvg({ text }: { text: string }) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const cells: { x: number; y: number }[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.modules.get(row, col)) cells.push({ x: col, y: row });
    }
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" shapeRendering="crispEdges">
      <rect x={0} y={0} width={size} height={size} fill="#fff" />
      <g fill="#000">
        {cells.map((c) => (
          <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1} height={1} />
        ))}
      </g>
    </svg>
  );
}

function QrPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center border border-zinc-300 bg-white text-center text-[10px] text-zinc-400 dark:border-zinc-700">
      {label}
    </div>
  );
}

// Builds a standard UPI deep-link payment URI (upi://pay?...) from whatever
// of the invoice/business/payment context is available. Real UPI apps read
// this on scan; missing pieces (e.g. no amount) are simply omitted rather
// than encoding a broken/placeholder URI.
function buildUpiUri(context: RenderContext): string | undefined {
  const upi = context.payment.upi;
  if (!upi) return undefined;
  const params = new URLSearchParams({ pa: upi, cu: "INR" });
  if (context.business.name) params.set("pn", context.business.name);
  const amount = context.totals.balance ?? context.totals.grand_total;
  if (amount) params.set("am", amount);
  if (context.invoice.number) params.set("tn", `Invoice ${context.invoice.number}`);
  return `upi://pay?${params.toString()}`;
}

function QrCodeView({ props, context }: { props: QrCodeProps; context?: RenderContext }) {
  if (typeof props.source === "object") {
    const resolved = resolveFieldRef(props.source.field, context);
    if (resolved) return <QrSvg text={resolved} />;
    if (context) return <QrPlaceholder label="QR source is empty" />;
    return (
      <div className="flex h-full w-full items-center justify-center border border-zinc-300 bg-white text-[10px] text-zinc-400 dark:border-zinc-700">
        <FieldChip path={props.source.field.path} />
      </div>
    );
  }
  if (props.source === "upi") {
    if (!context) return <QrPlaceholder label="QR: UPI" />;
    const uri = buildUpiUri(context);
    return uri ? <QrSvg text={uri} /> : <QrPlaceholder label="UPI not configured" />;
  }
  // "customUrl" has no companion URL field in the current template schema
  // (a pre-existing builder gap, not introduced here) — nothing to encode
  // either in design mode or with real invoice data.
  return <QrPlaceholder label="Custom URL not configured" />;
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

function LogoView({ context }: { context?: RenderContext }) {
  const src = field("business.logo", context);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- content is a user-provided/resolved arbitrary URL, not a local static asset
    return <img src={src} alt="" className="h-full w-full object-contain" />;
  }
  return <StructuralPlaceholder label="Logo" />;
}

function HeaderView({ context }: { context?: RenderContext }) {
  if (!context) return <StructuralPlaceholder label={STRUCTURAL_LABELS.header} />;
  return (
    <div className="flex h-full w-full flex-col justify-center">
      <div className="text-base font-bold">{field("business.name", context)}</div>
      <div className="text-xs uppercase tracking-widest text-zinc-500">Tax Invoice</div>
    </div>
  );
}

// Right-aligned label/value row shared by the Invoice Details, Tax Summary,
// Totals, and Payment Details blocks below. Renders nothing when the value
// is absent, so a block only shows the rows it actually has data for.
function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-2">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function BusinessDetailsView({ context }: { context?: RenderContext }) {
  if (!context) return <StructuralPlaceholder label={STRUCTURAL_LABELS.businessDetails} />;
  const name = field("business.name", context);
  const address = field("business.address", context);
  const gstin = field("business.gstin", context);
  const phone = field("business.phone", context);
  const email = field("business.email", context);
  const website = field("business.website", context);
  return (
    <div className="flex h-full w-full flex-col gap-0.5 text-xs leading-snug">
      {name && <div className="font-semibold">{name}</div>}
      {address && <div>{address}</div>}
      {gstin && <div>GSTIN: {gstin}</div>}
      {phone && <div>Phone: {phone}</div>}
      {email && <div>Email: {email}</div>}
      {website && <div>{website}</div>}
    </div>
  );
}

function CustomerDetailsView({ context }: { context?: RenderContext }) {
  if (!context) return <StructuralPlaceholder label={STRUCTURAL_LABELS.customerDetails} />;
  const name = field("customer.name", context);
  const company = field("customer.company", context);
  const address = field("customer.address", context);
  const shipping = field("customer.shipping_address", context);
  const gstin = field("customer.gstin", context);
  const phone = field("customer.phone", context);
  const email = field("customer.email", context);
  return (
    <div className="flex h-full w-full flex-col gap-0.5 text-xs leading-snug">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">Bill To</div>
      {name && <div className="font-semibold">{name}</div>}
      {company && <div>{company}</div>}
      {address && <div>{address}</div>}
      {gstin && <div>GSTIN: {gstin}</div>}
      {phone && <div>Phone: {phone}</div>}
      {email && <div>Email: {email}</div>}
      {shipping && shipping !== address && (
        <>
          <div className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">Ship To</div>
          <div>{shipping}</div>
        </>
      )}
    </div>
  );
}

function InvoiceDetailsView({ context }: { context?: RenderContext }) {
  if (!context) return <StructuralPlaceholder label={STRUCTURAL_LABELS.invoiceDetails} />;
  return (
    <div className="flex h-full w-full flex-col gap-0.5 text-xs leading-snug">
      <DetailRow label="Invoice #" value={field("invoice.number", context)} />
      <DetailRow label="Date" value={field("invoice.date", context)} />
      <DetailRow label="Due Date" value={field("invoice.due_date", context)} />
      <DetailRow label="Status" value={field("invoice.status", context)} />
    </div>
  );
}

function TaxSummaryView({ context }: { context?: RenderContext }) {
  if (!context) return <StructuralPlaceholder label={STRUCTURAL_LABELS.taxSummary} />;
  const isInterState = Number(context.totals.igst ?? "0") > 0;
  return (
    <div className="flex h-full w-full flex-col gap-0.5 text-xs leading-snug">
      <DetailRow label="Taxable Amount" value={field("totals.taxable_amount", context)} />
      {isInterState ? (
        <DetailRow label="IGST" value={field("totals.igst", context)} />
      ) : (
        <>
          <DetailRow label="CGST" value={field("totals.cgst", context)} />
          <DetailRow label="SGST" value={field("totals.sgst", context)} />
        </>
      )}
      <DetailRow label="Tax Total" value={field("totals.tax_total", context)} />
    </div>
  );
}

function TotalsView({ context }: { context?: RenderContext }) {
  if (!context) return <StructuralPlaceholder label={STRUCTURAL_LABELS.totals} />;
  const isInterState = Number(context.totals.igst ?? "0") > 0;
  const hasDiscount = Number(context.totals.discount ?? "0") > 0;
  const hasRoundOff = Number(context.totals.round_off ?? "0") !== 0;
  const hasPaid = Number(context.totals.paid ?? "0") > 0;
  return (
    <div className="flex h-full w-full flex-col gap-0.5 text-xs leading-snug">
      <DetailRow label="Subtotal" value={field("totals.subtotal", context)} />
      {hasDiscount && <DetailRow label="Discount" value={field("totals.discount", context)} />}
      {isInterState ? (
        <DetailRow label="IGST" value={field("totals.igst", context)} />
      ) : (
        <>
          <DetailRow label="CGST" value={field("totals.cgst", context)} />
          <DetailRow label="SGST" value={field("totals.sgst", context)} />
        </>
      )}
      {hasRoundOff && <DetailRow label="Round Off" value={field("totals.round_off", context)} />}
      <div className="mt-1 flex justify-between gap-2 border-t border-zinc-300 pt-1 font-semibold dark:border-zinc-700">
        <span>Grand Total</span>
        <span>{field("totals.grand_total", context)}</span>
      </div>
      {hasPaid && (
        <>
          <DetailRow label="Paid" value={field("totals.paid", context)} />
          <DetailRow label="Balance Due" value={field("totals.balance", context)} />
        </>
      )}
    </div>
  );
}

function PaymentDetailsView({ context }: { context?: RenderContext }) {
  if (!context) return <StructuralPlaceholder label={STRUCTURAL_LABELS.paymentDetails} />;
  const bankName = field("payment.bank_name", context);
  const account = field("payment.account_number", context);
  const ifsc = field("payment.ifsc", context);
  const upi = field("payment.upi", context);
  if (!bankName && !account && !ifsc && !upi) {
    return <StructuralPlaceholder label={STRUCTURAL_LABELS.paymentDetails} />;
  }
  return (
    <div className="flex h-full w-full flex-col gap-0.5 text-xs leading-snug">
      <DetailRow label="Bank" value={bankName} />
      <DetailRow label="Account #" value={account} />
      <DetailRow label="IFSC" value={ifsc} />
      <DetailRow label="UPI" value={upi} />
    </div>
  );
}

function SignatureView() {
  return (
    <div className="flex h-full w-full flex-col items-end justify-end text-xs">
      <div className="w-32 border-t border-zinc-400 pt-1 text-center text-zinc-600 dark:border-zinc-600 dark:text-zinc-400">
        Authorized Signatory
      </div>
    </div>
  );
}

function TermsView({ context }: { context?: RenderContext }) {
  const terms = context?.terms;
  if (!terms) return <StructuralPlaceholder label={STRUCTURAL_LABELS.terms} />;
  return (
    <div className="flex h-full w-full flex-col gap-1 text-xs leading-snug">
      <div className="font-semibold">Terms &amp; Conditions</div>
      <div className="whitespace-pre-wrap">{terms}</div>
    </div>
  );
}

function NotesView({ context }: { context?: RenderContext }) {
  const notes = context?.notes;
  if (!notes) return <StructuralPlaceholder label={STRUCTURAL_LABELS.notes} />;
  return (
    <div className="flex h-full w-full flex-col gap-1 text-xs leading-snug">
      <div className="font-semibold">Notes</div>
      <div className="whitespace-pre-wrap">{notes}</div>
    </div>
  );
}

function FooterView({ context }: { context?: RenderContext }) {
  if (!context) return <StructuralPlaceholder label={STRUCTURAL_LABELS.footer} />;
  return (
    <div className="flex h-full w-full items-center justify-center text-center text-[10px] text-zinc-400">
      This is a computer-generated invoice and does not require a physical signature.
    </div>
  );
}

export function ComponentContent({
  component,
  context,
  itemsTablePreviewRowCount,
  itemsTableShowHeader,
}: {
  component: ComponentNode;
  context?: RenderContext;
  itemsTablePreviewRowCount?: number;
  itemsTableShowHeader?: boolean;
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
      return <LogoView context={context} />;
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
          showHeader={itemsTableShowHeader}
        />
      );
    case "header":
      return <HeaderView context={context} />;
    case "businessDetails":
      return <BusinessDetailsView context={context} />;
    case "customerDetails":
      return <CustomerDetailsView context={context} />;
    case "invoiceDetails":
      return <InvoiceDetailsView context={context} />;
    case "taxSummary":
      return <TaxSummaryView context={context} />;
    case "totals":
      return <TotalsView context={context} />;
    case "paymentDetails":
      return <PaymentDetailsView context={context} />;
    case "signature":
      return <SignatureView />;
    case "terms":
      return <TermsView context={context} />;
    case "notes":
      return <NotesView context={context} />;
    case "footer":
      return <FooterView context={context} />;
    default:
      return <StructuralPlaceholder label={STRUCTURAL_LABELS[component.type] ?? component.type} />;
  }
}
