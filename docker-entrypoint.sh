#!/bin/sh
set -eu

node scripts/check-deployment.mjs

echo "⏳ Čekám na databázi..."
attempt=0
until printf 'SELECT 1;' | ./node_modules/.bin/prisma db execute --stdin --schema=prisma/schema.prisma >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "Database unavailable after 30 attempts" >&2
    exit 1
  fi
  echo "  Databáze není dostupná, čekám 2s..."
  sleep 2
done

echo "✅ Databáze dostupná"

node scripts/check-migration-safety.mjs

echo "🔄 Spouštím Prisma migrate deploy..."
./node_modules/.bin/prisma migrate deploy

echo "Ensuring the initial administrator exists..."
node scripts/ensure-admin.mjs

echo "🚀 Spouštím aplikaci..."
exec node server.js
