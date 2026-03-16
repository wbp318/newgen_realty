# NewGen Realty AI

AI-powered real estate platform built for Louisiana. Gives a solo agent the tools of a full brokerage — AI-generated listings, lead scoring, property matching, comp analysis, automated communications, and a smart dashboard — all tuned for Louisiana's unique market (parishes, Civil Law, redhibition, flood zones).

## Features

### AI-Powered Tools
- **AI Chat Assistant** — Louisiana-specific real estate advice powered by Claude
- **Listing Generator** — AI-written property descriptions with customizable tone (professional, luxury, casual, investor)
- **Comp Analysis** — Comparable sales pricing with suggested price ranges
- **Communication Drafter** — AI-drafted emails and texts for any client scenario (outreach, follow-up, offers, price reductions)
- **Lead Scoring** — AI analyzes contacts against your inventory and activity to score 0-100 with reasoning
- **Property Matching** — AI matches contacts to properties based on preferences, budget, and location
- **Dashboard Insights** — AI analyzes your entire portfolio and suggests actions

### CRM & Pipeline
- **Property Management** — Full CRUD with filtering by parish, status, type, price, beds, city
- **Contact Management** — Track leads, buyers, sellers with preferences, budgets, and parishes
- **Activity Timeline** — Log calls, emails, showings, notes — auto-tracks AI actions and updates
- **Conversation Persistence** — Chat history saved and resumable across sessions
- **Lead Score Badges** — Visual hot/warm/cool/cold indicators on contacts

### Louisiana-Specific
- Parish-based filtering and preferences (not counties)
- Louisiana Civil Law considerations in AI prompts
- Redhibition, homestead exemption, and flood zone awareness
- LA market-specific system prompts throughout

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI, SQLAlchemy 2.0 (async), Python 3.12+ |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| AI | Anthropic Claude API with usage tracking and rate limiting |
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

### Windows Quick Start

```bash
# After initial setup, just run:
start.bat       # Starts both backend and frontend
stop.bat        # Stops both
```

### Docker (requires virtualization enabled)

```bash
cp backend/.env.example backend/.env  # Add your ANTHROPIC_API_KEY
docker compose up --build
```

## API Endpoints

### Properties
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/properties` | List properties (filterable, paginated) |
| POST | `/api/properties` | Create property |
| GET | `/api/properties/{id}` | Get property detail |
| PUT | `/api/properties/{id}` | Update property |
| DELETE | `/api/properties/{id}` | Delete property |

### Contacts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts` | List contacts (filterable, paginated) |
| POST | `/api/contacts` | Create contact |
| GET | `/api/contacts/{id}` | Get contact detail |
| PUT | `/api/contacts/{id}` | Update contact |
| DELETE | `/api/contacts/{id}` | Delete contact |

### Activities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/activities` | List activities (filterable by contact/property) |
| POST | `/api/activities` | Create activity |
| GET | `/api/activities/{id}` | Get activity detail |
| DELETE | `/api/activities/{id}` | Delete activity |

### Conversations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List saved conversations |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/{id}` | Get conversation with messages |
| DELETE | `/api/conversations/{id}` | Delete conversation |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | Chat with AI assistant (auto-saves conversation) |
| POST | `/api/ai/generate-listing` | Generate listing description |
| POST | `/api/ai/analyze-comps` | Analyze comparable sales |
| POST | `/api/ai/draft-communication` | Draft email or text |
| POST | `/api/ai/score-lead` | AI lead scoring (0-100) |
| POST | `/api/ai/match-properties` | AI property-to-contact matching |
| GET | `/api/ai/dashboard-insights` | AI portfolio analysis |
| GET | `/api/ai/usage` | Daily usage stats and costs |
| GET | `/api/health` | Health check |

## Project Structure

```
backend/
  app/
    main.py              # FastAPI app, CORS, lifespan
    config.py            # Settings (pydantic-settings)
    database.py          # Async SQLAlchemy engine
    models/              # ORM models (Property, Contact, Activity, Conversation)
    schemas/             # Pydantic request/response schemas
    routers/             # API routes (properties, contacts, ai, activities, conversations)
    services/            # AI services (assistant, listing gen, comp analyzer, comm drafter, lead scorer, property matcher)
    prompts/             # Louisiana-specific system prompts and templates
frontend/
  src/
    app/                 # Next.js pages (dashboard, ai, properties, contacts + detail pages)
    components/
      layout/            # Sidebar navigation
      ui/                # Reusable components (LeadScoreBadge, StatusBadge, FilterBar, ActivityTimeline)
    lib/                 # API client (axios), TypeScript types
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | — | Your Anthropic API key |
| `DATABASE_URL` | No | `sqlite+aiosqlite:///./newgen.db` | Database connection string |
| `MAX_DAILY_REQUESTS` | No | `100` | Daily AI request limit |
| `MAX_TOKENS_CHAT` | No | `2048` | Max tokens for chat responses |
| `MAX_TOKENS_LISTING` | No | `1024` | Max tokens for listing generation |
| `MAX_TOKENS_ANALYSIS` | No | `2048` | Max tokens for analysis responses |

## License

Private — all rights reserved.
