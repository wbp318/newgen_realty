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
  local path="$1"
  local expected="${2:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}${path}")
  code="${code:-000}"
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
check "/docs"
check "/openapi.json"

echo
echo "Read-only list endpoints"
check "/api/prospects?limit=3"
check "/api/contacts?limit=3"
check "/api/properties?limit=3"
check "/api/activities?limit=3"
check "/api/outreach/campaigns?limit=3"

echo
echo "Status / config endpoints (touch code paths edited in recent cleanup)"
check "/api/prospects/status"
check "/api/prospects/geo"

echo
if [ "$fail" -eq 0 ]; then
  echo "All checks passed."
  exit 0
else
  echo "One or more checks failed."
  exit 1
fi
