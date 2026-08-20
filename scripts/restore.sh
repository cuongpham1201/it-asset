#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUNDLE="${1:-}"
CONFIRM="${2:-}"

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

cleanup(){ docker compose exec -T postgres rm -f "$REMOTE_DUMP" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker compose up -d postgres
docker compose stop api web >/dev/null 2>&1 || true
docker compose cp "$BUNDLE/database.dump" "postgres:$REMOTE_DUMP"
docker compose exec -T postgres sh -ec "pg_restore --list '$REMOTE_DUMP' >/dev/null && pg_restore -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" --clean --if-exists --no-owner --no-privileges --exit-on-error '$REMOTE_DUMP'"

if [[ -d "$BUNDLE/documents" ]]; then
  docker compose run --rm --no-deps --entrypoint sh api -ec "find /var/lib/assetflow/documents -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +"
  docker compose create api >/dev/null
  docker compose cp "$BUNDLE/documents/." "api:/var/lib/assetflow/documents"
fi

docker compose up -d
docker compose ps
echo "Restore completed. Verify login, asset counts, attachments and audit history."
