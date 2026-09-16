// Counts physical pages in a raw PDF buffer by counting `/Type /Page`
// objects (excluding `/Type /Pages`, the page-tree node) — the same
// technique used to manually verify Phase 12's pagination, avoiding a new
// PDF-parsing dependency for what's ultimately a simple structural check.
export function countPdfPages(buffer: Buffer): number {
  const text = buffer.toString("latin1");
  const matches = text.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

export function isValidPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}

export const FULL_FEATURED_LAYOUT = {
  page: { size: "A4", orientation: "portrait", marginTopMm: 15, marginRightMm: 15, marginBottomMm: 15, marginLeftMm: 15 },
  components: [
    { id: "logo", type: "logo", x: 0, y: 0, width: 30, height: 15, locked: false, visible: true, zIndex: 1, props: {} },
    { id: "hdr", type: "header", x: 35, y: 0, width: 145, height: 15, locked: false, visible: true, zIndex: 1, props: {} },
    { id: "biz", type: "businessDetails", x: 0, y: 18, width: 90, height: 25, locked: false, visible: true, zIndex: 1, props: {} },
    { id: "cust", type: "customerDetails", x: 95, y: 18, width: 85, height: 25, locked: false, visible: true, zIndex: 1, props: {} },
    { id: "inv", type: "invoiceDetails", x: 0, y: 45, width: 180, height: 15, locked: false, visible: true, zIndex: 1, props: {} },
    {
      id: "items",
      type: "itemsTable",
      x: 0,
      y: 62,
      width: 180,
      height: 42,
      locked: false,
      visible: true,
      zIndex: 1,
      props: {
        repeatHeaderOnEachPage: true,
        columns: [
          { key: "index", label: "#", widthPercent: 6, align: "left" },
          { key: "description", label: "Description", widthPercent: 44, align: "left" },
          { key: "qty", label: "Qty", widthPercent: 10, align: "right" },
          { key: "rate", label: "Rate", widthPercent: 15, align: "right" },
          { key: "gstPercent", label: "GST", widthPercent: 10, align: "right" },
          { key: "amount", label: "Amount", widthPercent: 15, align: "right" },
        ],
      },
    },
    { id: "taxsum", type: "taxSummary", x: 0, y: 106, width: 90, height: 20, locked: false, visible: true, zIndex: 1, props: {} },
    { id: "tot", type: "totals", x: 95, y: 106, width: 85, height: 30, locked: false, visible: true, zIndex: 1, props: {} },
    { id: "qr", type: "qrcode", x: 0, y: 128, width: 25, height: 25, locked: false, visible: true, zIndex: 1, props: { source: "upi" } },
    { id: "paydet", type: "paymentDetails", x: 30, y: 128, width: 70, height: 25, locked: false, visible: true, zIndex: 1, props: {} },
    { id: "sig", type: "signature", x: 140, y: 128, width: 40, height: 25, locked: false, visible: true, zIndex: 1, props: {} },
    { id: "terms", type: "terms", x: 0, y: 158, width: 90, height: 20, locked: false, visible: true, zIndex: 1, props: {} },
    { id: "notes", type: "notes", x: 95, y: 158, width: 85, height: 20, locked: false, visible: true, zIndex: 1, props: {} },
    { id: "footer", type: "footer", x: 0, y: 255, width: 180, height: 10, locked: false, visible: true, zIndex: 1, props: {} },
  ],
};
