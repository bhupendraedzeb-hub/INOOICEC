# syntax=docker/dockerfile:1

# ---- deps: install dependencies (cached separately from source changes) ---
FROM node:20-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.4.1 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- builder: generate the Prisma client and build the Next.js app --------
FROM node:20-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.4.1 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---- runner: lean production image -----------------------------------------
# Built on Playwright's own image (pinned to match package.json's `playwright`
# version exactly) rather than a bare Node image + apt-get — it already ships
# Chromium and every OS-level dependency the PDF pipeline
# (lib/pdf/printInvoice.ts) needs, with no version drift between the browser
# and the library driving it.
FROM mcr.microsoft.com/playwright:v1.63.0-noble AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Prisma's CLI is a devDependency (never imported by app code, so Next's
# output-file-tracing correctly excludes it from .next/standalone) — but
# `prisma migrate deploy` at container start (docker/entrypoint.sh) still
# needs it. A global npm install of just the CLI sidesteps trying to
# surgically extract it from the builder stage's pnpm store, which doesn't
# copy cleanly across stages due to pnpm's symlinked node_modules layout.
#
# prisma7.config.ts is auto-loaded by every `prisma` CLI invocation
# (confirmed via `prisma migrate deploy --help`, which loads it even for
# --help output) and it top-level `import`s "dotenv/config". Neither the
# global CLI install nor a bare COPY of pnpm's node_modules/dotenv (a
# symlink into .pnpm/, which would dangle here since the store itself isn't
# copied) provides that module, so install it directly as a real local
# package — the plain npm install below creates a real directory, not a
# pnpm-style symlink.
RUN npm install -g prisma@7.10.0 \
  && npm install --prefix /app --no-save --omit=dev dotenv@17.4.2

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma7.config.ts ./prisma7.config.ts
COPY docker/entrypoint.sh ./entrypoint.sh

# The base image's non-root `pwuser` already owns Chromium's install dir;
# reuse it instead of creating a new user, and hand it the app files too.
RUN chown -R pwuser:pwuser /app
USER pwuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["sh", "./entrypoint.sh"]
CMD ["node", "server.js"]
