#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${1:-${ASSETFLOW_URL:-}}"
[[ "$BASE_URL" =~ ^https:// ]] || { echo "Usage: ./scripts/security-smoke.sh https://assetflow.example.com" >&2; exit 1; }
headers="$(curl --fail --silent --show-error -D - -o /dev/null "$BASE_URL/")"
grep -qi '^strict-transport-security:' <<<"$headers" || { echo "Missing HSTS" >&2; exit 1; }
grep -qi '^x-content-type-options: *nosniff' <<<"$headers" || { echo "Missing nosniff" >&2; exit 1; }
grep -qi '^x-frame-options: *DENY' <<<"$headers" || { echo "Missing frame protection" >&2; exit 1; }
code="$(curl --silent --output /dev/null --write-out '%{http_code}' "$BASE_URL/api/v1/assets")"
[[ "$code" = "401" ]] || { echo "Unauthenticated assets endpoint returned $code, expected 401" >&2; exit 1; }
code="$(curl --silent --output /dev/null --write-out '%{http_code}' "$BASE_URL/api/docs")"
[[ "$code" = "404" ]] || { echo "Swagger appears exposed in production (HTTP $code)" >&2; exit 1; }
echo "Security smoke checks passed. This is not a substitute for an authenticated independent penetration test."
