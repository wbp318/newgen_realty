#!/usr/bin/env bash
# smoke_test.sh — quick health check for the newgen_realty backend.
#
# Usage:
#   ./smoke_test.sh                       # hits http://127.0.0.1:8000
#   BASE_URL=http://127.0.0.1:8765 ./smoke_test.sh
#
# Assumes the backend is already running (e.g. via `uvicorn app.main:app --port 8000`
# or `start.bat`). Non-zero exit if any critical endpoint fails.

set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
fail=0

check() {
  local label="$1"
  local path="$2"
  local expected="${3:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}${path}" || echo "000")
  if [ "$code" = "$expected" ]; then
    printf "  OK   %-40s %s\n" "$path" "$code"
  else
    printf "  FAIL %-40s got %s, expected %s\n" "$path" "$code" "$expected"
    fail=1
  fi
}

echo "Smoke test against ${BASE_URL}"
echo

echo "Static + OpenAPI"
check "docs"              "/docs"
check "openapi"           "/openapi.json"

echo
echo "Read-only list endpoints"
check "prospects list"    "/api/prospects?limit=3"
check "contacts list"     "/api/contacts?limit=3"
check "properties list"   "/api/properties?limit=3"
check "activities list"   "/api/activities?limit=3"
check "campaigns list"    "/api/outreach/campaigns?limit=3"

echo
echo "Status / config endpoints (touch code paths edited in recent cleanup)"
check "prospects status"  "/api/prospects/status"
check "prospects geo"     "/api/prospects/geo"

echo
if [ "$fail" -eq 0 ]; then
  echo "All checks passed."
  exit 0
else
  echo "One or more checks failed."
  exit 1
fi
