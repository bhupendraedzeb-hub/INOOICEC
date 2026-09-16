import { test, expect } from "@playwright/test";

// Overrides the "chromium" project's storageState (the logged-in OWNER
// session) with a clean slate — this file is specifically testing the
// login flow itself, so it must start unauthenticated.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Login (UI)", () => {
  test("valid credentials redirect to the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("owner@example.com");
    await page.getByLabel("Password").fill("changeme123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("invalid credentials show a generic error and stay on the login page", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("owner@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  });

  test("an unauthenticated visitor is redirected away from a protected page", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
