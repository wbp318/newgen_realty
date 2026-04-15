# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend
cd backend
python -m venv venv
source venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

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
- **`AI_MODEL`** (Sonnet 4, default) — scoring, outreach, listings, comps, communications, matching. Quality-critical features.
- **`AI_MODEL_FAST`** (Haiku 4.5, default) — chat and dashboard insights. High-volume, speed-priority features.

Chat endpoint and dashboard insights pass `model=settings.AI_MODEL_FAST` to `assistant.chat()`. All other services use the default (Sonnet).

### External API Integrations

All follow the same pattern established by `services/market_data.py`: sync functions with `httpx.Client`, `is_configured()` check, graceful fallback when API key is not set.

- `services/market_data.py` — Realty Mole Property API (RapidAPI) for comparable sales
- `services/prospect_data.py` — ATTOM Data API for public property records, owner data, AVM estimates
- `services/skip_trace.py` — Pluggable skip tracing (free stub + BatchSkipTracing.com). Provider selected via `SKIP_TRACE_PROVIDER` config.
- `services/county_data.py` — Free county/parish portal scrapers for LA, AR, MS

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

### Frontend

Next.js 16 App Router with `"use client"` pages. All API calls go through `lib/api.ts` (axios, baseURL defaults to `localhost:8000`). Types in `lib/types.ts` (20+ interfaces). Path alias: `@/*` → `./src/*`. Tailwind v4 (no config file, uses defaults).

Key pages: `/` (dashboard with pipeline funnel, top prospects, campaigns, hot leads), `/ai` (chat + listing gen + comm drafting), `/prospects` (list with bulk actions), `/prospects/search` (ATTOM search), `/prospects/[id]` (detail with scoring, outreach, enrichment), `/outreach` (campaign dashboard), `/outreach/[id]` (campaign detail with messages).

## Conventions

- All models use `String(36)` UUID primary keys with `default=lambda: str(uuid.uuid4())`
- Pydantic schemas use `class Config: from_attributes = True` for ORM mode
- Multi-state: supports Louisiana (parishes), Arkansas (counties), and Mississippi (counties) — state-specific legal frameworks, property considerations, and market context are in `prompts/system_prompts.py`. Frontend dynamically labels "Parish" vs "County" based on state.
- The `parish` DB column stores parish (LA) or county (AR/MS) — the field name is historical but works for all three states
- CORS only allows `http://localhost:3000`
- List endpoints support `limit`/`offset` pagination (default 50, max 200)
- Activity logging: contact/property/prospect updates and AI actions auto-create Activity records
- `last_contact_date` on Contact auto-updates when activities are created for that contact
- AI chat auto-persists conversations to the Conversation model with auto-titling from first message
- Prospect scoring, outreach generation, and campaign insights use Sonnet; chat and dashboard use Haiku
- All labels must reference LA, AR, and MS — never "Louisiana only"

## Environment Variables

Required: `ANTHROPIC_API_KEY`. See `backend/.env.example` for all options.

Key optional vars:
- `REALTY_MOLE_API_KEY` — market comps (RapidAPI)
- `ATTOM_API_KEY` — prospecting engine (attomdata.com)
- `SKIP_TRACE_PROVIDER` / `SKIP_TRACE_API_KEY` — skip tracing (default: `free`)
- `AI_MODEL` — Sonnet for quality tasks (default: `claude-sonnet-4-20250514`)
- `AI_MODEL_FAST` — Haiku for speed tasks (default: `claude-haiku-4-5-20251001`)
- `DAILY_REQUEST_LIMIT` — AI requests per day (default: 100)
- Default DB is `sqlite+aiosqlite:///./newgen_realty.db`; docker-compose overrides to PostgreSQL (`asyncpg`).
