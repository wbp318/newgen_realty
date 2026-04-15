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

# Windows convenience scripts
start.bat   # starts both backend + frontend
stop.bat    # stops both
```

Backend: http://localhost:8000 | Frontend: http://localhost:3000

## Architecture

FastAPI backend + Next.js 16 frontend. SQLite locally, PostgreSQL in Docker. AI via Anthropic Claude sync client.

### Async/Sync Pattern (critical to understand)

Endpoints are `async def` and use `AsyncSession` for all database queries (`await db.execute(select(...))`). AI service functions (`services/`) are **sync** — they call the Anthropic sync client directly. FastAPI automatically runs sync functions in a threadpool when called from async endpoints, so this works without blocking. **Do not make AI service functions async** — they use the sync Anthropic client.

### AI Service Flow

```
Router (async) → gathers data from DB → calls sync service function → service calls assistant.chat() → parses response with regex → returns dict → router saves results to DB
```

The `AIAssistant` singleton in `services/ai_assistant.py` wraps the Anthropic client with lazy init, rate limiting (`UsageTracker`), and cost tracking. All other services (`listing_generator.py`, `comp_analyzer.py`, `comm_drafter.py`, `lead_scorer.py`, `property_matcher.py`, `prospect_scorer.py`, `outreach_generator.py`) call `assistant.chat()` with specialized system prompts from `prompts/`, then parse structured sections (e.g., `HEADLINE:`, `SCORE:`, `MATCH:`) from the response text using regex.

### Market Data Integration

`services/market_data.py` integrates with the Realty Mole Property API (via RapidAPI) for real comparable sales data. The `auto-comp-analysis` AI endpoint fetches market comps then feeds them into the AI comp analyzer. Market data functions are **sync** (same pattern as AI services). Falls back gracefully when `REALTY_MOLE_API_KEY` is not set.

### Prospecting Engine

`services/prospect_data.py` integrates with the ATTOM Data API for public property records. Searches for absentee owners, pre-foreclosures, tax delinquent, long-term owners, and vacant properties. Same sync pattern as `market_data.py` — sync httpx functions with `is_configured()` graceful fallback. The `_parse_prospect()` function normalizes ATTOM responses into the Prospect model format.

`services/prospect_scorer.py` — AI scores prospects 0-100 based on motivation signals (type 40%, equity 20%, timing 15%, condition 15%, data completeness 10%). Follows the `lead_scorer.py` pattern exactly.

`services/outreach_generator.py` — AI generates personalized outreach (email/letter/text) with tone adapted per prospect type. `PROSPECT_TYPE_CONTEXT` dict provides situation-specific guidance. Follows the `comm_drafter.py` pattern.

`services/compliance.py` — TCPA compliance enforcement: `check_contact_hours()` (8am-9pm in recipient timezone), `validate_outreach_compliance()` (consent, DNC, opt-out checks), `process_opt_out()` (10 business day window), `can_contact_via_medium()` (medium-specific rules).

### Database

Async SQLAlchemy 2.0. Engine created in `database.py`, sessions via `get_db()` dependency. Tables auto-created on startup via lifespan handler in `main.py`. Models: Property, Contact, Activity, Conversation, Prospect, ProspectList, OutreachCampaign, OutreachMessage — all use UUID string primary keys.

**Prospect** is separate from Contact — it represents a cold lead from public records. Prospects convert to Contacts via the `/convert` endpoint when qualified. Prospect has `motivation_signals` and `property_data` JSON columns for flexible data across different lead types, plus TCPA compliance fields (consent_status, dnc_checked, dnc_listed, opt_out_date).

### Frontend

Next.js 16 App Router with `"use client"` pages. All API calls go through `lib/api.ts` (axios, baseURL defaults to `localhost:8000`). Types in `lib/types.ts`. Path alias: `@/*` → `./src/*`. Tailwind v4 (no config file, uses defaults).

## Conventions

- All models use `String(36)` UUID primary keys with `default=lambda: str(uuid.uuid4())`
- Pydantic schemas use `class Config: from_attributes = True` for ORM mode
- Multi-state: supports Louisiana (parishes), Arkansas (counties), and Mississippi (counties) — state-specific legal frameworks, property considerations, and market context are in `prompts/system_prompts.py`. Frontend dynamically labels "Parish" vs "County" based on state.
- The `parish` DB column stores parish (LA) or county (AR/MS) — the field name is historical but works for all three states
- CORS only allows `http://localhost:3000`
- List endpoints support `limit`/`offset` pagination (default 50, max 200)
- Activity logging: contact/property updates and AI actions auto-create Activity records
- `last_contact_date` on Contact auto-updates when activities are created for that contact
- AI chat auto-persists conversations to the Conversation model with auto-titling from first message

## Environment Variables

Required: `ANTHROPIC_API_KEY`. Optional: `REALTY_MOLE_API_KEY` (for market data/comps — get from RapidAPI), `ATTOM_API_KEY` (for prospecting engine — get from attomdata.com). See `backend/.env.example`. Default DB is `sqlite+aiosqlite:///./newgen_realty.db`; docker-compose overrides to PostgreSQL (`asyncpg`). AI model configured via `AI_MODEL` setting (default: `claude-sonnet-4-20250514`). `SUPPORTED_STATES` defaults to `["LA", "AR", "MS"]`.
