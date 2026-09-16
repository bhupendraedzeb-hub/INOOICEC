import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    // Phase 17: the invoice-numbering concurrency test hits the real dev
    // Postgres DB (via Prisma), so DATABASE_URL needs to be loaded — every
    // other existing test is a pure function with no DB dependency.
    setupFiles: ["dotenv/config"],
    // Vitest's default include glob (**/*.{test,spec}.*) would otherwise
    // also pick up the Playwright Test suite under tests/ (*.spec.ts) —
    // those import @playwright/test's own test()/expect() and run only via
    // `playwright test`, never Vitest. Unit tests stay co-located with
    // their source under src/ as *.test.ts.
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
