import { test, expect } from "@playwright/test";
import { TEST_PREFIX } from "../helpers/constants";

test.describe("Invoice lifecycle (UI)", () => {
  let customerName: string;
  let templateName: string;

  test.beforeAll(async ({ request }) => {
    customerName = `${TEST_PREFIX} UI Lifecycle Co`;
    templateName = `${TEST_PREFIX} UI Lifecycle Template`;
    await request.post("/api/v1/customers", { data: { name: customerName, state: "Haryana", stateCode: "06" } });
    await request.post("/api/v1/templates", { data: { name: templateName, status: "ACTIVE" } });
  });

  test("create a draft via the form, issue it, and record a payment — status badges update at each step", async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto("/invoices/new");
    // Neither <select> has a proper <label for>/id association in this UI,
    // so they're targeted positionally: Template is first, Customer second.
    await page.locator("select").nth(0).selectOption({ label: templateName });
    await page.locator("select").nth(1).selectOption({ label: customerName });

    await page.getByPlaceholder("Item description").fill(`${TEST_PREFIX} Lifecycle Item`);
    const itemRow = page.locator("table tbody tr").first();
    const numberInputs = itemRow.locator("td").nth(5).locator("input"); // Rate column
    await numberInputs.fill("1000");
    const gstInput = itemRow.locator("td").nth(7).locator("input"); // GST % column
    await gstInput.fill("18");

    await expect(page.getByText("Grand Total")).toBeVisible();
    await page.getByRole("button", { name: "Save Draft" }).click();

    await expect(page).toHaveURL(/\/invoices\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { name: "Edit Draft Invoice" })).toBeVisible();

    // e.g. "ISSUED · UNPAID · Customer: ..." — matched as a whole, not a
    // loose substring, since "UNPAID"/"PARTIALLY_PAID" both contain "PAID"
    // and would otherwise satisfy a naive /PAID/ check at every step.
    const statusLine = page.getByText(/Customer:/);
    await page.getByRole("button", { name: "Issue" }).click();
    await expect(statusLine).toHaveText(/^ISSUED · UNPAID · Customer:/);

    // The amount field is pre-filled with the full balance due, so issuing
    // the payment is just clicking the button.
    await page.getByRole("button", { name: "Add Payment" }).click();
    await expect(statusLine).toHaveText(/^ISSUED · PAID · Customer:/);
    await expect(page.getByText("Balance: 0")).toBeVisible();
  });
});
