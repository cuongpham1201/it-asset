#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUNDLE="${1:-}"
CONFIRM="${2:-}"
COMPOSE_FILE="${ASSETFLOW_COMPOSE_FILE:-}"
DB_SERVICE="${ASSETFLOW_DB_SERVICE:-postgres}"
API_SERVICE="${ASSETFLOW_API_SERVICE:-api}"
WEB_SERVICE="${ASSETFLOW_WEB_SERVICE:-web}"

if [[ -z "$BUNDLE" || ! -f "$BUNDLE/database.dump" ]]; then
  echo "Usage: ./scripts/restore.sh <backup-directory> [--yes]" >&2
  exit 1
fi
if [[ -f "$BUNDLE/manifest.txt" ]]; then
  expected_sha="$(awk -F= '$1=="database_sha256"{print $2}' "$BUNDLE/manifest.txt")"
  actual_sha="$(sha256sum "$BUNDLE/database.dump" | awk '{print $1}')"
  [[ -n "$expected_sha" && "$actual_sha" == "$expected_sha" ]] || { echo "Backup checksum verification failed." >&2; exit 1; }
fi
if [[ "$CONFIRM" != "--yes" ]]; then
  read -r -p "Restore replaces the current AssetFlow database. Type RESTORE to continue: " answer
  [[ "$answer" == "RESTORE" ]] || { echo "Cancelled."; exit 1; }
fi

command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 1; }
BUNDLE="$(cd "$BUNDLE" && pwd)"
REMOTE_DUMP="/tmp/assetflow-restore-$$.dump"
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
"${COMPOSE[@]}" stop "$API_SERVICE" "$WEB_SERVICE" >/dev/null 2>&1 || true
"${COMPOSE[@]}" cp "$BUNDLE/database.dump" "$DB_SERVICE:$REMOTE_DUMP"
"${COMPOSE[@]}" exec -T "$DB_SERVICE" sh -ec "pg_restore --list '$REMOTE_DUMP' >/dev/null && pg_restore -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" --clean --if-exists --no-owner --no-privileges --exit-on-error '$REMOTE_DUMP'"

if [[ -d "$BUNDLE/documents" ]]; then
  "${COMPOSE[@]}" run --rm --no-deps --entrypoint sh "$API_SERVICE" -ec "find /var/lib/assetflow/documents -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +"
  "${COMPOSE[@]}" create "$API_SERVICE" >/dev/null
  "${COMPOSE[@]}" cp "$BUNDLE/documents/." "$API_SERVICE:/var/lib/assetflow/documents"
fi

"${COMPOSE[@]}" up -d
"${COMPOSE[@]}" ps
echo "Restore completed. Verify login, asset counts, attachments and audit history."
