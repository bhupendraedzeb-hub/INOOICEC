# Invoice Generator & Template Platform

Self-hosted invoice management platform. Not a SaaS product in the commercial sense — no subscriptions, template tiers, marketplace, or billing — but it is multi-tenant: public signup (`/signup`) creates a brand-new, fully isolated `Organization` per signup, and organizations never share data with one another. Within an organization, the OWNER/ADMIN can add more team members (`Settings > Team`).

See `agent/AGENTS.md` and `agent/PHASE.md` for the original product/technical specification and its Phase 0–19 V1 scope, and `plan.md` for the technical assessment, phased implementation plan, and Phase 20 (the post-V1 multi-tenancy addition) this project follows.

## Stack

Next.js (App Router) + TypeScript, PostgreSQL + Prisma, NextAuth.js (Credentials + database sessions), Playwright for PDF generation, Zod validation, decimal.js for money math. Full rationale in `plan.md`.

## Getting Started

```bash
pnpm install
pnpm exec playwright install chromium   # one-time browser download, needed for PDF generation
cp .env.example .env   # fill in DATABASE_URL, AUTH_SECRET, INTERNAL_RENDER_TOKEN_SECRET, etc.
pnpm prisma migrate dev
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Development

- `pnpm dev` — dev server
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm test` — unit tests (Vitest, co-located with source as `*.test.ts`)
- `pnpm test:e2e` (or `pnpm playwright test`) — integration/E2E/PDF tests (`tests/`); auto-boots the dev server, needs `DATABASE_URL` reachable. Test-created data is prefixed `"Playwright Test"` and cleaned up by global setup/teardown

## Current status

Phases 0-17 done: project scaffold, core foundation (auth, DB, audit log, API base), company settings, customers/products master data, the template data model, the visual drag-and-drop template builder, dynamic field binding, the invoice items table, the GST/calculation engine, full invoice creation & management (draft/issue/cancel/duplicate, atomic numbering, real line items rendering through the template preview), payment tracking (add/void payments, automatic paid/balance/status recomputation, overpayment guard), payment links (shareable payment-link generation, a generic idempotent inbound gateway webhook receiver, expiry/deactivation), PDF rendering (Playwright-backed `GET /api/v1/invoices/:id/pdf`, real logo/QR-code/business/customer/totals content on the template's structural blocks, multi-page pagination with repeated headers shared identically between the PDF and the live preview), the invoice dashboard (summary cards, filterable recent-invoices table, a fix so the time-dependent Overdue status never goes stale), REST API completeness (scoped `inv_live_...` API keys as a second auth path alongside the browser session, verified end-to-end — create/issue an invoice, record a payment, and download its PDF using only an API key, no session or direct DB access), outbound webhooks (HMAC-signed `invoice.*`/`payment.*` event delivery with retry/backoff and a manual replay UI, verified against a local receiver with independently-recomputed signatures), a security & audit hardening pass (secure headers, rate limiting extended to the whole API surface, input-validation gaps closed, audit/hard-delete/secrets posture reviewed and confirmed), and a full automated test suite (Vitest unit tests including a real concurrent-DB numbering-uniqueness test; 36 Playwright integration/E2E/PDF tests covering every API resource, auth/scoping, webhook delivery with signature verification, PDF page-count/GST/discount/logo/QR correctness, and full browser UI flows including a real dnd-kit drag-and-drop). Phase 18 (Deployment) done: a multi-stage `Dockerfile` (built on Playwright's own base image for pre-installed Chromium) with `output: "standalone"`, `docker-compose.yml` (app + Postgres, healthchecks, log rotation), migrate-on-start via `docker/entrypoint.sh`, an unauthenticated `/api/health` endpoint, and `docker/backup.sh`/`restore.sh` — see `DEPLOYMENT.md` for setup and an explicit note on what was and wasn't verified without a Docker daemon in this environment.

Phase 19 (Production Hardening) done: a full verification pass against the live dev server and a real local Postgres, with no application code changes needed — real STAFF-role 403s on OWNER/ADMIN-gated routes, real AuditLog rows inspected, 8 genuinely concurrent PDF generations, payment idempotency held under both sequential and true-concurrent duplicate inbound webhook replay, automatic webhook backoff observed firing on schedule without any manual replay, and the template-immutability guarantee independently confirmed at the DB, rendered-HTML, and actual-PDF-bytes level. See `plan.md`'s Phase 19 section for the full drill-by-drill writeup, including one recorded-but-unexplained oddity that didn't block anything.

This completes the full V1 roadmap (Phase 0–19). See `plan.md` for the full phase-by-phase roadmap and implementation notes. Outstanding before a real production launch: validating the Docker artifacts against an actual Docker daemon and HTTPS against a real domain/cert — neither was available in the environment this was built in.

Phase 20 (Multi-Tenant Organizations + Public Signup, post-V1) done: public `/signup` creates an isolated `Organization` per signup (never joins existing data), every business-data table is scoped by `organizationId`, and `Settings > Team` lets an OWNER/ADMIN add more users to their own organization — closing a real prior gap where the only way to create a non-seeded account was a raw DB script. A pre-existing, unrelated security bug was found and fixed along the way: API keys could previously bypass `roles`-gated routes (like API-key and webhook-endpoint management) entirely, since those routes declared no `scope` for the API-key check to run against. Verified live by signing up two real separate organizations and confirming neither can see or touch the other's customers/invoices/templates/API keys/webhook endpoints (404, not 403 — indistinguishable from non-existence), that each organization's invoice numbering is fully independent, and that a newly-added team member is scoped correctly. See `plan.md`'s Phase 20 section for the full writeup, including two additional real bugs the design/validation passes caught before they shipped (a per-organization invoice-numbering collision that would have been a production outage, and a pre-existing cross-org data leak on the invoice preview endpoint).
