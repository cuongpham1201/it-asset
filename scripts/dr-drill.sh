#!/usr/bin/env bash
set -Eeuo pipefail

BUNDLE="${1:-}"
[[ -f "$BUNDLE/database.dump" ]] || { echo "Usage: ./scripts/dr-drill.sh <backup-directory>" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 1; }

BUNDLE="$(cd "$BUNDLE" && pwd)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
CONTAINER="assetflow-dr-drill-$STAMP"
VOLUME="assetflow_dr_drill_$STAMP"
PASSWORD="$(openssl rand -hex 24)"
STARTED="$(date +%s)"

cleanup(){ docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; docker volume rm "$VOLUME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

if [[ -f "$BUNDLE/manifest.txt" ]]; then
  expected="$(awk -F= '$1=="database_sha256"{print $2}' "$BUNDLE/manifest.txt")"
  actual="$(sha256sum "$BUNDLE/database.dump" | awk '{print $1}')"
  [[ -n "$expected" && "$actual" == "$expected" ]] || { echo "Backup checksum verification failed." >&2; exit 1; }
fi

docker volume create "$VOLUME" >/dev/null
docker run -d --name "$CONTAINER" -e POSTGRES_DB=assetflow_drill -e POSTGRES_USER=drill -e POSTGRES_PASSWORD="$PASSWORD" -v "$VOLUME:/var/lib/postgresql/data" postgres:16-alpine >/dev/null
for _ in $(seq 1 60); do docker exec "$CONTAINER" pg_isready -U drill -d assetflow_drill >/dev/null 2>&1 && break; sleep 1; done
docker exec "$CONTAINER" pg_isready -U drill -d assetflow_drill >/dev/null
docker cp "$BUNDLE/database.dump" "$CONTAINER:/tmp/database.dump"
docker exec "$CONTAINER" pg_restore --list /tmp/database.dump >/dev/null
docker exec "$CONTAINER" pg_restore -U drill -d assetflow_drill --no-owner --no-privileges --exit-on-error /tmp/database.dump
docker exec "$CONTAINER" psql -U drill -d assetflow_drill -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) AS applied_migrations FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL; SELECT COUNT(*) AS assets FROM assets; SELECT COUNT(*) AS users FROM users; SELECT COUNT(*) AS audit_events FROM audit_logs;"

ELAPSED="$(( $(date +%s)-STARTED ))"
echo "DR drill passed in ${ELAPSED}s using an isolated temporary PostgreSQL volume."
echo "Manually verify document count and application login in a quarterly full-stack drill."
