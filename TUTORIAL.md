# NewGen Realty AI — Build Tutorial

Step-by-step walkthrough of building the AI-powered real estate platform from scratch. This is a living document — updated as features are added.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 16 Frontend                      │
│  Dashboard │ AI Chat │ Properties │ Contacts │ Prospects     │
│                    (localhost:3000)                           │
└────────────────────────┬────────────────────────────────────┘
                         │ axios (REST)
┌────────────────────────▼────────────────────────────────────┐
│                     FastAPI Backend                           │
│  Routers (async) → Services (sync) → External APIs           │
│                    (localhost:8000)                           │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Anthropic   │  Realty Mole │   ATTOM      │   SQLite/      │
│  Claude API  │  (comps)     │   (prospects)│   PostgreSQL   │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

**Key pattern:** Backend endpoints are `async def` using `AsyncSession` for DB queries. AI and external API services are **sync** functions — FastAPI auto-runs them in a threadpool. Never make services async; they use sync HTTP clients.

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Core CRM — Properties & Contacts](#2-core-crm)
3. [AI Services — Chat, Listings, Comps](#3-ai-services)
4. [Market Data — Realty Mole Integration](#4-market-data)
5. [Lead Scoring & Property Matching](#5-lead-scoring)
6. [Prospecting Engine — Phase 1: ATTOM Data](#6-prospecting-engine-phase-1)
7. [Prospecting Engine — Phase 2: AI Scoring & Outreach](#7-prospecting-engine-phase-2)

---

## 1. Project Setup

### Backend (FastAPI + SQLAlchemy)

```bash
cd backend
python -m venv venv
source venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt

# Create .env
cp .env.example .env
# Add: ANTHROPIC_API_KEY=sk-ant-...

uvicorn app.main:app --reload --port 8000
```

Key files:
- `app/main.py` — FastAPI app with CORS, lifespan (auto-creates tables), router registration
- `app/database.py` — Async SQLAlchemy engine, `get_db()` dependency
- `app/config.py` — Pydantic BaseSettings loading from `.env`

### Frontend (Next.js 16)

```bash
cd frontend
npm install
npm run dev
```

Key files:
- `src/lib/api.ts` — Axios client, all API functions
- `src/lib/types.ts` — TypeScript interfaces mirroring backend schemas
- `src/components/layout/Sidebar.tsx` — App navigation

### Conventions

| Convention | Detail |
|---|---|
| Primary keys | `String(36)` UUID with `default=lambda: str(uuid.uuid4())` |
| JSON columns | For flexible data: features, preferences, signals |
| Pydantic | `class Config: from_attributes = True` for ORM mode |
| Activity logging | All mutations auto-create Activity records |
| Parish vs County | `parish` column stores both; frontend labels dynamically by state |

---

## 2. Core CRM

### Database Models

**Property** (`models/property.py`): address, type, status, price, AI-generated description, suggested price
**Contact** (`models/contact.py`): name, type (buyer/seller/lead), preferences, AI lead score
**Activity** (`models/activity.py`): timestamped log of all events (calls, emails, AI actions)
**Conversation** (`models/conversation.py`): persisted AI chat with messages JSON array

### Router Pattern

Every entity follows the same CRUD pattern:

```python
router = APIRouter(prefix="/api/things", tags=["things"])

@router.get("", response_model=list[ThingResponse])
async def list_things(filters..., db: AsyncSession = Depends(get_db)):
    query = select(Thing).order_by(Thing.created_at.desc())
    # Apply filters with .where()
    result = await db.execute(query.limit(limit).offset(offset))
    return result.scalars().all()

@router.post("", response_model=ThingResponse, status_code=201)
async def create_thing(data: ThingCreate, db: ...):
    thing = Thing(**data.model_dump(exclude_none=True))
    db.add(thing)
    await db.commit()
    await db.refresh(thing)
    return thing
```

### Frontend Pattern

```typescript
// Load data on mount
useEffect(() => { loadData(); }, [filters]);

async function loadData() {
  const res = await getThings(filters);
  setData(res.data);
}
```

---

## 3. AI Services

### The AIAssistant Singleton (`services/ai_assistant.py`)

Wraps the Anthropic sync client with:
- **Lazy init** — only creates client when first called
- **Rate limiting** — `UsageTracker` enforces daily request limits
- **Cost tracking** — estimates token costs per request

Core method: `assistant.chat(messages, system, max_tokens) → str`

### Service Pattern

Every AI feature follows this pattern:

```python
# services/my_feature.py (SYNC — never async)
def my_feature(data: MyRequest) -> dict:
    prompt = MY_TEMPLATE.format(field1=data.field1, ...)
    
    response = assistant.chat(
        [{"role": "user", "content": prompt}],
        system=MY_SYSTEM_PROMPT,
        max_tokens=settings.MAX_TOKENS_FEATURE,
    )
    
    # Parse structured sections from response
    score_match = re.search(r"SCORE:\s*(\d+)", response)
    reason_match = re.search(r"REASON:\s*(.+?)(?=ACTION:|$)", response, re.DOTALL)
    
    return {"score": int(score_match.group(1)), "reason": reason_match.group(1).strip()}
```

### Prompt Architecture

System prompts in `prompts/system_prompts.py` define the AI's role and expertise. Templates in `prompts/templates.py` format the user's data into structured prompts with `{placeholders}`.

Response parsing uses regex to extract structured fields (SCORE:, REASON:, HEADLINE:, etc.) from Claude's text responses.

---

## 4. Market Data — Realty Mole Integration

`services/market_data.py` — the template for all external API integrations:

```python
# Sync function, httpx.Client (blocking), graceful fallback
def search_comps(address, sqft=None, ...) -> MarketCompResponse:
    if not is_configured():
        raise ValueError("API key not configured")
    
    with httpx.Client(timeout=30) as client:
        resp = client.get(f"{BASE_URL}/endpoint", headers=_headers(), params=params)
        resp.raise_for_status()
        data = resp.json()
    
    return MarketCompResponse(comps=[_parse_comp(item) for item in data])
```

**Auto Comp Analysis** combines market data + AI: fetches real comps from Realty Mole, feeds them into Claude for pricing analysis, saves the suggested price back to the property.

---

## 5. Lead Scoring & Property Matching

### Lead Scoring (`services/lead_scorer.py`)

Fetches contact + their activities + all active properties → formats into a prompt → Claude returns SCORE (0-100), REASON, ACTION → saves to contact record.

### Property Matching (`services/property_matcher.py`)

Fetches contact preferences + all active properties → Claude evaluates each property → returns ranked matches with MATCH, SCORE, REASON for each.

### Dashboard Insights

Aggregates ALL data (properties, contacts, activities) into a comprehensive prompt → Claude analyzes the portfolio → returns INSIGHTS, ACTIONS, OPPORTUNITIES sections.

---

## 6. Prospecting Engine — Phase 1: ATTOM Data

> **Commit:** `d675d7b` — "Add AI prospecting engine Phase 1"

### The Problem

Agents manually search county websites, PropStream, and multiple tools to find leads. Nobody unifies public record lead generation + AI scoring + AI outreach in one platform.

### What We Built

**New concept: Prospect** — A cold lead from public records, separate from Contact (which is an active CRM record). Prospects convert to Contacts when qualified.

### Prospect Types

| Type | Signal | What It Means |
|------|--------|---------------|
| `absentee_owner` | Owner lives elsewhere | Landlord burden, may want to sell remotely |
| `pre_foreclosure` | Notice of Default filed | Financial distress, urgency to sell |
| `long_term_owner` | 10+ years ownership | Sitting on equity, may not know market value |
| `tax_delinquent` | Overdue property taxes | Financial pressure signal |
| `vacant` | Property unoccupied | Carrying costs with no benefit |
| `probate` | Inherited property | May want quick sale, emotional situation |
| `fsbo` | For Sale By Owner | Frustrated seller, needs agent help |
| `expired_listing` | Failed to sell | Needs new strategy or pricing |

### ATTOM Data API Service (`services/prospect_data.py`)

Follows the `market_data.py` pattern exactly:
- Sync functions with `httpx.Client`
- `is_configured()` check with graceful fallback
- `_parse_prospect()` normalizes ATTOM responses into our format

```python
# Search functions — each returns list[dict] ready for Prospect creation
search_absentee_owners(state, county, city, zip_code, max_results)
search_pre_foreclosures(state, county, zip_code, max_results)
search_long_term_owners(state, county, city, zip_code, min_years, max_results)
search_tax_delinquent(state, county, zip_code, max_results)
search_vacant_properties(state, county, zip_code, max_results)

# Enrichment — pull detailed data for a single property
enrich_property(address) → dict
get_avm(address) → dict  # Automated Valuation Model
```

### TCPA Compliance (Baked In From Day One)

Every Prospect has compliance fields:
- `consent_status`: none → pending → granted/denied/revoked
- `dnc_checked` / `dnc_listed`: Do Not Call list status
- `opt_out_date` / `opt_out_processed`: 10-business-day processing window
- `contact_window_timezone`: enforce 8am-9pm contact hours

Penalties are up to **$1,500 per violation**. The platform tracks compliance at the data model level, not as an afterthought.

### Prospects Router (`routers/prospects.py`)

```
GET    /api/prospects              — List with filters (type, status, state, parish, score)
POST   /api/prospects              — Manual creation
GET    /api/prospects/{id}         — Detail view
PUT    /api/prospects/{id}         — Update
DELETE /api/prospects/{id}         — Delete
POST   /api/prospects/search       — Search ATTOM, auto-import with deduplication
POST   /api/prospects/{id}/enrich  — Pull more ATTOM data + AVM
POST   /api/prospects/{id}/convert — Create Contact from Prospect
GET    /api/prospects/status       — ATTOM API connection check
GET    /api/prospects/lists        — Saved prospect lists
POST   /api/prospects/lists        — Create prospect list
```

### Frontend Pages

- **`/prospects`** — List with filters, ATTOM connection indicator, prospect type badges
- **`/prospects/search`** — Search form: pick type, state, parish → hits ATTOM → shows results → auto-imports
- **`/prospects/[id]`** — Detail: owner info, property data (from ATTOM), motivation signals, compliance status, quick actions (enrich, convert to contact)

### How the Search + Import Flow Works

```
User fills search form → POST /api/prospects/search
  → Router validates search_type, dispatches to prospect_data.search_*()
  → ATTOM API returns raw property records
  → _parse_prospect() normalizes each into our format
  → Deduplication: skip if property_address already exists in DB
  → Create Prospect records for new ones
  → Log Activity
  → Return: total_found, imported_count, skipped_count
```

---

## 7. Prospecting Engine — Phase 2: AI Scoring & Outreach

> **Status:** In progress

### What We're Adding

1. **AI Prospect Scoring** — Claude evaluates each prospect's motivation signals and scores 0-100
2. **AI Outreach Generation** — Personalized letters/emails/texts based on prospect type and situation
3. **Outreach Campaign Management** — Create campaigns, generate messages, track delivery/responses
4. **Campaign Insights** — AI analyzes campaign performance and suggests optimizations

### AI Scoring Criteria

| Factor | Weight | What Claude Evaluates |
|--------|--------|----------------------|
| Prospect type signals | 40% | absentee+tax delinquent=very high, pre-foreclosure=high, long-term=moderate |
| Equity position | 20% | Higher equity = more flexibility to sell |
| Market timing | 15% | Local appreciation, days on market |
| Property condition | 15% | Age, vacancy duration, tax delinquency amount |
| Data completeness | 10% | More contact info = higher actionability |

### Outreach Tone by Prospect Type

| Type | Tone | Approach |
|------|------|----------|
| Pre-foreclosure | Empathetic | Never say "foreclosure" directly, offer options |
| Probate | Sensitive | Acknowledge loss, simplify the process |
| Absentee | Business-focused | Hassle-free sale, remove burden |
| Long-term | Congratulatory | Equity growth, market timing opportunity |
| Tax delinquent | Helpful | Resolve tax situation through sale |
| FSBO | Respectful | Professional support, broader exposure |

### New Services

**Prospect Scorer** (`services/prospect_scorer.py`):
- Follows `lead_scorer.py` pattern exactly
- Builds prompt with property data, owner info, motivation signals, equity calculation
- Parses SCORE/MOTIVATION/REASON/APPROACH/OUTREACH_TYPE from Claude's response
- Returns dict with score (0-100), motivation_level, reason, suggested_approach, suggested_outreach_type

**Outreach Generator** (`services/outreach_generator.py`):
- Follows `comm_drafter.py` pattern
- `PROSPECT_TYPE_CONTEXT` dict provides type-specific guidance for each prospect situation
- `_determine_key_signal()` picks the most relevant signal to highlight
- Supports email (SUBJECT + BODY), letter (BODY), text (BODY under 300 chars)
- Also includes `generate_campaign_insights()` for analyzing campaign performance

**Prospect Enrichment** (`services/prospect_enrichment.py`):
- `enrich_prospect_data()` — cross-references ATTOM for fuller property + owner data
- `check_dnc_list()` — stub that returns False (future: FTC DNC API integration)
- `determine_timezone()` — returns "America/Chicago" for LA/AR/MS
- `validate_outreach_compliance()` — returns list of compliance flags (no_consent, on_dnc_list, etc.)

### New Endpoints

```
POST /api/ai/score-prospect           — Score a single prospect (saves to DB)
POST /api/ai/bulk-score-prospects     — Score multiple prospects at once
POST /api/outreach/campaigns          — Create campaign
GET  /api/outreach/campaigns          — List campaigns
GET  /api/outreach/campaigns/{id}     — Campaign detail
PUT  /api/outreach/campaigns/{id}     — Update campaign
GET  /api/outreach/campaigns/{id}/messages   — List campaign messages
POST /api/outreach/generate-message   — Generate AI outreach for one prospect
POST /api/outreach/campaigns/{id}/generate-all — Bulk generate for entire list
PUT  /api/outreach/messages/{id}/status      — Update message status
POST /api/outreach/campaigns/{id}/insights   — AI campaign analytics
```

### Frontend Updates

- **`/prospects/[id]`** — Score Prospect button (calls AI, saves score, shows result), Generate Outreach buttons (Email/Letter/Text), generated message display with compliance flags
- **`/outreach`** — Campaign dashboard with stats (total, active, sent, response rate), create campaign form with prospect list selection, campaign cards with progress bars
- **`/outreach/[id]`** — Campaign detail: stats row, AI insights panel, messages table with expandable body, status management (draft/active/paused)

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | — | Claude API key |
| `DATABASE_URL` | No | `sqlite+aiosqlite:///./newgen_realty.db` | Database |
| `REALTY_MOLE_API_KEY` | No | — | Market comps (RapidAPI) |
| `ATTOM_API_KEY` | No | — | Prospecting engine (attomdata.com) |
| `AI_MODEL` | No | `claude-sonnet-4-6` | Claude model for quality tasks (scoring, outreach, listings) |
| `AI_MODEL_FAST` | No | `claude-haiku-4-5-20251001` | Claude model for high-volume tasks (chat, dashboard insights) |
| `DAILY_REQUEST_LIMIT` | No | `100` | Max AI requests/day |

---

## Multi-State Support

NewGen supports Louisiana, Arkansas, and Mississippi. Key differences:

| | Louisiana | Arkansas | Mississippi |
|---|---|---|---|
| Legal system | Civil Law (Napoleonic) | Common Law | Common Law |
| Subdivisions | 64 Parishes | 75 Counties | 82 Counties |
| Property regime | Community Property | Equitable Distribution | Equitable Distribution |
| Unique law | Redhibition, Usufruct | Right of Redemption (1yr) | Deed of Trust state |
| Natural risk | Flood zones, hurricanes | Tornado Alley | Flood + Gulf Coast hurricanes |
| Capital gains tax | None | 0.9%–4.4% | 0%–5% |

The `parish` column in the database stores parish (LA) or county (AR/MS). The frontend dynamically labels it based on the `state` field.

---

---

## 8. Phase 4: Additional Data Sources, Skip Tracing, Batch Operations

### County Portal Data Service (`services/county_data.py`)

Supplements ATTOM with free public record lookups:
- **Louisiana**: Parish assessor portals (Prior Inc platform for Ouachita, Rapides, Lincoln, etc.)
- **Arkansas**: ARCountyData.com (all 75 counties)
- **Mississippi**: County chancery clerk portals (framework ready, specific parsers per county)

Unified `search_county_records(state, county_parish, address, owner_name)` dispatches to state-specific search functions. These are HTML parsers, not formal APIs — results vary by county.

### Skip Tracing Service (`services/skip_trace.py`)

Pluggable architecture for finding phone/email/address for prospects:
- **Default**: "free" provider (stub — returns no data but framework is ready)
- **BatchSkipTracing.com**: Full integration (~$0.15/record) — just set `SKIP_TRACE_PROVIDER=batchskiptracing` and `SKIP_TRACE_API_KEY`
- **Extensible**: Add new providers by implementing a `_provider_skip_trace()` function

Returns standardized format: `{phones: [{number, type, confidence}], emails: [{address, confidence}], addresses: [{address, type}]}`

### Batch Operations

New endpoints for operating on multiple prospects at once:
```
POST /api/prospects/batch-skip-trace     — Find contact info for multiple prospects
POST /api/prospects/batch-dnc-check      — Check DNC list for all prospects with phone numbers
POST /api/prospects/search-county        — Search free county portals
GET  /api/prospects/county-sources       — List available county data sources
POST /api/prospects/{id}/skip-trace      — Skip trace a single prospect
```

### Frontend Bulk Actions

**Prospects list page** (`/prospects`) now has three bulk action buttons:
- **Bulk Score** — AI-scores all unscored prospects
- **DNC Check** — Checks DNC list for all prospects with unchecked phone numbers
- **Skip Trace** — Runs skip tracing for all prospects missing contact info

**Prospect detail page** (`/prospects/[id]`) gains a **Skip Trace** button in Quick Actions.

### Environment Variables (Phase 4)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SKIP_TRACE_PROVIDER` | No | `free` | Skip trace provider (`free`, `batchskiptracing`) |
| `SKIP_TRACE_API_KEY` | No | — | API key for paid skip trace provider |

*Tutorial last updated: Phase 4 complete — county data, skip tracing, and batch operations.*
