import { printInternalRoute } from "@/lib/pdf/browser";

// Navigates Playwright's headless Chromium at the internal render route
// (src/app/internal/render-receipt/[receiptId]) and prints it to A4. Shares
// the same Chromium singleton as renderInvoicePdf (see lib/pdf/browser.ts).
export async function renderReceiptPdf(receiptId: string): Promise<Buffer> {
  return printInternalRoute(`/internal/render-receipt/${receiptId}`);
}
