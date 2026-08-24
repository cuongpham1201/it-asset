#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${ASSETFLOW_URL:-}"
BASE_URL="${BASE_URL%/}"
PROVIDER="${DIRECTORY_PROVIDER:-}"
USERNAME="${ASSETFLOW_ADMIN_USER:-admin}"
[[ -n "$BASE_URL" && "$PROVIDER" =~ ^(M365|LDAP)$ ]] || { echo "Set ASSETFLOW_URL and DIRECTORY_PROVIDER=M365|LDAP." >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq is required to encode login credentials safely." >&2; exit 1; }
if [[ -z "${ASSETFLOW_ADMIN_PASSWORD:-}" ]]; then read -r -s -p "AssetFlow admin password: " ASSETFLOW_ADMIN_PASSWORD; echo; fi

COOKIE_FILE="$(mktemp)"
trap 'rm -f "$COOKIE_FILE"' EXIT
login_payload="$(jq -n --arg username "$USERNAME" --arg password "$ASSETFLOW_ADMIN_PASSWORD" '{username:$username,password:$password}')"
curl --fail-with-body --silent --show-error -c "$COOKIE_FILE" -H 'content-type: application/json' -H "origin: $BASE_URL" --data "$login_payload" "$BASE_URL/api/v1/auth/login" >/dev/null
echo "Testing saved $PROVIDER configuration..."
curl --fail-with-body --silent --show-error -b "$COOKIE_FILE" -H "origin: $BASE_URL" -X POST "$BASE_URL/api/v1/directory/configs/$PROVIDER/test"
echo
if [[ "${DIRECTORY_RUN_SYNC:-false}" = "true" ]]; then
  echo "Running explicit synchronization..."
  curl --fail-with-body --silent --show-error -b "$COOKIE_FILE" -H "origin: $BASE_URL" -X POST "$BASE_URL/api/v1/directory/configs/$PROVIDER/sync"
  echo
else
  echo "Connection test passed. Set DIRECTORY_RUN_SYNC=true to run an audited sync after reviewing mappings."
fi
