import "dotenv/config";
import { cleanupTestData } from "./cleanup";
import { db } from "@/lib/db";

// Run via `pnpm exec tsx tests/helpers/cleanup-runner.ts`, never imported
// directly by Playwright's global-setup/teardown — Prisma 7's generated
// client is pure ESM (`import.meta.url` in client.ts), which Playwright
// Test's own CJS-targeted transform for config/support files can't load.
// tsx's loader handles it fine, so global-setup.ts/global-teardown.ts shell
// out to this script as a child process instead of importing it in-process.
cleanupTestData()
  .then(() => db.$disconnect())
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
