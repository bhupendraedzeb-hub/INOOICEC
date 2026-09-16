import { test, expect } from "@playwright/test";

test.describe("Dashboard (UI)", () => {
  test("summary cards and the filterable recent-invoices table render", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // "Paid"/"Unpaid"/"Overdue" etc. each appear three times on this page
    // (summary card, filter tab, table column header) — scope to the card
    // grid specifically rather than a page-wide text search.
    const cardGrid = page.locator("div.grid").first();
    for (const label of ["Total Invoices", "Total Invoiced", "Paid", "Unpaid", "Partially Paid", "Overdue"]) {
      await expect(cardGrid.getByText(label, { exact: true })).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: "Recent Invoices" })).toBeVisible();

    // Filter tabs navigate via ?filter= and the active one is visually
    // distinct — assert on the URL, which is the actual state that matters.
    await page.getByRole("link", { name: "Overdue", exact: true }).click();
    await expect(page).toHaveURL(/\?filter=overdue/);

    await page.getByRole("link", { name: "All", exact: true }).click();
    await expect(page).toHaveURL(/\?filter=all/);
  });
});
