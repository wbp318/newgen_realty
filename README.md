# NewGen Realty AI

AI-powered real estate platform for Louisiana, Arkansas, and Mississippi. Gives a solo agent the tools of a full brokerage — AI prospecting from public records, AI-scored leads, personalized outreach, listing generation, comp analysis, lead scoring, property matching, and a smart dashboard — all tuned for the unique markets of LA, AR, and MS.

## Features

### AI Prospecting Engine
- **Public Record Search** — Search ATTOM Data API for motivated sellers: absentee owners, pre-foreclosures, tax delinquent, long-term owners, vacant properties
- **AI Prospect Scoring** — Claude scores each prospect 0-100 based on motivation signals, equity position, market timing, and data completeness
- **AI Outreach Generation** — Personalized emails, letters, and texts tailored to each prospect's situation (empathetic for foreclosure, sensitive for probate, business-focused for absentee)
- **Outreach Campaigns** — Create campaigns, assign prospect lists, bulk-generate AI messages, track delivery and responses
- **TCPA Compliance** — Consent tracking, DNC list checking, contact hours enforcement (8am-9pm), opt-out processing (10 business days)
- **Prospect Pipeline** — Track prospects from discovery through conversion to CRM contacts

### AI-Powered Tools
- **AI Chat Assistant** — State-specific real estate advice powered by Claude
- **Listing Generator** — AI-written property descriptions with customizable tone (professional, luxury, casual, investor)
- **Comp Analysis** — Comparable sales pricing with real market data (Realty Mole API) and AI-suggested price ranges
- **Communication Drafter** — AI-drafted emails and texts for any client scenario (outreach, follow-up, offers, price reductions)
- **Lead Scoring** — AI analyzes contacts against your inventory and activity to score 0-100 with reasoning
- **Property Matching** — AI matches contacts to properties based on preferences, budget, and location
- **Dashboard Insights** — AI analyzes your entire portfolio (prospects, contacts, properties) and suggests actions

### CRM & Pipeline
- **Property Management** — Full CRUD with filtering by parish/county, status, type, price, beds, city
- **Contact Management** — Track leads, buyers, sellers with preferences, budgets, and parishes/counties
- **Activity Timeline** — Log calls, emails, showings, notes — auto-tracks AI actions and updates
- **Conversation Persistence** — Chat history saved and resumable across sessions
- **Lead Score Badges** — Visual hot/warm/cool/cold indicators on contacts
- **Prospect Score Badges** — Visual highly motivated/strong/moderate/low/unlikely indicators

### Multi-State Support
- **Louisiana** — Parish-based filtering, Civil Law considerations, redhibition, flood zones
- **Arkansas** — County-based filtering, tornado risk areas, NW Arkansas growth corridor
- **Mississippi** — County-based filtering, Gulf Coast wind zones, deed of trust state

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI, SQLAlchemy 2.0 (async), Python 3.12+ |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| AI | Anthropic Claude API with usage tracking and rate limiting |
| Data | ATTOM Data API (prospecting), Realty Mole API (market comps) |
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

### Prospects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/prospects` | List prospects (filterable by type, status, state, score) |
| POST | `/api/prospects` | Create prospect manually |
| GET | `/api/prospects/{id}` | Get prospect detail |
| PUT | `/api/prospects/{id}` | Update prospect |
| DELETE | `/api/prospects/{id}` | Delete prospect |
| POST | `/api/prospects/search` | Search ATTOM for prospects (auto-imports) |
| POST | `/api/prospects/{id}/enrich` | Enrich with ATTOM data + AVM |
| POST | `/api/prospects/{id}/convert` | Convert prospect to CRM contact |
| GET | `/api/prospects/status` | Check ATTOM API connection |
| GET | `/api/prospects/lists` | List saved prospect lists |
| POST | `/api/prospects/lists` | Create prospect list |

### Outreach
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/outreach/campaigns` | List outreach campaigns |
| POST | `/api/outreach/campaigns` | Create campaign |
| GET | `/api/outreach/campaigns/{id}` | Get campaign detail |
| PUT | `/api/outreach/campaigns/{id}` | Update campaign |
| GET | `/api/outreach/campaigns/{id}/messages` | List campaign messages |
| POST | `/api/outreach/generate-message` | AI-generate outreach for one prospect |
| POST | `/api/outreach/campaigns/{id}/generate-all` | Bulk-generate for entire list |
| PUT | `/api/outreach/messages/{id}/status` | Update message status |
| POST | `/api/outreach/campaigns/{id}/insights` | AI campaign analytics |

### Activities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/activities` | List activities (filterable by contact/property/prospect) |
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
| POST | `/api/ai/score-prospect` | AI prospect scoring (0-100) |
| POST | `/api/ai/bulk-score-prospects` | Bulk AI prospect scoring |
| POST | `/api/ai/match-properties` | AI property-to-contact matching |
| POST | `/api/ai/auto-comp-analysis` | Market data + AI comp analysis |
| GET | `/api/ai/dashboard-insights` | AI portfolio analysis |
| GET | `/api/ai/usage` | Daily usage stats and costs |
| GET | `/api/health` | Health check |

### Market Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/market/status` | Check Realty Mole API connection |
| POST | `/api/market/comps` | Search for comparable sales |
| POST | `/api/market/property` | Look up property records |

## Project Structure

```
backend/
  app/
    main.py              # FastAPI app, CORS, lifespan
    config.py            # Settings (pydantic-settings)
    database.py          # Async SQLAlchemy engine
    models/              # ORM models (Property, Contact, Activity, Conversation,
                         #   Prospect, ProspectList, OutreachCampaign, OutreachMessage)
    schemas/             # Pydantic request/response schemas
    routers/             # API routes (properties, contacts, ai, activities,
                         #   conversations, market_data, prospects, outreach)
    services/            # AI services (assistant, listing gen, comp analyzer,
                         #   comm drafter, lead scorer, property matcher,
                         #   prospect scorer, outreach generator, prospect data,
                         #   prospect enrichment, compliance)
    prompts/             # State-specific system prompts and templates
frontend/
  src/
    app/                 # Next.js pages (dashboard, ai, properties, contacts,
                         #   prospects, prospects/search, outreach, detail pages)
    components/
      layout/            # Sidebar navigation
      ui/                # Reusable components (LeadScoreBadge, ProspectScoreBadge,
                         #   StatusBadge, FilterBar, ActivityTimeline)
    lib/                 # API client (axios), TypeScript types
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | — | Your Anthropic API key |
| `DATABASE_URL` | No | `sqlite+aiosqlite:///./newgen_realty.db` | Database connection string |
| `REALTY_MOLE_API_KEY` | No | — | Market comps API (get from RapidAPI) |
| `ATTOM_API_KEY` | No | — | Prospecting engine API (get from attomdata.com) |
| `AI_MODEL` | No | `claude-sonnet-4-20250514` | Claude model to use |
| `DAILY_REQUEST_LIMIT` | No | `100` | Daily AI request limit |
| `MAX_TOKENS_CHAT` | No | `1024` | Max tokens for chat responses |
| `MAX_TOKENS_LISTING` | No | `1500` | Max tokens for listing generation |
| `MAX_TOKENS_ANALYSIS` | No | `2000` | Max tokens for analysis responses |

## License

Private — all rights reserved.
