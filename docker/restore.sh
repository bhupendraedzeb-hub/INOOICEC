#!/bin/sh
# Restores a gzip-compressed SQL dump (as produced by docker/backup.sh) into
# the running "postgres" compose service. DESTRUCTIVE: drops and recreates
# every object currently in the target database. Requires interactive
# confirmation unless --yes is passed.
#
# Usage: docker/restore.sh <backup-file.sql.gz> [--yes]
set -eu

cd "$(dirname "$0")/.."

BACKUP_FILE="${1:-}"
CONFIRM="${2:-}"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage: docker/restore.sh <backup-file.sql.gz> [--yes]" >&2
  echo "Error: backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

if [ -f .env ]; then
  # shellcheck disable=SC1091
  . ./.env
fi
POSTGRES_USER="${POSTGRES_USER:-invoice}"
POSTGRES_DB="${POSTGRES_DB:-invoice}"

if [ "$CONFIRM" != "--yes" ]; then
  printf 'This will PERMANENTLY REPLACE all data in database "%s". Type the database name to confirm: ' "$POSTGRES_DB"
  read -r TYPED
  if [ "$TYPED" != "$POSTGRES_DB" ]; then
    echo "Confirmation did not match. Aborting." >&2
    exit 1
  fi
fi

echo "Restoring ${BACKUP_FILE} into database '${POSTGRES_DB}' ..."

# Terminate other connections and drop/recreate the schema so the restore
# starts from a clean slate (pg_dump's default output is data+schema, not
# a full DROP DATABASE, so leftover objects not in the dump would survive
# otherwise).
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();"
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c \
  "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1

echo "Restore complete."
