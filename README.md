# NewGen Realty AI

AI-powered real estate platform for Louisiana, Arkansas, and Mississippi. Gives a solo agent the tools of a full brokerage — AI prospecting from public records, AI-scored leads, personalized outreach, listing generation, comp analysis, lead scoring, property matching, and a smart dashboard — all tuned for the unique markets of LA, AR, and MS.

**The gap it fills:** No existing tool combines public record lead generation + AI motivation scoring + AI-personalized outreach + campaign tracking + CRM in one platform. Agents currently pay $300+/month across 5-8 separate tools (PropStream, BatchLeads, Follow Up Boss, ChatGPT, Mailchimp, etc.) and manually copy-paste between them. NewGen replaces that entire stack.

## What It Replaces

| What agents do today | Tool they use | Cost/month | What NewGen does instead |
|---|---|---|---|
| Find motivated sellers | PropStream | $99 | ATTOM search + county portals, built in |
| Find contact info | BatchLeads | $99 | Skip tracing service (pluggable providers) |
| CRM + pipeline | Follow Up Boss | $69 | Contacts, prospects, activities, lead scoring |
| Write outreach | ChatGPT (copy-paste) | $20 | AI-personalized per prospect type + situation |
| Track campaigns | Mailchimp / spreadsheet | $0-50 | Campaign management with message tracking |
| Scheduled drip sending | ActiveCampaign / Lemlist | $49-99 | Multi-step drip scheduler with Resend + Twilio, TCPA-gated |
| Geographic prospecting | Mapright / Landglide | $25-50 | Farm map with heat layer, color-coded score markers |
| Market analysis | MLS + manual | $0 | AI + Realty Mole real market data |
| Compliance checking | Manual / hope | $0 | TCPA baked into every outreach action |
| **Total** | | **$400+/month** | **One platform** |

## Documentation

| File | Contents |
|------|----------|
| [WALKTHROUGH.md](WALKTHROUGH.md) | Step-by-step guide to using every feature |
| [GUIDE.md](GUIDE.md) | Complete reference: terms, statuses, workflows, scoring, compliance, multi-state |
| [COMPLIANCE.md](COMPLIANCE.md) | Full TCPA compliance reference: every flag explained, consent rules, DNC, opt-out processing, contact hours, common scenarios |
| [IP_PROTECTION.md](IP_PROTECTION.md) | IP protection plan: copyright, trademark, patent, LLC, notarization |
| [TUTORIAL.md](TUTORIAL.md) | Technical build tutorial for developers |
| [CLAUDE.md](CLAUDE.md) | Architecture guide for Claude Code AI assistant |

---

## Quickstart — Windows (Get Running in 2 Minutes)

**Step 0 — Install prerequisites (open PowerShell as Administrator):**

If you don't have Python, Node, and Git installed, run these one-liners in PowerShell:

```powershell
# Install Git (if you don't have it)
winget install Git.Git

# Install Python 3.12+
winget install Python.Python.3.12

# Install Node.js 18+
winget install OpenJS.NodeJS.LTS
```

Close and reopen PowerShell after installing, then verify:
```powershell
python --version    # Should show 3.12+
node --version      # Should show 18+
git --version       # Should show 2.x+
```

> **Already have these?** Skip to Step 0b.

**Step 0b — Get your Anthropic API key (free to start):**
1. Go to [console.anthropic.com](https://console.anthropic.com/) and create an account
2. Add a payment method (you only pay for what you use — testing costs pennies)
3. Click **API Keys** in the left sidebar
4. Click **Create Key**, name it whatever you want
5. Copy the key — it starts with `sk-ant-` and you'll paste it in Step 1

**Optional API keys (add these to `.env` later to unlock more features):**

| Key | What It Unlocks | How to Get It | Cost |
|-----|----------------|---------------|------|
| `REALTY_MOLE_API_KEY` | Real comparable sales data for AI pricing analysis | 1. Go to [rapidapi.com](https://rapidapi.com/realtymole/api/realty-mole-property-api) 2. Create account 3. Subscribe to Realty Mole Property API 4. Copy your RapidAPI key from the dashboard | Free tier available (50 requests/mo), paid plans from $20/mo |
| `ATTOM_API_KEY` | Public record prospect searching (absentee owners, pre-foreclosures, tax delinquent, etc.) | 1. Go to [api.gateway.attomdata.com](https://api.gateway.attomdata.com/) 2. Create account 3. Subscribe to a plan 4. Copy your API key | Starting ~$95/mo |
| `SKIP_TRACE_API_KEY` | Find phone/email for prospects with no contact info | 1. Go to [batchskiptracing.com](https://www.batchskiptracing.com/) 2. Create account 3. Add credits 4. Copy your API key 5. Also set `SKIP_TRACE_PROVIDER=batchskiptracing` in `.env` | ~$0.15 per record |
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL` | Actually send drip campaign emails (not just generate them) | 1. Go to [resend.com](https://resend.com) 2. Create account, verify a domain 3. Create an API key from the dashboard | Free up to 3K emails/mo, then $20/mo for 50K |
| `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER` | Send drip SMS + auto-handle STOP replies | 1. Go to [twilio.com/console](https://twilio.com/console) 2. Buy a 10DLC number 3. Copy Account SID, Auth Token | ~$1/mo per number + $0.0079/SMS |

You can add any of these later — the platform works without them, you just won't have access to those specific features. The drip scheduler queues messages either way; without Resend/Twilio keys they stay in QUEUED state.

**Step 1 — Download the code.** Open **PowerShell** (search "PowerShell" in the Start menu). Navigate to your Documents folder:
```powershell
cd $HOME\Documents
```
Now download the project:
```powershell
git clone https://github.com/wbp318/newgen_realty.git
```
This creates a folder at `C:\Users\YourName\Documents\newgen_realty` with all the code. Now navigate into the backend folder:
```powershell
cd newgen_realty\backend
```

**Step 2 — Set up the Python environment.** Run these one at a time:
```powershell
python -m venv venv
```
This creates an isolated Python environment. Now activate it:
```powershell
venv\Scripts\Activate.ps1
```
> **Getting a red error about "execution policy"?** Run this first, then try again:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

You should see `(venv)` appear at the start of your command line. That means you're inside the virtual environment. Now install the dependencies:
```powershell
pip install -r requirements.txt
```
This will download and install about 30 packages. Wait for it to finish (you'll see "Successfully installed..." at the end).

**Step 3 — Set up the API key.** Run:
```powershell
Copy-Item .env.example .env
notepad .env
```
This opens notepad with the config file. **Delete everything in the file** and replace it with this (paste your real API key on the first line):
```
ANTHROPIC_API_KEY=sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-XXXXXXXXXX
DATABASE_URL=sqlite+aiosqlite:///./newgen_realty.db
REALTY_MOLE_API_KEY=
ATTOM_API_KEY=
SKIP_TRACE_PROVIDER=free
SKIP_TRACE_API_KEY=
```
- **Line 1** — Replace the `sk-ant-api03-XXX...` with your real Anthropic API key. Paste the whole thing after the `=` sign. No spaces, no quotes.
- **Line 2** — Leave exactly as shown. This tells the app to use a local database file.
- **Lines 3-6** — Leave blank after the `=` sign. These are optional features.

Now **save the file** (Ctrl+S) and **close notepad** (click the X or Alt+F4).

**Step 4 — Start the backend.** Back in your PowerShell window (the one that still shows `(venv)`), run:
```powershell
uvicorn app.main:app --reload --port 8000
```
Wait a few seconds. You should see something like:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```
That means the backend is running. **Do NOT close this terminal — leave it running.**

**Step 5 — Open a NEW PowerShell window** (right-click PowerShell in taskbar → "New Window", or search "PowerShell" in Start menu again). In this new window, navigate to the frontend folder:
```powershell
cd $HOME\Documents\newgen_realty\frontend
npm install
```
This installs the frontend dependencies (takes 30-60 seconds). When it's done, run:
```powershell
npm run dev
```
Wait a few seconds. You should see:
```
▲ Next.js 16.x.x
- Local: http://localhost:3000
✓ Ready
```
**Leave this terminal running too** — you now have two terminals open.

**Step 6 — Open the app.** Open your web browser (Chrome, Edge, Firefox — doesn't matter) and go to:

**http://localhost:3000**

You should see the NewGen Realty AI dashboard. You're in.

> **Mac/Linux?** Same steps but use `source venv/bin/activate` instead of `venv\Scripts\activate`, and `cp .env.example .env` instead of `copy`.

> **Only thing required:** An Anthropic API key. Everything else (ATTOM, Realty Mole, skip tracing) is optional and unlocks extra features.

---

## Compliance Flags — Quick Reference

When you generate outreach, the system checks TCPA compliance and shows flags. **Violations carry fines up to $1,500 each.**

| Flag | What It Means | What You Can Do | How to Fix |
|------|--------------|-----------------|------------|
| `no_consent` | No written consent to call/text/email | **Send a letter** (no consent needed — First Amendment) | Include response card in letter to obtain consent |
| `on_dnc_list` | Phone number is on the Do Not Call Registry | **Letters and email only** — never call or text | Cannot be removed — use non-phone channels |
| `pending_opt_out` | They requested no contact, processing in progress | **Do not contact** until 10 business days pass | Wait for processing window to close |
| `do_not_contact` | Permanently blocked from all outreach | **Nothing — hard block** | Only reverse if set in error |
| `no_contact_info` | No phone, email, or mailing address on file | **Skip trace** to find contact info | Click "Skip Trace" or "Enrich with ATTOM Data" |
| `outside_contact_hours` | Current time is before 8am or after 9pm recipient time | **Save as draft**, send during business hours | Wait until 8:00 AM their timezone |

No flags = **"Clear"** in green — safe to send via any channel. **[Full TCPA compliance reference →](COMPLIANCE.md)**

## AI Model Strategy

The platform uses a split model approach to balance quality and cost:

| Feature | Model | Why |
|---------|-------|-----|
| Chat | **Haiku 4.5** ($0.80/$4 per M tokens) | Conversational, high volume, fast responses |
| Dashboard Insights | **Haiku 4.5** | Summary/analysis, good enough quality |
| Listing Generation | **Sonnet 4** ($3/$15 per M tokens) | Copywriting quality matters for MLS |
| Comp Analysis | **Sonnet 4** | Pricing accuracy is critical |
| Lead Scoring | **Sonnet 4** | Nuanced evaluation of buyer readiness |
| Property Matching | **Sonnet 4** | Nuanced preference-to-inventory matching |
| Communication Drafting | **Sonnet 4** | Client-facing writing quality |
| Prospect Scoring | **Sonnet 4** | Motivation signal analysis needs depth |
| Outreach Generation | **Sonnet 4** | Tone/empathy adaptation is the key differentiator |
| Campaign Insights | **Sonnet 4** | Strategic optimization recommendations |

Configurable via `AI_MODEL` (Sonnet, default) and `AI_MODEL_FAST` (Haiku, default) in `.env`.

## Features

### AI Prospecting Engine

The core differentiator. Find motivated sellers from public records, score them with AI, and generate personalized outreach — all without leaving the platform.

- **Public Record Search** — Search ATTOM Data API for motivated sellers across LA, AR, and MS. Five search types:
  - **Absentee Owners** — Owner lives at a different address (landlords, inherited homes)
  - **Pre-Foreclosure** — Notice of Default filed (financial distress, urgency to sell)
  - **Tax Delinquent** — Overdue property taxes (financial pressure signal)
  - **Long-Term Owners** — 10+ years ownership (sitting on equity, may not know market value)
  - **Vacant Properties** — Unoccupied (carrying costs with no benefit)
- **County Portal Data** — Free supplementary data from LA parish assessor portals, ARCountyData.com, and MS chancery clerk sites
- **Auto-Deduplication** — Imported prospects are checked against existing records to prevent duplicates
- **Property Enrichment** — Pull detailed property data + AVM (Automated Valuation Model) estimates from ATTOM
- **Skip Tracing** — Find phone numbers, email addresses, and mailing addresses for prospects with no contact info. Pluggable providers (free stub included, BatchSkipTracing.com integration ready)

### AI Prospect Scoring

Claude evaluates each prospect on a 0-100 scale based on weighted motivation signals:

| Factor | Weight | What it measures |
|--------|--------|-----------------|
| Prospect type signals | 40% | Absentee + tax delinquent = very high. Pre-foreclosure = high urgency. Probate = moderate-high. Long-term owner = moderate. |
| Equity position | 20% | Calculated from AVM vs. last sale price. More equity = more flexibility to sell. |
| Market timing | 15% | Local appreciation trends, days on market |
| Property condition | 15% | Age, vacancy duration, tax delinquency amount |
| Data completeness | 10% | Phone + email + address = higher actionability |

**Score ranges:**
- **85-100**: Highly Motivated — multiple distress signals, contact immediately
- **70-84**: Strong — clear motivation signal, prioritize outreach
- **50-69**: Moderate — some signals, include in campaigns
- **30-49**: Low — minimal signals, batch outreach only
- **0-29**: Unlikely — no clear motivation

### AI Outreach Generation

The AI adapts its entire tone and approach based on the prospect's situation. This is the key differentiator — not generic templates, but genuinely personalized messaging.

| Prospect Type | AI Tone | Approach | Key Rule |
|---------------|---------|----------|----------|
| Absentee Owner | **Business-Focused** | Hassle-free sale, remove management burden | Focus on financial upside and convenience |
| Pre-Foreclosure | **Empathetic** | Offer options, help navigating difficulty | NEVER use the word "foreclosure" |
| Probate | **Sensitive** | Acknowledge loss, simplify estate settlement | Lead with empathy — someone passed away |
| Long-Term Owner | **Congratulatory** | Equity growth, market timing opportunity | They may not know their home's current value |
| Tax Delinquent | **Helpful** | Selling could resolve tax situation | Be helpful, not predatory |
| Vacant | **Practical** | Carrying costs, liability, convert to cash | Focus on the financial drain |
| FSBO | **Respectful** | Professional value-add, broader exposure | Don't insult their approach |
| Expired Listing | **Professional** | Fresh strategy, what you'd do differently | Don't bash their previous agent |

Supports three mediums:
- **Email** — Subject line + body, best for prospects with email addresses
- **Letter** — Full letter with greeting and sign-off, highest response rate for motivated sellers, no TCPA consent required
- **Text** — Under 300 characters, requires written consent under TCPA

### Outreach Campaigns + Drip Send Engine

Organize and *actually send* outreach at scale:
- Create campaigns by type (email, letter, text) and assign prospect lists
- **Multi-touch drip sequences** — Configure steps: day 0 email → day 3 SMS → day 7 email → etc. Each step can override tone.
- **Per-campaign send window** — Only dispatch between e.g. 9am-6pm local (inside TCPA 8am-9pm)
- **Bulk message generation** — AI generates personalized messages for every prospect in a list
- **Compliance checking at dispatch** — Every message is re-validated against consent status, DNC list, contact hours, and opt-out status at the moment of send, not just at generation
- **Automated send via Resend (email) + Twilio (SMS)** — APScheduler runs inside the FastAPI process and sweeps queued messages every 60s
- **Daily send caps** — Global + per-campaign limits prevent accidental mass sends
- **Inbound reply handling** — Twilio webhook auto-processes STOP/UNSUBSCRIBE keywords (revokes consent, cancels future queued SMS for that prospect). Resend webhook updates delivered/opened/bounced statuses.
- **Message tracking** — Status: draft → queued → sent → delivered → opened → replied (or failed/bounced)
- **Manual send-now override** — Force-dispatch a single message outside the drip schedule (still compliance-gated)
- **AI Campaign Insights** — Claude analyzes campaign performance and suggests optimizations
- **Campaign management** — Draft, activate (expands sequence into queued messages), pause, complete lifecycle

### Farm Map (Geographic Intelligence)

Leaflet + OpenStreetMap view of your entire prospect pipeline:
- **Auto-geocoding** — New prospects from ATTOM or manual entry are geocoded via Nominatim (free) on creation
- **Heat layer** — Motivation density at a glance; darker = more prospects / higher scores
- **Color-coded markers** — Red (score ≥80), amber (60-79), yellow (40-59), blue (<40 or unscored)
- **Filters** — Min score, state, prospect type (multi-select), status
- **Backfill button** — Geocode historical prospects in batches of 50 (~1 min each due to Nominatim rate limits)
- **Auto-fit bounds** — Map centers/zooms to your actual prospect footprint on load

### TCPA Compliance (Built In, Not Bolted On)

Penalties are up to **$1,500 per violation**. The platform enforces compliance at every step:

- **Consent tracking** — Every prospect has a consent status (none/pending/granted/denied/revoked). The system flags outreach to prospects without consent.
- **DNC list checking** — Batch check phone numbers against the Do Not Call registry. Flagged prospects are blocked from phone/text outreach.
- **Contact hours** — Enforces 8am-9pm in the recipient's timezone. Flags outreach attempts outside this window.
- **Opt-out processing** — Tracks the FCC-mandated 10-business-day processing window. Prospects who opt out are blocked until processed.
- **Medium-specific rules** — Letters don't require TCPA consent (First Amendment). Phone/text/email require written consent. The system knows the difference.
- **Compliance flags** — Every generated message shows flags: `no_consent`, `on_dnc_list`, `pending_opt_out`, `do_not_contact`, `no_contact_info`, `outside_contact_hours`

### AI-Powered CRM Tools

- **AI Chat Assistant** — State-specific real estate advice for LA, AR, and MS. Knows civil law vs. common law, parishes vs. counties, redhibition, usufruct, flood zones, tornado alley, and Gulf Coast wind zones. Conversations auto-save and are resumable.
- **Listing Generator** — AI-written MLS property descriptions in four tones: professional, luxury, casual, investor. State-appropriate features highlighted (raised foundation for LA, storm shelter for AR, hurricane rating for MS).
- **Comp Analysis** — Feed in comparable sales (manually or auto-fetched from Realty Mole API) and get an AI-suggested listing price with a price range and detailed reasoning.
- **Auto Comp Analysis** — One-click: fetches real market comps from Realty Mole, feeds them to Claude, saves the suggested price to the property record.
- **Communication Drafter** — AI drafts emails and texts for any client scenario: outreach, follow-up, offers, price reductions, listing appointments, open house invites. Adjustable tone (professional, friendly, urgent).
- **Lead Scoring** — AI scores CRM contacts 0-100 based on budget alignment, location match, engagement recency, contact completeness, and source quality. Scores saved to contact record with reasoning and suggested next action.
- **Property Matching** — AI evaluates each contact's preferences against all active properties and returns ranked matches with match scores and explanations.
- **Dashboard Insights** — AI analyzes your entire portfolio (properties, contacts, prospects, activities) and generates market observations, action items, and opportunity alerts.

### CRM & Pipeline

- **Property Management** — Full CRUD with filtering by parish/county, state, status, type, price range, bedrooms, city, and text search. Statuses: draft → active → pending → sold / withdrawn.
- **Contact Management** — Track buyers, sellers, and leads with preferences (parishes/counties, cities, property types), budget ranges, and source tracking. Statuses: lead, buyer, seller, both.
- **Prospect Pipeline** — Separate from contacts. Track cold leads from public records through: new → researching → qualified → contacted → responding → converted / not interested / do not contact.
- **Activity Timeline** — Auto-logged for every AI action, record update, and manual entry. Types: call, email, text, showing, meeting, note, AI action, status change, offer.
- **Conversation Persistence** — AI chat history saved with auto-titling from first message. Resume any conversation.
- **Prospect-to-Contact Conversion** — One-click conversion creates a CRM contact from a qualified prospect, preserving all data and linking the records.

### Multi-State Intelligence

| | Louisiana | Arkansas | Mississippi |
|---|---|---|---|
| **Legal system** | Civil Law (Napoleonic Code) | Common Law | Common Law |
| **Subdivisions** | 64 Parishes | 75 Counties | 82 Counties |
| **Property regime** | Community Property | Equitable Distribution | Equitable Distribution |
| **Unique law** | Redhibition, Usufruct | Right of Redemption (1yr) | Deed of Trust state |
| **Natural risk** | Flood zones, hurricanes | Tornado Alley | Flood + Gulf Coast hurricanes |
| **Homestead exemption** | $75,000 off assessed value | $375/year credit | First $7,500 assessed |
| **Capital gains tax** | None | 0.9%–4.4% | 0%–5% |
| **Key markets** | New Orleans, Baton Rouge, Lafayette, Shreveport | Little Rock, NW Arkansas (fastest growing US metro), Fort Smith | Jackson, Gulf Coast (Gulfport/Biloxi), Hattiesburg, DeSoto County |

The platform dynamically labels "Parish" for LA and "County" for AR/MS throughout the UI. AI prompts include state-specific legal frameworks, property styles, and market context.

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI, SQLAlchemy 2.0 (async), Python 3.12+ |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| AI | Anthropic Claude API (Sonnet 4 + Haiku 4.5) with usage tracking, rate limiting, and cost estimation |
| Prospecting | ATTOM Data API (property records, owner data, AVM, foreclosure) |
| Market Data | Realty Mole Property API via RapidAPI (comparable sales) |
| Skip Tracing | Pluggable providers (BatchSkipTracing.com integration ready) |
| County Data | LA parish assessor portals, ARCountyData.com, MS chancery clerks |
| Email Send | Resend transactional email API |
| SMS Send | Twilio SMS (with webhook-driven STOP opt-out handling) |
| Drip Scheduler | APScheduler AsyncIOScheduler (in-process, runs in FastAPI lifespan) |
| Geocoding | OpenStreetMap Nominatim (free, 1.1s throttle) |
| Mapping | Leaflet + react-leaflet 5 + leaflet.heat (OSM tiles) |
| Database | SQLite (local dev) / PostgreSQL (Docker production) |
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

## The Full Pipeline

This is how all the pieces connect — from finding a prospect to closing a deal:

```
1. SEARCH PUBLIC RECORDS (ATTOM Data API)
   Find absentee owners, pre-foreclosures, tax delinquent, vacant, long-term owners
                    ↓
2. IMPORT PROSPECTS (auto-deduplicated)
   Property data, owner info, motivation signals imported automatically
                    ↓
3. ENRICH (ATTOM property detail + AVM)
   Fill in missing data, get automated valuation estimate
                    ↓
4. SKIP TRACE (find contact info)
   Phone, email, mailing address for prospects without contact data
                    ↓
5. AI SCORE 0-100 (motivation signals → Claude)
   Type signals 40% + equity 20% + timing 15% + condition 15% + data 10%
                    ↓
6. AI GENERATE OUTREACH (tone-adapted per type)
   Business-focused for absentee, empathetic for foreclosure, sensitive for probate...
                    ↓
7. OUTREACH CAMPAIGNS (organize + drip)
   Define multi-touch sequence (day 0 email → day 3 SMS → ...), bulk generate
                    ↓
8. DRIP SEND ENGINE (APScheduler + Resend + Twilio)
   Queued messages dispatch automatically on schedule, TCPA-gated per message.
   Inbound STOP replies auto-opt-out; delivered/opened events webhook back.
                    ↓
9. AI CAMPAIGN INSIGHTS (optimize)
   What's working, what to change, specific suggestions
                    ↓
10. CONVERT TO CONTACT (prospect → CRM)
    One-click conversion preserves all data, links records
                    ↓
11. FULL CRM (score → match → communicate → close)
    AI lead scoring, property matching, communication drafting, activity tracking
```

## API Endpoints (65+)

### Properties (5)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/properties` | List properties (filterable by parish/county, state, status, type, price, beds, city, text search) |
| POST | `/api/properties` | Create property |
| GET | `/api/properties/{id}` | Get property detail |
| PUT | `/api/properties/{id}` | Update property (auto-logs activity) |
| DELETE | `/api/properties/{id}` | Delete property |

### Contacts (5)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts` | List contacts (filterable by type, source, min score, text search) |
| POST | `/api/contacts` | Create contact |
| GET | `/api/contacts/{id}` | Get contact detail |
| PUT | `/api/contacts/{id}` | Update contact (auto-logs activity) |
| DELETE | `/api/contacts/{id}` | Delete contact |

### Prospects (17)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/prospects` | List prospects (filterable by type, status, state, parish, score range, consent, source, text search, sortable by score or date) |
| POST | `/api/prospects` | Create prospect manually (auto-geocodes address via Nominatim) |
| GET | `/api/prospects/{id}` | Get prospect detail with all data |
| PUT | `/api/prospects/{id}` | Update prospect (auto-logs activity) |
| DELETE | `/api/prospects/{id}` | Delete prospect |
| GET | `/api/prospects/geo` | Lightweight geo points for map rendering (bounds + score/state/type/status filters) |
| POST | `/api/prospects/geocode-backfill` | Fill in lat/lng for prospects missing coordinates (~1s per row) |
| POST | `/api/prospects/search` | Search ATTOM for prospects — auto-imports with deduplication + geocoding |
| POST | `/api/prospects/{id}/enrich` | Enrich with ATTOM property detail + AVM estimate |
| POST | `/api/prospects/{id}/convert` | Convert prospect to CRM contact (one-click) |
| POST | `/api/prospects/{id}/skip-trace` | Skip trace — find phone/email/address |
| POST | `/api/prospects/batch-skip-trace` | Batch skip trace for multiple prospects |
| POST | `/api/prospects/batch-dnc-check` | Batch DNC list check for all prospects with phone numbers |
| POST | `/api/prospects/search-county` | Search free county/parish public record portals |
| GET | `/api/prospects/county-sources` | List available county data sources by state |
| GET | `/api/prospects/status` | Check ATTOM API connection status |
| GET | `/api/prospects/lists` | List saved prospect lists |
| POST | `/api/prospects/lists` | Create prospect list |
| GET | `/api/prospects/lists/{id}` | Get prospect list detail |
| PUT | `/api/prospects/lists/{id}` | Update prospect list |

### Outreach (14)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/outreach/campaigns` | List outreach campaigns (filterable by status, type) |
| POST | `/api/outreach/campaigns` | Create campaign (supports sequence_config, send_window_start/end, daily_send_cap) |
| GET | `/api/outreach/campaigns/{id}` | Get campaign detail with stats |
| PUT | `/api/outreach/campaigns/{id}` | Update campaign (status, template, sequence_config, send windows) |
| POST | `/api/outreach/campaigns/{id}/activate` | Expand sequence_config into queued messages (idempotent) |
| POST | `/api/outreach/campaigns/{id}/pause` | Pause campaign (queued messages resume on re-activate) |
| GET | `/api/outreach/campaigns/{id}/messages` | List campaign messages (filterable by status) |
| POST | `/api/outreach/generate-message` | AI-generate personalized outreach for one prospect |
| POST | `/api/outreach/campaigns/{id}/generate-all` | Bulk-generate AI messages for entire prospect list |
| PUT | `/api/outreach/messages/{id}/status` | Update message status (sent/delivered/opened/replied) — auto-updates campaign stats |
| POST | `/api/outreach/messages/{id}/send-now` | Force-dispatch a single message immediately (still compliance-gated) |
| POST | `/api/outreach/campaigns/{id}/insights` | AI campaign performance analytics |
| POST | `/api/outreach/webhooks/resend` | Resend delivery/open/bounce/complaint webhook (HMAC-verified when secret set) |
| POST | `/api/outreach/webhooks/twilio` | Twilio status callbacks + inbound SMS with STOP auto-opt-out |

### Activities (4)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/activities` | List activities (filterable by contact, property, prospect, type) |
| POST | `/api/activities` | Create activity (auto-updates contact.last_contact_date) |
| GET | `/api/activities/{id}` | Get activity detail |
| DELETE | `/api/activities/{id}` | Delete activity |

### Conversations (4)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List saved conversations |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/{id}` | Get conversation with all messages |
| DELETE | `/api/conversations/{id}` | Delete conversation |

### AI (12)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | Chat with AI assistant — auto-saves conversation, uses Haiku for speed |
| POST | `/api/ai/generate-listing` | Generate MLS listing description (4 tones, uses Sonnet) |
| POST | `/api/ai/analyze-comps` | Analyze comparable sales for pricing (uses Sonnet) |
| POST | `/api/ai/draft-communication` | Draft email or text for any scenario (uses Sonnet) |
| POST | `/api/ai/score-lead` | AI lead scoring 0-100 with reasoning (uses Sonnet) |
| POST | `/api/ai/score-prospect` | AI prospect scoring 0-100 with motivation analysis (uses Sonnet) |
| POST | `/api/ai/bulk-score-prospects` | Bulk AI prospect scoring — returns average + individual results |
| POST | `/api/ai/match-properties` | AI property-to-contact matching with ranked results |
| POST | `/api/ai/auto-comp-analysis` | Fetch real comps from Realty Mole + run AI analysis (one-click) |
| GET | `/api/ai/dashboard-insights` | AI portfolio analysis — insights, actions, opportunities (uses Haiku) |
| GET | `/api/ai/usage` | Daily usage stats: requests, tokens, estimated cost |
| GET | `/api/health` | Health check |

### Market Data (3)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/market/status` | Check Realty Mole API connection |
| POST | `/api/market/comps` | Search for comparable sales by address |
| POST | `/api/market/property` | Look up property records by address |

## Project Structure

```
backend/
  app/
    main.py                  # FastAPI app, CORS, lifespan (auto-creates tables)
    config.py                # Settings via pydantic-settings (.env)
    database.py              # Async SQLAlchemy 2.0 engine + session
    models/
      property.py            # Property (address, price, AI description, AI suggested price)
      contact.py             # Contact (preferences, budget, AI lead score)
      activity.py            # Activity timeline (auto-logged for all actions)
      conversation.py        # AI chat persistence (messages JSON array)
      prospect.py            # Prospect (owner, property, signals, TCPA compliance)
      prospect_list.py       # Saved prospect lists (search criteria, prospect IDs)
      outreach.py            # OutreachCampaign + OutreachMessage (status tracking)
    schemas/
      property.py            # Create/Update/Response schemas
      contact.py             # Create/Update/Response schemas
      ai.py                  # Chat, listing, comp, comm, lead score, property match schemas
      prospect.py            # Prospect CRUD + search + scoring schemas
      outreach.py            # Campaign + message + insights schemas
      market_data.py         # Market comp + property lookup schemas
    routers/
      properties.py          # Property CRUD with filtering
      contacts.py            # Contact CRUD with filtering
      ai.py                  # All AI endpoints (chat, listing, comps, scoring, matching)
      activities.py          # Activity CRUD
      conversations.py       # Conversation CRUD
      market_data.py         # Realty Mole API proxy endpoints
      prospects.py           # Prospect CRUD, ATTOM search, enrich, convert, skip trace, DNC
      outreach.py            # Campaign CRUD, message generation, tracking, insights
    services/
      ai_assistant.py        # AIAssistant singleton (Claude client, usage tracking, model routing)
      listing_generator.py   # AI MLS listing descriptions
      comp_analyzer.py       # AI comparable sales analysis
      comm_drafter.py        # AI email/text drafting
      lead_scorer.py         # AI contact lead scoring
      property_matcher.py    # AI contact-to-property matching
      prospect_scorer.py     # AI prospect motivation scoring
      outreach_generator.py  # AI personalized outreach (tone-adapted per type)
      prospect_data.py       # ATTOM Data API integration
      prospect_enrichment.py # ATTOM enrichment + DNC check + compliance validation
      market_data.py         # Realty Mole API integration
      county_data.py         # Free county/parish portal scrapers (LA, AR, MS)
      skip_trace.py          # Skip tracing service (pluggable providers)
      compliance.py          # TCPA enforcement (contact hours, opt-out, DNC, medium rules)
      scheduler.py           # APScheduler drip-send sweep (compliance-gated dispatch + retries)
      email_sender.py        # Resend transactional email sender
      sms_sender.py          # Twilio SMS sender (with E.164 normalization)
      geocoder.py            # Nominatim geocoder (1.1s throttle, no API key)
    prompts/
      system_prompts.py      # 10 system prompts (agent, listing, comp, comm, lead score,
                             #   property match, prospect score, outreach, campaign insights,
                             #   dashboard insights)
      templates.py           # Prompt templates with {placeholders} for data injection
frontend/
  src/
    app/
      page.tsx               # Dashboard (stats, pipeline, top prospects, campaigns, hot leads)
      ai/page.tsx             # AI assistant (chat, listing gen, comm drafting)
      properties/page.tsx     # Property list with filters
      properties/new/page.tsx # Create property form
      properties/[id]/page.tsx # Property detail + edit
      contacts/page.tsx       # Contact list with filters
      contacts/[id]/page.tsx  # Contact detail + AI scoring + matching
      prospects/page.tsx      # Prospect list with filters + bulk actions
      prospects/search/page.tsx # ATTOM public record search + import
      prospects/[id]/page.tsx # Prospect detail + scoring + outreach + enrichment
      outreach/page.tsx       # Campaign dashboard + create
      outreach/[id]/page.tsx  # Campaign detail + drip sequence builder + messages + insights
      map/page.tsx            # Farm Map (Leaflet heat + markers, SSR-disabled)
    components/
      layout/Sidebar.tsx      # Navigation (Dashboard, AI, Properties, Contacts, Prospects, Outreach, Farm Map)
      map/ProspectMap.tsx     # Leaflet + react-leaflet map with heat layer, popups, auto-fit
      ui/LeadScoreBadge.tsx   # Contact score badge (hot/warm/moderate/cool/cold)
      ui/ProspectScoreBadge.tsx # Prospect score badge (highly motivated/strong/moderate/low/unlikely)
      ui/StatusBadge.tsx       # Status + type badges
      ui/FilterBar.tsx         # Reusable filter bar (text, select)
      ui/ActivityTimeline.tsx  # Activity timeline display
    lib/
      api.ts                  # Axios client with 50+ API functions
      types.ts                # 25+ TypeScript interfaces mirroring backend schemas
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | — | Your Anthropic API key |
| `DATABASE_URL` | No | `sqlite+aiosqlite:///./newgen_realty.db` | Database connection string |
| `AI_MODEL` | No | `claude-sonnet-4-20250514` | Claude model for quality tasks (scoring, outreach, listings) |
| `AI_MODEL_FAST` | No | `claude-haiku-4-5-20251001` | Claude model for speed tasks (chat, dashboard insights) |
| `DAILY_REQUEST_LIMIT` | No | `100` | Daily AI request limit |
| `REALTY_MOLE_API_KEY` | No | — | Market comps API ([RapidAPI](https://rapidapi.com/realtymole/api/realty-mole-property-api)) |
| `ATTOM_API_KEY` | No | — | Prospecting engine API ([attomdata.com](https://www.attomdata.com/)) |
| `SKIP_TRACE_PROVIDER` | No | `free` | Skip trace provider: `free` (stub) or `batchskiptracing` |
| `SKIP_TRACE_API_KEY` | No | — | API key for paid skip trace provider |
| `RESEND_API_KEY` | No | — | Resend API key for transactional email sending |
| `RESEND_FROM_EMAIL` | No | — | Verified from-address for Resend (e.g. `agent@yourdomain.com`) |
| `TWILIO_ACCOUNT_SID` | No | — | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | No | — | Twilio auth token |
| `TWILIO_FROM_NUMBER` | No | — | Twilio phone number in E.164 format (e.g. `+12255551234`) |
| `INBOUND_WEBHOOK_SECRET` | No | — | HMAC secret for validating Resend/Twilio webhooks. Unset = accept all (dev only). |
| `SCHEDULER_ENABLED` | No | `true` | Enable the drip scheduler (disable in tests) |
| `SCHEDULER_TICK_SECONDS` | No | `60` | How often the scheduler sweeps for due messages |
| `SCHEDULER_BATCH_SIZE` | No | `50` | Max messages dispatched per tick |
| `DAILY_SEND_CAP_EMAIL` | No | `500` | Global daily email cap (per-campaign override via `daily_send_cap`) |
| `DAILY_SEND_CAP_SMS` | No | `200` | Global daily SMS cap |
| `GEOCODE_PROVIDER` | No | `nominatim` | Geocoder: `nominatim` (free) |
| `GEOCODE_USER_AGENT` | No | `newgen-realty/0.2` | User-Agent sent to Nominatim (required by their ToS) |
| `MAX_TOKENS_CHAT` | No | `1024` | Max tokens for chat responses |
| `MAX_TOKENS_LISTING` | No | `1500` | Max tokens for listing generation |
| `MAX_TOKENS_ANALYSIS` | No | `2000` | Max tokens for analysis responses |
| `MAX_TOKENS_PROSPECT_SCORE` | No | `1000` | Max tokens for prospect scoring |
| `MAX_TOKENS_OUTREACH` | No | `800` | Max tokens for outreach generation |
| `MAX_TOKENS_CAMPAIGN_INSIGHTS` | No | `1500` | Max tokens for campaign analytics |

## License

Private — all rights reserved. See `LICENSE` for full terms.
