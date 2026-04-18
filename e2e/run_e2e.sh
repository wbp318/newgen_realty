#!/usr/bin/env bash
# run_e2e.sh — run the E2E suite against an already-running backend + frontend.
#
# Usage:
#   ./run_e2e.sh                    # run everything
#   ./run_e2e.sh api/               # just the API tests
#   ./run_e2e.sh -m api             # pytest marker filter
#   API_BASE_URL=http://... ./run_e2e.sh
#
# This script deliberately does NOT start or stop the dev servers — it assumes
# `start.bat` (or equivalent) is already running. That keeps the runner fast
# and avoids the process-lifecycle quirks that tend to bite Windows.

set -u

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$here"

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:8000}"
WEB_BASE_URL="${WEB_BASE_URL:-http://localhost:3000}"

check_url() {
  local url="$1"
  curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000"
}

echo "E2E runner"
echo "  API: $API_BASE_URL"
echo "  Web: $WEB_BASE_URL"
echo

api_code=$(check_url "${API_BASE_URL}/api/health")
if [ "$api_code" != "200" ]; then
  echo "Backend is not responding on ${API_BASE_URL}/api/health (got ${api_code})."
  echo "Start it first: cd backend && uvicorn app.main:app --reload --port 8000"
  exit 2
fi
echo "  backend OK"

# Frontend check is best-effort — if unreachable we still run API-only tests.
web_code=$(check_url "${WEB_BASE_URL}")
if [ "$web_code" = "000" ] || [ "$web_code" -ge "500" ]; then
  echo "  frontend unreachable (got ${web_code}) — running API tests only."
  pytest_args=("api/")
else
  echo "  frontend OK"
  pytest_args=()
fi

export API_BASE_URL WEB_BASE_URL

if [ "$#" -gt 0 ]; then
  pytest_args=("$@")
fi

echo
exec pytest "${pytest_args[@]}"
