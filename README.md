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
- `pnpm test` — unit tests (Vitest; currently covers `fieldResolver`/`fieldRegistry`, growing through Phase 8/17)
- `pnpm playwright test` — integration/E2E/PDF tests (once added in Phase 17)

## Current status

Phases 0-13 done: project scaffold, core foundation (auth, DB, audit log, API base), company settings, customers/products master data, the template data model, the visual drag-and-drop template builder, dynamic field binding, the invoice items table, the GST/calculation engine, full invoice creation & management (draft/issue/cancel/duplicate, atomic numbering, real line items rendering through the template preview), payment tracking (add/void payments, automatic paid/balance/status recomputation, overpayment guard), payment links (shareable payment-link generation, a generic idempotent inbound gateway webhook receiver, expiry/deactivation), PDF rendering (Playwright-backed `GET /api/v1/invoices/:id/pdf`, real logo/QR-code/business/customer/totals content on the template's structural blocks, multi-page pagination with repeated headers shared identically between the PDF and the live preview), and the invoice dashboard (summary cards, filterable recent-invoices table, a fix so the time-dependent Overdue status never goes stale). See `plan.md` for the full phase-by-phase roadmap, current progress, and implementation notes — including a documented testing-tool limitation around palette drag-and-drop that's worth a manual check. Next up: Phase 14 (REST API completeness).
