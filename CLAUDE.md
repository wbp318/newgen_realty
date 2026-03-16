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

The `AIAssistant` singleton in `services/ai_assistant.py` wraps the Anthropic client with lazy init, rate limiting (`UsageTracker`), and cost tracking. All other services (`listing_generator.py`, `comp_analyzer.py`, `comm_drafter.py`, `lead_scorer.py`, `property_matcher.py`) call `assistant.chat()` with specialized system prompts from `prompts/`, then parse structured sections (e.g., `HEADLINE:`, `SCORE:`, `MATCH:`) from the response text using regex.

### Database

Async SQLAlchemy 2.0. Engine created in `database.py`, sessions via `get_db()` dependency. Tables auto-created on startup via lifespan handler in `main.py`. Models: Property, Contact, Activity, Conversation — all use UUID string primary keys.

### Frontend

Next.js 16 App Router with `"use client"` pages. All API calls go through `lib/api.ts` (axios, baseURL defaults to `localhost:8000`). Types in `lib/types.ts`. Path alias: `@/*` → `./src/*`. Tailwind v4 (no config file, uses defaults).

## Conventions

- All models use `String(36)` UUID primary keys with `default=lambda: str(uuid.uuid4())`
- Pydantic schemas use `class Config: from_attributes = True` for ORM mode
- Louisiana-specific throughout: parishes (not counties), Civil Law, redhibition, flood zones, homestead exemption — these are baked into system prompts in `prompts/system_prompts.py`
- CORS only allows `http://localhost:3000`
- List endpoints support `limit`/`offset` pagination (default 50, max 200)
- Activity logging: contact/property updates and AI actions auto-create Activity records
- `last_contact_date` on Contact auto-updates when activities are created for that contact
- AI chat auto-persists conversations to the Conversation model with auto-titling from first message

## Environment Variables

Required: `ANTHROPIC_API_KEY`. See `backend/.env.example`. Default DB is `sqlite+aiosqlite:///./newgen.db`; docker-compose overrides to PostgreSQL (`asyncpg`). AI model configured via `AI_MODEL` setting (default: `claude-sonnet-4-20250514`).
