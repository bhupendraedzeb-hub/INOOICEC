#!/bin/sh
# Dumps the running "postgres" compose service to a gzip-compressed,
# timestamped SQL file. Runs pg_dump *inside* the postgres container (via
# `docker compose exec`) so the host doesn't need Postgres client tools
# installed — only Docker itself.
#
# Usage: docker/backup.sh [output-dir]   (default: ./backups)
set -eu

cd "$(dirname "$0")/.."

OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"

if [ -f .env ]; then
  # shellcheck disable=SC1091
  . ./.env
fi
POSTGRES_USER="${POSTGRES_USER:-invoice}"
POSTGRES_DB="${POSTGRES_DB:-invoice}"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="${OUT_DIR}/${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

echo "Backing up database '${POSTGRES_DB}' to ${OUT_FILE} ..."
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges \
  | gzip -9 > "$OUT_FILE"

echo "Backup complete: ${OUT_FILE} ($(du -h "$OUT_FILE" | cut -f1))"
