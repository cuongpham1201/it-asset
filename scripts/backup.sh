#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${1:-$ROOT_DIR/backups}"
COMPOSE_FILE="${ASSETFLOW_COMPOSE_FILE:-}"
DB_SERVICE="${ASSETFLOW_DB_SERVICE:-postgres}"
API_SERVICE="${ASSETFLOW_API_SERVICE:-api}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BUNDLE="$OUTPUT_DIR/assetflow-$STAMP"
REMOTE_DUMP="/tmp/assetflow-$STAMP.dump"

command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 1; }
mkdir -p "$BUNDLE/documents"
cd "$ROOT_DIR"

if [[ -n "$COMPOSE_FILE" ]]; then
  COMPOSE_FILE="$(cd "$(dirname "$COMPOSE_FILE")" && pwd)/$(basename "$COMPOSE_FILE")"
  COMPOSE=(docker compose --project-directory "$(dirname "$COMPOSE_FILE")" -f "$COMPOSE_FILE")
else
  COMPOSE=(docker compose)
fi

cleanup(){ "${COMPOSE[@]}" exec -T "$DB_SERVICE" rm -f "$REMOTE_DUMP" >/dev/null 2>&1 || true; }
trap cleanup EXIT

"${COMPOSE[@]}" up -d "$DB_SERVICE"
"${COMPOSE[@]}" exec -T "$DB_SERVICE" sh -ec "pg_dump -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" --format=custom --no-owner --no-privileges --file='$REMOTE_DUMP' && pg_restore --list '$REMOTE_DUMP' >/dev/null"
"${COMPOSE[@]}" cp "$DB_SERVICE:$REMOTE_DUMP" "$BUNDLE/database.dump"

"${COMPOSE[@]}" create "$API_SERVICE" >/dev/null
"${COMPOSE[@]}" cp "$API_SERVICE:/var/lib/assetflow/documents/." "$BUNDLE/documents"

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
