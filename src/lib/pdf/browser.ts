import { chromium, type Browser } from "playwright";

// A long-lived, lazily-launched Chromium instance reused across every PDF
// request — both invoice and receipt printing (plan.md's flagged
// mitigation for Playwright's per-instance memory footprint: "reuse one
// long-lived browser instance with per-request pages"). Stored on
// globalThis for the same reason db.ts's PrismaClient is — so Next dev's
// hot-reload doesn't leak a new browser process on every edit, and so a
// second print*.ts module never launches a second Chromium instance.
const globalForBrowser = globalThis as unknown as { pdfBrowser?: Promise<Browser> };

export function getBrowser(): Promise<Browser> {
  if (!globalForBrowser.pdfBrowser) {
    globalForBrowser.pdfBrowser = chromium.launch();
  }
  return globalForBrowser.pdfBrowser;
}

// Shared by renderInvoicePdf/printReceipt: opens a page, navigates to an
// internal token-gated render route, prints to A4, closes the page (not the
// browser) when done. Margins are zero deliberately — the template's own
// page.marginXMm is already baked into TemplateRenderer's padding, so a
// nonzero browser print margin would double it up.
export async function printInternalRoute(path: string): Promise<Buffer> {
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const token = process.env.INTERNAL_RENDER_TOKEN_SECRET;
  if (!token) throw new Error("INTERNAL_RENDER_TOKEN_SECRET is not configured");

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const url = `${baseUrl}${path}?token=${encodeURIComponent(token)}`;
    const response = await page.goto(url, { waitUntil: "networkidle" });
    if (!response || !response.ok()) {
      throw new Error(`Internal render route returned ${response?.status() ?? "no response"}`);
    }
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
  } finally {
    await page.close();
  }
}
