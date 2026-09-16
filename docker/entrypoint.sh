#!/bin/sh
# Runs once every time the app container starts, before the server —
# plan.md's "migrate-deploy on container start." `migrate deploy` (never
# `migrate dev`, which is interactive and unsafe here) only applies
# already-committed migrations; it never generates new ones.
set -e

echo "Running database migrations..."
prisma migrate deploy --schema=./prisma/schema.prisma

echo "Starting application..."
exec "$@"
