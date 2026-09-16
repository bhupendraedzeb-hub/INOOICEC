// Pure constant, deliberately with no imports — every spec file needs this,
// but must NOT transitively pull in @/lib/db (Prisma 7's generated client
// is pure ESM and breaks under Playwright Test's own CJS transform for
// spec/support files; only tsx-run scripts, e.g. cleanup-runner.ts, may
// import it).
export const TEST_PREFIX = "Playwright Test";
