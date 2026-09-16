import { test, expect } from "@playwright/test";
import { TEST_PREFIX } from "../helpers/constants";

test.describe("PDF preview/download (UI)", () => {
  test("the invoice detail page shows a live preview and a working Download PDF link", async ({ page, request }) => {
    const customer = await (
      await request.post("/api/v1/customers", { data: { name: `${TEST_PREFIX} PDF UI Co`, state: "Haryana", stateCode: "06" } })
    ).json();
    const template = await (
      await request.post("/api/v1/templates", { data: { name: `${TEST_PREFIX} PDF UI Template`, status: "ACTIVE" } })
    ).json();
    const invoice = await (
      await request.post("/api/v1/invoices", {
        data: { templateId: template.id, customerId: customer.id, items: [{ description: "Item", quantity: "1", rate: "100", gstRate: "18" }] },
      })
    ).json();
    await request.post(`/api/v1/invoices/${invoice.id}/issue`);

    await page.goto(`/invoices/${invoice.id}`);
    // The live preview pane renders the template through the same
    // MultiPageRenderer the PDF uses — its "page" surface should be visible.
    await expect(page.locator(".template-page").first()).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download PDF" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^INV-\d{4}-\d{4}\.pdf$/);
  });
});
