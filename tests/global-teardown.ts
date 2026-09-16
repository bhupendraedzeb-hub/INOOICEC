import { execFileSync } from "node:child_process";

export default function globalTeardown() {
  execFileSync("pnpm", ["exec", "tsx", "tests/helpers/cleanup-runner.ts"], { stdio: "inherit", shell: true });
}
