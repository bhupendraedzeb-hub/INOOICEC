import { defineConfig, devices } from "@playwright/test";

// Phase 17 integration/E2E/PDF suite (plan.md's designated tool for this,
// alongside Vitest for pure unit tests). Runs against a real dev server +
// the real dev Postgres DB — there's no separate test-DB/CI infrastructure
// yet (that's Phase 18's concern) — so tests are sequential (workers: 1,
// fullyParallel: false) to avoid interference between tests that share
// global list/dashboard state, and every test-created entity uses a
// "Playwright Test" name prefix so it's identifiable and safe to clean up.
export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  globalSetup: "./tests/global-setup.ts",
  globalTeardown: "./tests/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "tests/.auth/owner.json" },
      dependencies: ["setup"],
    },
  ],
});
