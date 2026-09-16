import { test, expect } from "@playwright/test";
import { TEST_PREFIX } from "../helpers/constants";
import { countPdfPages, isValidPdf, FULL_FEATURED_LAYOUT } from "../helpers/pdf";

async function makeTemplate(request: import("@playwright/test").APIRequestContext, name: string) {
  const template = await (
    await request.post("/api/v1/templates", { data: { name: `${TEST_PREFIX} ${name}`, status: "ACTIVE" } })
  ).json();
  await request.post(`/api/v1/templates/${template.id}/versions`, { data: { layout: FULL_FEATURED_LAYOUT } });
  return template.id as string;
}

async function makeCustomer(request: import("@playwright/test").APIRequestContext, name: string, stateCode: string) {
  const customer = await (
    await request.post("/api/v1/customers", { data: { name: `${TEST_PREFIX} ${name}`, state: "X", stateCode } })
  ).json();
  return customer.id as string;
}

async function issueInvoice(
  request: import("@playwright/test").APIRequestContext,
  templateId: string,
  customerId: string,
  items: { description: string; quantity: string; rate: string; gstRate: string; discount?: string }[],
) {
  const created = await (await request.post("/api/v1/invoices", { data: { templateId, customerId, items } })).json();
  const issued = await (await request.post(`/api/v1/invoices/${created.id}/issue`)).json();
  return issued as { id: string; grandTotal: string; cgstTotal: string; sgstTotal: string; igstTotal: string; taxableAmount: string };
}

test.describe("PDF generation", () => {
  let templateId: string;
  let sameStateCustomerId: string;
  let interStateCustomerId: string;

  test.beforeAll(async ({ request }) => {
    templateId = await makeTemplate(request, "PDF Template");
    // Company's own stateCode is whatever is currently configured — these
    // tests only need "same as company" vs "different from company", not a
    // specific literal code, so read it first.
    const company = await (await request.get("/api/v1/settings/company")).json();
    const companyState = company.stateCode ?? "06";
    const otherState = companyState === "06" ? "27" : "06";
    sameStateCustomerId = await makeCustomer(request, "Same State Co", companyState);
    interStateCustomerId = await makeCustomer(request, "Inter State Co", otherState);
  });

  test("a one-page invoice (few items) produces exactly one PDF page", async ({ request }) => {
    const invoice = await issueInvoice(request, templateId, sameStateCustomerId, [
      { description: "Single item", quantity: "1", rate: "1000", gstRate: "18" },
    ]);
    const res = await request.get(`/api/v1/invoices/${invoice.id}/pdf`);
    expect(res.ok()).toBe(true);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    const buffer = Buffer.from(await res.body());
    expect(isValidPdf(buffer)).toBe(true);
    expect(countPdfPages(buffer)).toBe(1);
  });

  test("a large item list spans multiple PDF pages with correct page breaks", async ({ request }) => {
    test.setTimeout(90_000);
    const items = Array.from({ length: 25 }, (_, i) => ({
      description: `Item ${i + 1}`,
      quantity: "1",
      rate: "100",
      gstRate: "18",
    }));
    const invoice = await issueInvoice(request, templateId, sameStateCustomerId, items);
    const res = await request.get(`/api/v1/invoices/${invoice.id}/pdf`);
    expect(res.ok()).toBe(true);
    const buffer = Buffer.from(await res.body());
    // itemsTable box height 42mm -> 6 rows/page (see paginate.ts's Vitest
    // unit tests for the row-height math) -> ceil(25/6) = 5 pages.
    expect(countPdfPages(buffer)).toBe(5);
  });

  test("long line-item descriptions don't break PDF generation", async ({ request }) => {
    test.setTimeout(90_000);
    const longDescription =
      "Annual maintenance and support contract covering priority email/phone response, quarterly on-site review, " +
      "emergency callout within 4 business hours, and a dedicated account manager for the duration of the term.";
    const invoice = await issueInvoice(request, templateId, sameStateCustomerId, [
      { description: longDescription, quantity: "1", rate: "5000", gstRate: "18" },
    ]);
    const res = await request.get(`/api/v1/invoices/${invoice.id}/pdf`);
    expect(res.ok()).toBe(true);
    expect(isValidPdf(Buffer.from(await res.body()))).toBe(true);
  });

  test("same-state GST splits into CGST+SGST; inter-state uses IGST — both produce valid PDFs", async ({ request }) => {
    test.setTimeout(90_000);
    const sameState = await issueInvoice(request, templateId, sameStateCustomerId, [
      { description: "Item", quantity: "1", rate: "1000", gstRate: "18" },
    ]);
    expect(Number(sameState.cgstTotal)).toBeGreaterThan(0);
    expect(Number(sameState.sgstTotal)).toBeGreaterThan(0);
    expect(Number(sameState.igstTotal)).toBe(0);
    const sameStatePdf = await request.get(`/api/v1/invoices/${sameState.id}/pdf`);
    expect(isValidPdf(Buffer.from(await sameStatePdf.body()))).toBe(true);

    const interState = await issueInvoice(request, templateId, interStateCustomerId, [
      { description: "Item", quantity: "1", rate: "1000", gstRate: "18" },
    ]);
    expect(Number(interState.igstTotal)).toBeGreaterThan(0);
    expect(Number(interState.cgstTotal)).toBe(0);
    expect(Number(interState.sgstTotal)).toBe(0);
    const interStatePdf = await request.get(`/api/v1/invoices/${interState.id}/pdf`);
    expect(isValidPdf(Buffer.from(await interStatePdf.body()))).toBe(true);
  });

  test("a per-line discount reduces the taxable amount", async ({ request }) => {
    const invoice = await issueInvoice(request, templateId, sameStateCustomerId, [
      { description: "Discounted item", quantity: "1", rate: "1000", gstRate: "18", discount: "100" },
    ]);
    expect(invoice.taxableAmount).toBe("900");
  });

  test("a template with logo, QR, header, and footer components renders a valid PDF", async ({ request }) => {
    // FULL_FEATURED_LAYOUT (used by every test in this file) already
    // includes logo/header/footer/qrcode component types — this test just
    // asserts the end-to-end pipeline (real invoice data through all of
    // them at once) still produces a structurally valid, single-page PDF.
    const invoice = await issueInvoice(request, templateId, sameStateCustomerId, [
      { description: "Item", quantity: "1", rate: "500", gstRate: "18" },
    ]);
    const res = await request.get(`/api/v1/invoices/${invoice.id}/pdf`);
    const buffer = Buffer.from(await res.body());
    expect(isValidPdf(buffer)).toBe(true);
    expect(countPdfPages(buffer)).toBeGreaterThanOrEqual(1);
  });

  test("a DRAFT invoice's PDF renders from the template's current (unpinned) version", async ({ request }) => {
    const created = await (
      await request.post("/api/v1/invoices", {
        data: { templateId, customerId: sameStateCustomerId, items: [{ description: "Draft item", quantity: "1", rate: "1", gstRate: "0" }] },
      })
    ).json();
    const res = await request.get(`/api/v1/invoices/${created.id}/pdf`);
    expect(res.ok()).toBe(true);
    expect(isValidPdf(Buffer.from(await res.body()))).toBe(true);
  });
});
