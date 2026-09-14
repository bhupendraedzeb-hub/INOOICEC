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
- `pnpm vitest` — unit tests (once added in Phase 8)
- `pnpm playwright test` — integration/E2E/PDF tests (once added in Phase 17)

## Current status

Phases 0-4 done: project scaffold, core foundation (auth, DB, audit log, API base), company settings, customers/products master data, and the template data model (Template/TemplateVersion, immutable versioning, JSON schema + Zod validation, metadata CRUD UI). See `plan.md` for the full phase-by-phase roadmap, current progress, and implementation notes. Next up: Phase 5 (Visual Template Builder).
