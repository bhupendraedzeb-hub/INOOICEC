import { test as setup, expect } from "@playwright/test";

const authFile = "tests/.auth/owner.json";

// Runs once before every other test (playwright.config.ts's "chromium"
// project depends on "setup") — logs in through the real login UI (not a
// raw API call) so the saved storage state is exactly what a real browser
// session produces, then every other spec reuses it via storageState.
setup("authenticate as OWNER", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@example.com");
  await page.getByLabel("Password").fill("changeme123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.context().storageState({ path: authFile });
});
