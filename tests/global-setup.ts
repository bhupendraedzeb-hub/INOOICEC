import { execFileSync } from "node:child_process";

// Runs once before the whole suite — clears out any leftover "Playwright
// Test"-prefixed data from a previous run that crashed before its own
// teardown ran, so every run starts from a known-clean state. Shells out to
// tsx (see helpers/cleanup-runner.ts) rather than importing the Prisma
// client in-process, since Prisma 7's generated client is pure ESM and
// Playwright Test loads global-setup/teardown via a CJS transform.
export default function globalSetup() {
  execFileSync("pnpm", ["exec", "tsx", "tests/helpers/cleanup-runner.ts"], { stdio: "inherit", shell: true });
}
