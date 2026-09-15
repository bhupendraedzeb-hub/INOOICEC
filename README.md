# Invoice Generator & Template Platform

Private, self-hosted invoice management platform for internal business use. Not a SaaS product — no subscriptions, template tiers, marketplace, or tenant billing.

See `agent/AGENTS.md` and `agent/PHASE.md` for the full product/technical specification, and `plan.md` for the technical assessment and phased implementation plan (Phase 0–19) this project follows.

## Stack

Next.js (App Router) + TypeScript, PostgreSQL + Prisma, NextAuth.js (Credentials + database sessions), Playwright for PDF generation, Zod validation, decimal.js for money math. Full rationale in `plan.md`.

## Getting Started

```bash
pnpm install
cp .env.example .env   # fill in DATABASE_URL, AUTH_SECRET, etc.
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

Phases 0-10 done: project scaffold, core foundation (auth, DB, audit log, API base), company settings, customers/products master data, the template data model, the visual drag-and-drop template builder, dynamic field binding, the invoice items table, the GST/calculation engine, full invoice creation & management (draft/issue/cancel/duplicate, atomic numbering, real line items rendering through the template preview), and payment tracking (add/void payments, automatic paid/balance/status recomputation, overpayment guard). See `plan.md` for the full phase-by-phase roadmap, current progress, and implementation notes — including a documented testing-tool limitation around palette drag-and-drop that's worth a manual check. Next up: Phase 11 (Payment Links).
