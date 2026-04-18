# End-to-end tests

Python + pytest + httpx for the backend API flows, plus Playwright for the
browser UI. Sits alongside `smoke_test.sh` (which is a 5-second "is anything
alive" check) — this suite actually exercises the workflows you'd click through
by hand: create a prospect, activate a campaign, drop a STOP into the Twilio
webhook and confirm the opt-out propagated, etc.

## Layout

```
e2e/
├── api/                       # httpx → backend workflow tests
│   ├── test_health.py
│   ├── test_prospects_workflow.py
│   ├── test_outreach_workflow.py
│   ├── test_compliance_workflow.py
│   └── test_contacts_properties.py
├── ui/                        # Playwright → frontend page tests
│   ├── conftest.py
│   ├── test_navigation.py
│   ├── test_prospects_ui.py
│   └── test_outreach_ui.py
├── conftest.py                # shared fixtures, factories, cleanup
├── pytest.ini
├── requirements.txt
├── run_e2e.sh / run_e2e.ps1   # readiness check + pytest invocation
└── .env.e2e.example
```

## One-time setup

```bash
cd e2e
python -m venv .venv
source .venv/Scripts/activate     # Windows Git Bash
pip install -r requirements.txt
playwright install chromium       # ~150 MB, one time only
```

Optional: `cp .env.e2e.example .env.e2e` and edit if your ports differ.

## Running

The suite assumes the backend is on `:8000` and the frontend on `:3000`.
Start them first (in a separate shell):

```bash
./start.bat        # from repo root — launches both
```

Then from the `e2e/` directory:

```bash
./run_e2e.sh                     # everything (API + UI)
./run_e2e.sh api/                # API-only (no browser)
./run_e2e.sh -k prospect         # any pytest filter
pytest -v -m api                 # direct pytest also works
```

Windows PowerShell:

```powershell
.\run_e2e.ps1
.\run_e2e.ps1 api/
```

If the frontend isn't running, the runner auto-falls-back to API tests only.

## Markers

- `api` — backend workflow tests, no browser required.
- `ui` — Playwright browser tests.
- `ai` — **skipped** unless `ANTHROPIC_API_KEY` is set in `.env.e2e` or the
  environment. These actually hit Claude and cost money; opt in explicitly.
- `slow` — reserved for tests that exceed a few seconds.

## What the factories do

`make_prospect`, `make_campaign`, `make_contact`, and `make_prospect_list`
are function-scoped fixtures that create rows via the real API and delete
them in teardown. Every row gets a UUID-tagged name/address so tests don't
collide when run in parallel or back-to-back.

Campaigns have no DELETE endpoint, so the teardown just calls `/pause` on
them — they accumulate in the dev DB but stop firing messages. If the dev
DB gets too cluttered, delete `backend/newgen_realty.db` and restart.

## Using a separate test DB

Recommended if you don't want test rows to mix with your dev data:

```bash
# Start backend pointed at a test SQLite file.
cd backend
DATABASE_URL="sqlite+aiosqlite:///./e2e_test.db" uvicorn app.main:app --reload --port 8000
```

Then run the suite normally. When you're done, delete `backend/e2e_test.db`
to reset.

## Known gotchas

- **send-now without credentials.** `test_send_now_updates_message_status`
  accepts `failed` as a valid outcome, because Resend/Twilio aren't configured
  in dev. It's still useful — it proves the dispatch path runs end-to-end and
  mutates the message row.
- **AI tests.** Skipped by default. They're marked `@pytest.mark.ai` and only
  run when `ANTHROPIC_API_KEY` is set. Be aware: each call costs real tokens.
- **The scheduler tick.** We don't wait for `sweep_due_messages()` to fire
  naturally (60s default). Instead, we use `/messages/{id}/send-now` which
  triggers the same dispatch path synchronously.
- **Frontend console errors.** `ui/conftest.py` fails any UI test that emits a
  console error. Add `@pytest.mark.allow_console_errors` to opt out on a
  per-test basis if a test legitimately expects one.
