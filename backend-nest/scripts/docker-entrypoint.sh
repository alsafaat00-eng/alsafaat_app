#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set."
  echo "On Railway: Create → Database → PostgreSQL, then on this service Variables add:"
  echo "  DATABASE_URL = \${{Postgres.DATABASE_URL}}"
  exit 1
fi

echo "Waiting for database..."
i=0
until npx prisma migrate deploy; do
  i=$((i + 1))
  if [ "$i" -ge 12 ]; then
    echo "ERROR: prisma migrate deploy failed after retries."
    exit 1
  fi
  echo "Database not ready yet (attempt $i/12). Retrying in 5s..."
  sleep 5
done

echo "Starting NestJS API..."
exec node dist/main.js
