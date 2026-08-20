#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ] && { [ -n "${DATABASE_PASSWORD_FILE:-}" ] || [ -n "${DATABASE_PASSWORD:-}" ]; }; then
  if [ -n "${DATABASE_PASSWORD_FILE:-}" ] && [ ! -r "$DATABASE_PASSWORD_FILE" ]; then
    echo "AssetFlow: database password file is not readable" >&2
    exit 1
  fi
  if [ -n "${DATABASE_PASSWORD_FILE:-}" ]; then database_password="$(cat "$DATABASE_PASSWORD_FILE")"; else database_password="$DATABASE_PASSWORD"; fi
  encoded_password="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$database_password")"
  encoded_user="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "${DATABASE_USER:-assetflow}")"
  encoded_database="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "${DATABASE_NAME:-assetflow}")"
  export DATABASE_URL="postgresql://${encoded_user}:${encoded_password}@${DATABASE_HOST:-postgres}:${DATABASE_PORT:-5432}/${encoded_database}"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "AssetFlow: DATABASE_URL, DATABASE_PASSWORD, or DATABASE_PASSWORD_FILE is required" >&2
  exit 1
fi

echo "AssetFlow: applying forward-only Prisma migrations"
node /app/node_modules/prisma/build/index.js migrate deploy --schema /app/apps/api/prisma/schema.prisma

echo "AssetFlow: starting API"
exec node /app/apps/api/dist/main.js
