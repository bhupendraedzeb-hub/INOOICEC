# Invoice Generator & Template Platform

Private, self-hosted invoice management platform for internal business use. Not a SaaS product — no subscriptions, template tiers, marketplace, or tenant billing.

See `agent/AGENTS.md` and `agent/PHASE.md` for the full product/technical specification, and `plan.md` for the technical assessment and phased implementation plan (Phase 0–19) this project follows.

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

Phases 0-17 done: project scaffold, core foundation (auth, DB, audit log, API base), company settings, customers/products master data, the template data model, the visual drag-and-drop template builder, dynamic field binding, the invoice items table, the GST/calculation engine, full invoice creation & management (draft/issue/cancel/duplicate, atomic numbering, real line items rendering through the template preview), payment tracking (add/void payments, automatic paid/balance/status recomputation, overpayment guard), payment links (shareable payment-link generation, a generic idempotent inbound gateway webhook receiver, expiry/deactivation), PDF rendering (Playwright-backed `GET /api/v1/invoices/:id/pdf`, real logo/QR-code/business/customer/totals content on the template's structural blocks, multi-page pagination with repeated headers shared identically between the PDF and the live preview), the invoice dashboard (summary cards, filterable recent-invoices table, a fix so the time-dependent Overdue status never goes stale), REST API completeness (scoped `inv_live_...` API keys as a second auth path alongside the browser session, verified end-to-end — create/issue an invoice, record a payment, and download its PDF using only an API key, no session or direct DB access), outbound webhooks (HMAC-signed `invoice.*`/`payment.*` event delivery with retry/backoff and a manual replay UI, verified against a local receiver with independently-recomputed signatures), a security & audit hardening pass (secure headers, rate limiting extended to the whole API surface, input-validation gaps closed, audit/hard-delete/secrets posture reviewed and confirmed), and a full automated test suite (Vitest unit tests including a real concurrent-DB numbering-uniqueness test; 36 Playwright integration/E2E/PDF tests covering every API resource, auth/scoping, webhook delivery with signature verification, PDF page-count/GST/discount/logo/QR correctness, and full browser UI flows including a real dnd-kit drag-and-drop). See `plan.md` for the full phase-by-phase roadmap, current progress, and implementation notes. Next up: Phase 18 (Deployment).
