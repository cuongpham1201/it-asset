#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${1:-$ROOT_DIR/backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BUNDLE="$OUTPUT_DIR/assetflow-$STAMP"
REMOTE_DUMP="/tmp/assetflow-$STAMP.dump"

command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 1; }
mkdir -p "$BUNDLE/documents"
cd "$ROOT_DIR"

cleanup(){ docker compose exec -T postgres rm -f "$REMOTE_DUMP" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker compose up -d postgres
docker compose exec -T postgres sh -ec "pg_dump -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" --format=custom --no-owner --no-privileges --file='$REMOTE_DUMP' && pg_restore --list '$REMOTE_DUMP' >/dev/null"
docker compose cp "postgres:$REMOTE_DUMP" "$BUNDLE/database.dump"

docker compose create api >/dev/null
docker compose cp "api:/var/lib/assetflow/documents/." "$BUNDLE/documents"

DB_SHA256="$(sha256sum "$BUNDLE/database.dump" | awk '{print $1}')"
cat > "$BUNDLE/manifest.txt" <<EOF
assetflow_backup_version=1
created_at_utc=$STAMP
database_format=postgresql_custom
database_sha256=$DB_SHA256
documents_included=true
EOF

echo "Backup completed: $BUNDLE"
echo "Keep .env and Docker secrets in a separate encrypted backup."
