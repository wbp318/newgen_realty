# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend
cd backend
python -m venv venv
source venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000 --no-server-header

# Frontend
cd frontend
npm install
npm run dev

# Docker (both services + PostgreSQL)
docker compose up --build

# Type check frontend
cd frontend && npx tsc --noEmit

# Verify backend imports
cd backend && python -c "from app.main import app"

# Verify all Python files parse
cd backend && python -c "import ast, os; [ast.parse(open(os.path.join(r,f)).read()) for r,d,fs in os.walk('app') for f in fs if f.endswith('.py')]"

# Windows convenience scripts
start.bat   # starts both backend + frontend (auto-creates venv, installs deps)
stop.bat    # stops both

# Run pentest suite (backend must be running)
cd pentest && pip install -r requirements.txt
python run_all.py                                    # all tests
python test_input_validation.py                      # single suite
python run_all.py --base-url http://other:8000       # remote target

# Run e2e suite (backend + frontend must be running; auto-falls-back to API-only if frontend is down)
cd e2e && python -m venv .venv && source .venv/Scripts/activate && pip install -r requirements.txt && playwright install chromium
./run_e2e.sh                                         # Git Bash — everything
./run_e2e.sh api/                                    # API-only, no browser
./run_e2e.sh -k prospect                             # pytest filter
.\run_e2e.ps1                                        # PowerShell equivalent
```

Backend: http://localhost:8000 | Frontend: http://localhost:3000 | API Docs: http://localhost:8000/docs

## Architecture

FastAPI backend + Next.js 16 frontend. SQLite locally, PostgreSQL in Docker. AI via Anthropic Claude sync client.

### Async/Sync Pattern (critical to understand)

Endpoints are `async def` and use `AsyncSession` for all database queries (`await db.execute(select(...))`). AI and external API service functions (`services/`) are **sync** — they call the Anthropic sync client or httpx directly. FastAPI automatically runs sync functions in a threadpool when called from async endpoints, so this works without blocking. **Do not make AI service functions async** — they use the sync Anthropic client.

### AI Service Flow

```
Router (async) → gathers data from DB → calls sync service function → service calls assistant.chat() → parses response with regex → returns dict → router saves results to DB
```

The `AIAssistant` singleton in `services/ai_assistant.py` wraps the Anthropic client with lazy init, rate limiting (`UsageTracker`), and cost tracking. The `chat()` method accepts an optional `model` parameter for per-call routing. All other services call `assistant.chat()` with specialized system prompts from `prompts/`, then parse structured sections (e.g., `HEADLINE:`, `SCORE:`, `MATCH:`) from the response text using regex.

### AI Model Split

Two models are used to balance quality and cost:
- **`AI_MODEL`** (Sonnet 4.6, default) — scoring, outreach, listings, comps, communications, matching. Quality-critical features.
- **`AI_MODEL_FAST`** (Haiku 4.5, default) — chat and dashboard insights. High-volume, speed-priority features.

Chat endpoint and dashboard insights pass `model=settings.AI_MODEL_FAST` to `assistant.chat()`. All other services use the default (Sonnet).

### External API Integrations

All follow the same pattern established by `services/market_data.py`: sync functions with `httpx.Client`, `is_configured()` check, graceful fallback when API key is not set.

- `services/market_data.py` — Realty Mole Property API (RapidAPI) for comparable sales
- `services/prospect_data.py` — ATTOM Data API for public property records, owner data, AVM estimates
- `services/skip_trace.py` — Pluggable skip tracing (free stub + BatchSkipTracing.com). Provider selected via `SKIP_TRACE_PROVIDER` config.
- `services/county_data.py` — Free county/parish portal scrapers for LA, AR, MS
- `services/email_sender.py` — Resend transactional email. Lazy-imports the SDK inside `send_email` so the backend boots without the library installed.
- `services/sms_sender.py` — Twilio SMS. Normalizes US numbers to E.164; lazy-imports the SDK.
- `services/geocoder.py` — OpenStreetMap Nominatim (free, no key). Enforces a 1.1s global throttle via a module-level lock; callers should expect ~1s per lookup. Per Nominatim ToS, send a descriptive `GEOCODE_USER_AGENT`. **Falls back progressively** when a full address doesn't resolve: `street+city+state+zip → city+state+zip → city+state → zip+state`. Returns the first match plus a `precision` field (`"street" | "locality" | "postal"`). This means rural addresses where OSM has no street-level data still pin at the town centroid instead of failing silently.

### Drip send engine

`services/scheduler.py` is an in-process APScheduler `AsyncIOScheduler` started in the FastAPI lifespan (`main.py`). Every `SCHEDULER_TICK_SECONDS`, `sweep_due_messages()` pulls `OutreachMessage` rows where `status='queued' AND scheduled_send_time <= now`, re-validates compliance via `compliance.can_contact_via_medium()`, and dispatches via `email_sender` or `sms_sender`.

- **Transient blocks** (outside contact hours, outside campaign `send_window_start`/`end`, daily cap hit) leave the message QUEUED — it will be retried next tick.
- **Permanent blocks** (DNC on phone/text, revoked consent, missing contact info) flip the message to FAILED with `last_error`.
- **Provider errors** increment `retry_count`; after `MAX_RETRIES=3` the message fails.
- On success: writes `provider`, `provider_message_id`, `sent_at`, bumps `campaign.sent_count`, and creates an Activity row.

Sequence config lives on `OutreachCampaign.sequence_config` as `[{step, day_offset, medium, tone_override}]`. `POST /api/outreach/campaigns/{id}/activate` expands it into per-prospect queued messages with `scheduled_send_time = now + day_offset` (idempotent via the `uq_message_campaign_prospect_step` constraint). `POST /pause` flips status but does not cancel queued messages. `POST /messages/{id}/send-now` force-dispatches a single message.

Inbound webhooks:
- `POST /api/outreach/webhooks/resend` — HMAC-verified (Svix-style) via `INBOUND_WEBHOOK_SECRET` when set, otherwise accepts (dev mode). Updates message status on delivered/opened/bounced/complained.
- `POST /api/outreach/webhooks/twilio` — delivery status callbacks + inbound SMS. STOP-keyword replies (`STOP`, `STOPALL`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT`) auto-revoke consent, set opt-out date, mark prospect do-not-contact, and cancel future queued SMS for that prospect.

Twilio webhooks require `python-multipart` (listed in `requirements.txt`) for form parsing.

### Geocoding + Farm Map

Both Prospect and Property have optional `latitude`/`longitude`/`geocoded_at` (Prospect uses `property_latitude`/`property_longitude`; Property uses `latitude`/`longitude`). Each entity has its own `_apply_geocode()` helper in its router and is geocoded on create AND on address-component change in update. Failures are silent — the row is still created, just without coordinates. Geocoding uses `services/geocoder.py` with the progressive fallback described above.

Backfill + geo endpoints exist for both entities:
- `POST /api/prospects/geocode-backfill?limit=N` and `POST /api/properties/geocode-backfill?limit=N` — fill missing coords; ~1s per row.
- `GET /api/prospects/geo` returns `ProspectGeoPoint[]` filtered by bounds, min_score, state, parish, status, and comma-separated types (max 10).
- `GET /api/properties/geo` returns `PropertyGeoPoint[]` filtered by bounds, state, parish, status, and comma-separated property types.
- The frontend's "Geocode missing" button calls `runGeocodeBackfill()` which hits both endpoints in parallel and merges the stats.

Frontend `/map` dynamically imports `components/map/ProspectMap.tsx` client-side (must be `ssr: false` because `leaflet` and `leaflet.heat` reference `window` at import time). The map renders **two layers** simultaneously:
- **Prospects** as `CircleMarker`s, colored by AI score (red ≥80, amber 60-79, yellow 40-59, blue <40)
- **Properties** as square markers via Leaflet `divIcon`, colored by status (emerald active, blue pending, purple sold, gray other)

Other features: basemap toggle (OSM street or Esri World Imagery satellite — both free, no API keys), heat overlay (prospects only), parish/county boundary overlay fetched from the static asset `frontend/public/parishes-la-ar-ms.geojson` (LA/AR/MS only, from Census TIGER FIPS-filtered data). Clicking a parish filters both layers to that parish via the `parish` query param. Auto-fits bounds to the loaded points on first render.

Three small helper components live in `ProspectMap.tsx` and matter for stability:
- `ResizeWatcher` — `ResizeObserver` on the map container that calls `map.invalidateSize()` when the parent resizes. Required because the map container is user-resizable (CSS `resize: both` on the panel frame).
- `CursorAnchoredZoom` — patches `map.zoomIn`/`map.zoomOut` so the +/- buttons and keyboard zoom toward the cursor (like Google Maps / ArcGIS) instead of the center. Wheel zoom is already cursor-anchored by Leaflet default.
- `HeatLayer` — defers `addTo(map)` via `requestAnimationFrame` until `map.getSize()` reports non-zero. The heat plugin's canvas would otherwise crash with "source height is 0" if mounted into a still-resizing flex parent.

### Prospecting Engine

The prospecting pipeline is the core differentiator:

```
ATTOM search → import prospects (deduplicate) → enrich → skip trace → AI score → AI outreach → campaigns → convert to contact
```

- **Prospect vs Contact**: Prospect is a cold lead from public records. Contact is an active CRM record. Prospects convert to Contacts via `POST /prospects/{id}/convert`.
- **Prospect types**: absentee_owner, pre_foreclosure, probate, long_term_owner, expired_listing, fsbo, vacant, tax_delinquent — each has an associated AI outreach tone.
- **AI tone mapping**: The outreach generator adapts tone per prospect type (empathetic for foreclosure, sensitive for probate, business-focused for absentee, etc.). Tone is defined in `PROSPECT_TYPE_CONTEXT` in `outreach_generator.py` and displayed in the frontend via `toneMap` in `prospects/[id]/page.tsx`.
- **TCPA compliance**: Every Prospect has consent_status, dnc_checked, dnc_listed, opt_out_date fields. `services/compliance.py` enforces contact hours (8am-9pm), validates outreach compliance, processes opt-outs (10 business day window). Outreach generation returns compliance flags.
- **JSON columns**: `motivation_signals` and `property_data` on Prospect use JSON for flexibility across lead types.

### Database

Async SQLAlchemy 2.0. Engine created in `database.py`, sessions via `get_db()` dependency. Tables auto-created on startup via lifespan handler in `main.py`.

Models: Property, Contact, Activity, Conversation, Prospect, ProspectList, OutreachCampaign, OutreachMessage — all use UUID string primary keys.

Activity model has `contact_id`, `property_id`, and `prospect_id` columns (all nullable) for linking to any entity.

`OutreachMessage` has a composite index on `(status, scheduled_send_time)` for the scheduler's hot sweep query and a unique constraint on `(campaign_id, prospect_id, sequence_step)` to make campaign activation idempotent.

**SQLite migrations**: Local dev uses `create_all` on startup, which **only creates missing tables — it does not add columns to existing ones**. When you add a column to an existing model, either delete `backend/newgen_realty.db` (loses local data) or run additive `ALTER TABLE` statements manually. Alembic is pinned in `requirements.txt` but not initialized yet.

### Frontend

Next.js 16 App Router with `"use client"` pages. All API calls go through `lib/api.ts` (axios, baseURL defaults to `localhost:8000` via `NEXT_PUBLIC_API_URL`). Types in `lib/types.ts`. Path alias: `@/*` → `./src/*`. Tailwind v4 (no `tailwind.config.js`).

Key pages: `/` (dashboard with pipeline funnel, top prospects, campaigns, hot leads), `/ai` (chat + listing gen + comm drafting), `/prospects` (list with bulk actions), `/prospects/search` (ATTOM search), `/prospects/[id]` (detail with scoring, outreach, enrichment), `/outreach` (campaign dashboard), `/outreach/[id]` (campaign detail with drip sequence builder + messages table), `/map` (Farm Map — both prospects and properties layered geographically).

#### Design system

`app/globals.css` defines a small, focused dark UI system. The single design move is a serif headline (DM Serif Display) against a calm dark slate UI; everything else is intentionally restrained. Don't use vanilla Tailwind colors (`bg-white`, `text-gray-500`, `border-gray-200`) on user-facing pages — they fight the dark surface. Use the system primitives instead:

- **Palette CSS variables** (set in `:root`, exposed to Tailwind via `@theme inline`): `--bg` (page) / `--bg-elevated` (cards) / `--bg-sidebar` / `--bg-input`; `--border` / `--border-soft`; `--text` / `--text-soft` / `--text-faded`; `--accent` (emerald-500) / `--accent-soft` / `--accent-deep`; `--hot` / `--warm` / `--cool` / `--info` / `--purple` for status hues.
- **Typography** loaded via `next/font` in `layout.tsx`: `--font-display` (DM Serif Display, used for page titles and panel headers — `font-display` class), `--font-sans` (Inter, default body), `--font-mono` (JetBrains Mono, used sparingly for timestamps).
- **Component utilities** — only what's needed:
  - `.panel` + `.panel-hover` — elevated dark surface with hairline border
  - `.btn-primary` (emerald) / `.btn-ghost` (subtle border) — buttons
  - `.field` — input/select with dark fill and accent-colored focus
  - `.tag` — small pill chip
  - `.link` — accent-colored link with underline-on-hover
  - `.hairline` — 1px divider in `--border`
- **Leaflet popups + scrollbars** are restyled in `globals.css` to match the dark palette.

The sidebar (`components/layout/Sidebar.tsx`) is sticky (`position: sticky; top: 0`) with a simple serif wordmark and calm nav rows; active route gets a 2px emerald left border + faint emerald tint. Pages should be wrapped in `<div className="max-w-[1400px] mx-auto">` for consistent measure.

#### Parish/County labeling

Multi-state support requires careful UI labeling: LA uses "Parish", AR/MS use "County". Pages that have access to a `state` field should switch dynamically: ``state === "LA" ? "Parish" : "County"``. Pages where state isn't known up front (generic placeholders, dashboard summaries) should use the combined string `"Parish/County"`. Don't hardcode "Parish" alone in user-facing copy.

## Conventions

- All models use `String(36)` UUID primary keys with `default=lambda: str(uuid.uuid4())`
- Pydantic schemas use `class Config: from_attributes = True` for ORM mode
- Multi-state: supports Louisiana (parishes), Arkansas (counties), and Mississippi (counties) — state-specific legal frameworks, property considerations, and market context are in `prompts/system_prompts.py`. UI labeling rules covered under Frontend → Parish/County labeling.
- The `parish` DB column stores parish (LA) or county (AR/MS) — the field name is historical but works for all three states
- CORS only allows `http://localhost:3000`
- List endpoints support `limit`/`offset` pagination (default 50, max 200)
- Activity logging: contact/property/prospect updates and AI actions auto-create Activity records
- `last_contact_date` on Contact auto-updates when activities are created for that contact
- AI chat auto-persists conversations to the Conversation model with auto-titling from first message
- Prospect scoring, outreach generation, and campaign insights use Sonnet; chat and dashboard use Haiku
- All labels must reference LA, AR, and MS — never "Louisiana only"
- Error responses must never leak raw exception details — return generic messages (e.g., "API error. Please try again later."), not `f"Error: {e}"`
- Batch endpoints must enforce size limits via Pydantic `Field(max_length=N)` or `Body(max_length=N)`
- Text search query params must have `max_length=100`
- No authentication yet — see `SECURITY.md` for pre-production checklist
- Pentest suite in `pentest/` — run after any security-related changes. Auth/IDOR tests auto-skip until auth is implemented.
- Scheduled messages must respect `contact_window_timezone` on Prospect (default America/Chicago) and the campaign's `send_window_start`/`send_window_end`, all within TCPA 8am–9pm recipient-local.
- Webhooks in dev: Twilio/Vapi/Resend need a public URL. Use ngrok or Cloudflare Tunnel; leave `INBOUND_WEBHOOK_SECRET` unset locally to accept unsigned events.

## Environment Variables

Required: `ANTHROPIC_API_KEY`. See `backend/.env.example` for all options.

Key optional vars:
- `REALTY_MOLE_API_KEY` — market comps (RapidAPI)
- `ATTOM_API_KEY` — prospecting engine (attomdata.com)
- `SKIP_TRACE_PROVIDER` / `SKIP_TRACE_API_KEY` — skip tracing (default: `free`)
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — email sending via Resend
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` — SMS via Twilio
- `INBOUND_WEBHOOK_SECRET` — HMAC secret for Resend/Twilio webhook signature verification (when unset, webhooks accept without validation — dev only)
- `SCHEDULER_ENABLED` (default: `true`), `SCHEDULER_TICK_SECONDS` (default: 60), `SCHEDULER_BATCH_SIZE` (default: 50)
- `DAILY_SEND_CAP_EMAIL` / `DAILY_SEND_CAP_SMS` — global daily caps (overridable per-campaign via `daily_send_cap`)
- `GEOCODE_PROVIDER` (default: `nominatim`), `GEOCODE_USER_AGENT` (required by Nominatim ToS)
- `AI_MODEL` — Sonnet for quality tasks (default: `claude-sonnet-4-6`)
- `AI_MODEL_FAST` — Haiku for speed tasks (default: `claude-haiku-4-5-20251001`)
- `DAILY_REQUEST_LIMIT` — AI requests per day (default: 100)
- Default DB is `sqlite+aiosqlite:///./newgen_realty.db`; docker-compose overrides to PostgreSQL (`asyncpg`).
