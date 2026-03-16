# NewGen Realty AI

AI-powered real estate platform for Louisiana.

## Architecture

- **Backend**: FastAPI (Python 3.12+) at `backend/` — async, SQLAlchemy 2.0, Anthropic Claude API
- **Frontend**: Next.js 16 (React 19, TypeScript, Tailwind CSS) at `frontend/`
- **Database**: SQLite (local dev) / PostgreSQL (Docker)
- **AI**: Anthropic Claude via `app/services/ai_assistant.py`, with daily usage tracking and rate limiting

## Running Locally

```bash
# Backend
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

Backend: http://localhost:8000 | Frontend: http://localhost:3000

## Running with Docker

Requires virtualization enabled in BIOS.

```bash
docker compose up --build
```

## Project Structure

```
backend/
  app/
    main.py              # FastAPI app, lifespan, CORS
    config.py            # Settings via pydantic-settings
    database.py          # Async SQLAlchemy engine + session
    models/              # SQLAlchemy ORM models (property, contact, conversation)
    schemas/             # Pydantic request/response schemas
    routers/             # API routes (properties, contacts, ai)
    services/            # AI assistant, listing gen, comp analysis, comm drafter
    prompts/             # System prompts and templates (Louisiana-specific)
frontend/
  src/
    app/                 # Next.js pages (dashboard, ai, properties, contacts)
    components/layout/   # Sidebar nav
    lib/                 # API client (axios), types
```

## Key API Endpoints

- `GET /api/health` — health check
- `GET/POST /api/properties` — CRUD for property listings
- `GET/POST /api/contacts` — CRUD for contacts/leads
- `POST /api/ai/chat` — chat with AI assistant
- `POST /api/ai/generate-listing` — AI listing description generator
- `POST /api/ai/analyze-comps` — comparable sales analysis
- `POST /api/ai/draft-communication` — draft emails/texts
- `GET /api/ai/usage` — daily AI usage stats

## Environment Variables

See `backend/.env.example`. Required: `ANTHROPIC_API_KEY`. Default DB is SQLite; docker-compose overrides to PostgreSQL.

## Conventions

- Backend uses async throughout (async def endpoints, AsyncSession)
- AI service functions are sync (use Anthropic sync client, FastAPI runs them in threadpool)
- All models use UUID primary keys
- Louisiana-specific: parishes instead of counties, LA-focused system prompts
