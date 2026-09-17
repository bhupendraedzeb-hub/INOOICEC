import { printInternalRoute } from "@/lib/pdf/browser";

// Navigates Playwright's headless Chromium at the internal render route
// (src/app/internal/render/[invoiceId]) and prints it to A4.
export async function renderInvoicePdf(invoiceId: string): Promise<Buffer> {
  return printInternalRoute(`/internal/render/${invoiceId}`);
}
