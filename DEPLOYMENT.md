# Deployment

Self-hosted deployment via Docker Compose: an `app` container (Next.js standalone build + Playwright/Chromium for PDF rendering) and a `postgres` container, with migrations applied automatically on container start.

> **Not build/run-tested with a real Docker daemon.** No Docker installation was available in the environment these files were authored in. The `Dockerfile`, `docker-compose.yml`, and shell scripts below were reviewed line-by-line and their individual pieces verified where possible without Docker (see "What was and wasn't verified" at the end), but the full `docker compose up` path has not been exercised end-to-end. Validate a full build+boot+migrate cycle against a disposable database before relying on this in production.

## 1. Environment setup

```bash
cp .env.example .env
```

Fill in, at minimum:

- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` — credentials for the Postgres container. Pick a real password; there is no default.
- `AUTH_SECRET`, `INTERNAL_RENDER_TOKEN_SECRET`, `INBOUND_WEBHOOK_SECRET` — generate each with `openssl rand -base64 32`. These gate session signing, the internal PDF-render route, and the inbound payment-gateway webhook receiver respectively; do not reuse one value across them or across environments.
- `AUTH_URL` — the public URL the app will be reached at (e.g. `https://invoices.example.com`), needed for correct auth callback/cookie behavior behind a reverse proxy.
- `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` — the initial `OWNER` account created by `prisma/seed.ts`. There is no in-app account-creation or password-reset flow (out of V1 scope), so this is the only way to set a real initial password — override the defaults before seeding a real deployment.
- `WEBHOOK_DEFAULT_SIGNING_SECRET` — optional fallback signing secret for outbound webhooks; per-endpoint secrets set in the Webhooks settings UI take precedence.

Leave `DATABASE_URL` as-is — `docker-compose.yml` overrides it at container start to point at the `postgres` service (`postgres`, not `localhost`; inside the compose network, `localhost` from the `app` container's perspective is the `app` container itself, not the database).

## 2. Build and start

```bash
docker compose up -d --build
```

This builds the multi-stage `Dockerfile` (`deps` → `builder` → `runner`, the runner based on Playwright's own official image so Chromium and its OS dependencies are already present) and starts both services. `app` waits for `postgres`'s healthcheck (`pg_isready`) before starting.

On every container start, `docker/entrypoint.sh` runs `prisma migrate deploy` against the already-committed migrations in `prisma/migrations/` before launching the server — it only applies existing migrations, never generates new ones. If this fails, the container exits before serving traffic; check `docker compose logs app`.

Watch startup:

```bash
docker compose logs -f app
```

## 3. Health check

```bash
curl http://localhost:3000/api/health
# {"status":"ok","db":"connected","timestamp":"..."}
```

This endpoint is deliberately unauthenticated and outside `/api/v1` (not rate-limited or session-gated) so it can be used by the Docker `HEALTHCHECK` directive, a reverse proxy's upstream check, or an external uptime monitor. A `503` with `"db":"unreachable"` means the app can't reach Postgres — check `docker compose ps` and `postgres`'s logs.

## 4. Reverse proxy / HTTPS

The app container only serves plain HTTP on port 3000 (`APP_PORT` in `.env`, default `3000`). Put a TLS-terminating reverse proxy in front of it in production — this repo doesn't bundle one, since the right choice (and certificate/domain setup) is deployment-specific. A minimal example with [Caddy](https://caddyserver.com/) (automatic HTTPS via Let's Encrypt):

```caddyfile
invoices.example.com {
	reverse_proxy localhost:3000
}
```

Run Caddy directly on the host, or add it as another `docker-compose.yml` service on the same network as `app` if you prefer everything containerized. Either way, set `AUTH_URL` in `.env` to the proxied HTTPS URL, not `http://localhost:3000`.

## 5. Backup and restore

`docker/backup.sh` and `docker/restore.sh` wrap `pg_dump`/`psql` run *inside* the `postgres` container via `docker compose exec`, so the host doesn't need Postgres client tools installed — only Docker and this repo checked out.

```bash
# Backup (writes ./backups/<db>_<UTC-timestamp>.sql.gz)
docker/backup.sh
docker/backup.sh /path/to/other/backup/dir

# Restore (DESTRUCTIVE — drops and recreates every object in the target database)
docker/restore.sh ./backups/invoice_20260916T120000Z.sql.gz
```

`restore.sh` requires typing the database name to confirm (or pass `--yes` to skip, for scripted/automated restores where you've already confirmed out-of-band). It terminates other connections, drops and recreates the `public` schema, then replays the dump.

Run backups on a schedule with host cron, e.g.:

```cron
0 2 * * * cd /path/to/invoice && ./docker/backup.sh >> /var/log/invoice-backup.log 2>&1
```

The `pg_dump`/`psql` invocations and the drop-schema-then-restore sequence these scripts use were verified directly against a real local Postgres 17 instance (dumping the dev database into a scratch database and confirming matching table/row counts) — only the `docker compose exec` wrapper itself is untested, since Docker wasn't available in the authoring environment.

## 6. Log rotation

Both services use Docker's own `json-file` logging driver with `max-size: 10m` / `max-file: 5` (see `docker-compose.yml`), capping each container's logs at ~50MB total rather than growing unbounded. The app logs structured JSON to stdout via pino (`LOG_LEVEL` in `.env`); no in-app file-based log rotation is needed or implemented.

For centralized/long-term log retention beyond what Docker keeps locally, point your platform's log shipper (e.g. a `docker` logging driver plugin, or an agent tailing `docker compose logs`) at these containers — not covered here, as it's infrastructure-specific.

## 7. Monitoring

- **Uptime**: point an external monitor (or the reverse proxy's own health-check feature) at `GET /api/health` on an interval (e.g. every 1–5 min); alert on non-200 or connection failure.
- **Container health**: `docker compose ps` shows each service's healthcheck status directly (`postgres`'s `pg_isready` check, `app`'s `/api/health` check baked into both `docker-compose.yml` and the `Dockerfile`'s `HEALTHCHECK`).
- **Logs**: `docker compose logs -f app` / `docker compose logs -f postgres` for live tailing; audit-relevant application events are also recorded in the `AuditLog` table, queryable directly via `psql` if needed.

## What was and wasn't verified

Verified in this environment (no Docker daemon available):

- `pnpm build` with `output: "standalone"` succeeds; `.next/standalone/server.js` runs and correctly serves auth-protected and public routes (confirmed via direct `node server.js` + `curl`, not through Docker).
- `argon2`'s native addon is correctly traced into the standalone build output for the build platform; the Linux build will trace its own platform's prebuilt binary the same way inside the real Docker build.
- `GET /api/health` returns the expected `200`/`ok` shape against a live Postgres connection.
- The `pg_dump`/gzip/`DROP SCHEMA CASCADE`/`psql` restore sequence in `docker/backup.sh` and `docker/restore.sh`, run directly against local Postgres binaries against a scratch database (not through `docker compose exec`, since Docker isn't available here) — table count and a spot-checked row count matched exactly between source and restored databases.
- A `Dockerfile` bug was found and fixed during authoring: `prisma7.config.ts` (Prisma's own generated config file) is unconditionally auto-loaded by every `prisma` CLI invocation regardless of `--schema`/`--config` flags, and it `import`s `dotenv/config` at the top level. The runner stage's global `npm install -g prisma` has no `node_modules` of its own to resolve that import from, which would otherwise crash `prisma migrate deploy` at every container start. Fixed by also running `npm install --prefix /app --no-save dotenv@17.4.2` in the runner stage (a plain local install, not a copy of pnpm's symlinked `node_modules/dotenv`, which would dangle since the `.pnpm` store isn't copied across stages).

Not verified (no Docker daemon in the authoring environment) — validate before relying on this in production:

- A full `docker compose build && docker compose up` cycle: image builds succeeding, both services reaching a healthy state, `entrypoint.sh`'s `prisma migrate deploy` actually succeeding inside the real container.
- The Playwright/Chromium PDF pipeline running inside the container (dependent on the base image's bundled Chromium actually matching the pinned `playwright` npm version at runtime).
- `docker/backup.sh` / `docker/restore.sh` specifically through `docker compose exec` (the underlying SQL/pg_dump commands were verified directly, as above, but not this wrapper).
