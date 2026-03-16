# NewGen Realty AI

AI-powered real estate platform built for Louisiana. Manage properties, contacts, and leverage AI to generate listing descriptions, analyze comparable sales, and draft client communications.

## Features

- **AI Chat Assistant** — Louisiana-specific real estate advice powered by Claude
- **Listing Generator** — AI-written property descriptions with customizable tone
- **Comp Analysis** — Comparable sales analysis with suggested pricing
- **Communication Drafter** — AI-drafted emails and texts for clients
- **Property Management** — Full CRUD for property listings
- **Contact Management** — Track leads, buyers, sellers, and agents
- **Usage Tracking** — Daily AI request limits and cost estimates

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI, SQLAlchemy 2.0 (async), Python 3.12+ |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| AI | Anthropic Claude API |
| Database | SQLite (local) / PostgreSQL (Docker) |
| Infra | Docker Compose |

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
# Clone
git clone https://github.com/wbp318/newgen_realty.git
cd newgen_realty

# Backend
cd backend
cp .env.example .env          # Add your ANTHROPIC_API_KEY
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** and you're in.

### Docker (requires virtualization enabled)

```bash
cp backend/.env.example backend/.env  # Add your ANTHROPIC_API_KEY
docker compose up --build
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET/POST | `/api/properties` | List / create properties |
| GET/PUT/DELETE | `/api/properties/{id}` | Get / update / delete property |
| GET/POST | `/api/contacts` | List / create contacts |
| GET/PUT/DELETE | `/api/contacts/{id}` | Get / update / delete contact |
| POST | `/api/ai/chat` | Chat with AI assistant |
| POST | `/api/ai/generate-listing` | Generate listing description |
| POST | `/api/ai/analyze-comps` | Analyze comparable sales |
| POST | `/api/ai/draft-communication` | Draft email/text |
| GET | `/api/ai/usage` | Daily usage stats |

## Project Structure

```
backend/
  app/
    main.py            # FastAPI app, CORS, lifespan
    config.py          # Settings (pydantic-settings)
    database.py        # Async SQLAlchemy engine
    models/            # ORM models
    schemas/           # Pydantic schemas
    routers/           # API routes
    services/          # AI services
    prompts/           # System prompts & templates
frontend/
  src/
    app/               # Next.js pages
    components/        # UI components
    lib/               # API client, types
```

## License

Private — all rights reserved.
