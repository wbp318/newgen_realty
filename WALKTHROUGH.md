# NewGen Realty AI — Full Walkthrough

A complete step-by-step guide to using every feature of the platform. Follow this in order for the best experience — each section builds on the previous one.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Add Your First Property](#3-add-your-first-property)
4. [AI Listing Generator](#4-ai-listing-generator)
5. [Market Comps & AI Pricing](#5-market-comps--ai-pricing)
6. [Add Your First Contact](#6-add-your-first-contact)
7. [AI Lead Scoring](#7-ai-lead-scoring)
8. [AI Property Matching](#8-ai-property-matching)
9. [AI Communication Drafter](#9-ai-communication-drafter)
10. [AI Chat Assistant](#10-ai-chat-assistant)
11. [Prospecting Engine — Search Public Records](#11-prospecting-engine--search-public-records)
12. [Prospect Detail & Enrichment](#12-prospect-detail--enrichment)
13. [AI Prospect Scoring](#13-ai-prospect-scoring)
14. [AI Outreach Generation](#14-ai-outreach-generation)
15. [Skip Tracing — Find Contact Info](#15-skip-tracing--find-contact-info)
16. [Bulk Operations](#16-bulk-operations)
17. [Outreach Campaigns](#17-outreach-campaigns)
18. [Campaign Analytics](#18-campaign-analytics)
19. [Convert Prospect to Contact](#19-convert-prospect-to-contact)
20. [Dashboard Insights](#20-dashboard-insights)
21. [What Makes This a Gap-Filler](#21-what-makes-this-a-gap-filler)

---

## 1. Getting Started

### Start the servers

```bash
# Terminal 1 — Backend
cd backend
source venv/Scripts/activate   # Windows Git Bash
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Or use the convenience scripts:
```bash
start.bat    # starts both
stop.bat     # stops both
```

### Open the app

Navigate to **http://localhost:3000** in your browser. You'll see the dashboard.

### Environment setup

Your `backend/.env` file should have at minimum:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
DATABASE_URL=sqlite+aiosqlite:///./newgen_realty.db
```

Optional keys unlock additional features:

| Key | What it unlocks | Where to get it |
|-----|-----------------|-----------------|
| `REALTY_MOLE_API_KEY` | Real comparable sales data for AI pricing | [RapidAPI](https://rapidapi.com/realtymole/api/realty-mole-property-api) |
| `ATTOM_API_KEY` | Public record prospect searches (absentee owners, foreclosures, etc.) | [attomdata.com](https://www.attomdata.com/) |
| `SKIP_TRACE_API_KEY` | Find phone/email for prospects | [BatchSkipTracing.com](https://www.batchskiptracing.com/) |

---

## 2. Dashboard Overview

The dashboard at `/` shows everything at a glance:

- **Stats row** — Total properties, active listings, contacts, leads, portfolio value
- **AI Insights panel** — Click "Generate Insights" for AI analysis of your entire portfolio
- **Prospect Pipeline** — Funnel showing prospects by status (new → researching → qualified → contacted → responding → converted)
- **Top Prospects** — Highest-scored uncontacted prospects
- **Active Campaigns** — Outreach campaigns with progress bars
- **Hot Leads** — Contacts with AI lead scores of 60+
- **Recent Activity** — Timeline of all actions (calls, emails, AI actions, etc.)
- **Quick Actions** — Find Prospects, AI Assistant, Add Property

The dashboard gets more useful as you add data. Start by adding properties and contacts.

---

## 3. Add Your First Property

1. Click **Properties** in the sidebar (or "Add Property" on the dashboard)
2. Click **+ Add Property**
3. Fill in the form:
   - **Address**: `456 Oak Avenue`
   - **City**: `Baton Rouge`
   - **Parish**: `East Baton Rouge` (auto-labels as "County" for AR/MS)
   - **State**: `LA`
   - **Zip**: `70808`
   - **Type**: Single Family
   - **Status**: Active
   - **Price**: `275000`
   - **Beds**: 3, **Baths**: 2, **SqFt**: 1,800
   - **Year Built**: 1995
4. Click **Save**

The property appears in your list. Click it to see the detail page.

**Pro tip**: Add 3-5 properties in different parishes/counties and price ranges. This gives the AI more data for lead scoring and property matching.

---

## 4. AI Listing Generator

From any property detail page:

1. Scroll to the AI section or go to `/ai`
2. Select **Generate Listing** in the quick actions sidebar on the AI page
3. Choose a tone: **Professional**, **Luxury**, **Casual**, or **Investor**
4. Click **Generate**

The AI writes a full MLS listing description with:
- An attention-grabbing headline
- 150-300 word description highlighting the property's best features
- State-specific details (flood zone awareness for LA, tornado shelter mentions for AR, Gulf Coast features for MS)

You can regenerate with different tones until you find the right fit.

---

## 5. Market Comps & AI Pricing

**Requires `REALTY_MOLE_API_KEY`** (without it, you can manually enter comps)

### Auto Comp Analysis (recommended)

1. Go to a property detail page
2. Click **Auto Comp Analysis**
3. The system:
   - Fetches real comparable sales from the Realty Mole API
   - Feeds them to Claude for pricing analysis
   - Returns a **suggested price**, **price range** (low-high), and **detailed analysis**
   - Saves the AI-suggested price to the property

### Manual Comp Analysis

1. Go to `/ai`
2. Select **Analyze Comps**
3. Enter the subject property details and comparable sales manually
4. Get AI-powered pricing recommendations

---

## 6. Add Your First Contact

1. Click **Contacts** in the sidebar
2. Click **+ Add Contact**
3. Fill in:
   - **First Name**: `John`
   - **Last Name**: `Smith`
   - **Email**: `john@example.com`
   - **Phone**: `225-555-1234`
   - **Type**: Buyer
   - **Notes**: `Looking for 3br in East Baton Rouge, budget $200-300k`
4. Click **Save Contact**

On the contact detail page, add preferences:
- Click **Edit**
- Set **Budget Min**: `200000`, **Budget Max**: `300000`
- **Preferred Parishes**: `East Baton Rouge, Livingston`
- **Preferred Property Types**: `single_family`
- Click **Save Changes**

---

## 7. AI Lead Scoring

1. Go to a contact detail page (e.g., `/contacts/{id}`)
2. Click **Score Lead**
3. The AI:
   - Evaluates the contact against your inventory
   - Reviews their activity history
   - Considers budget alignment, location preferences, engagement level
   - Returns a score (0-100) with reasoning and a suggested next action

**Score ranges:**
- 80-100: **Hot** — ready to transact
- 60-79: **Warm** — good potential
- 40-59: **Moderate** — needs nurturing
- 20-39: **Cool** — early stage
- 0-19: **Cold** — minimal match

Scored contacts appear in **Hot Leads** on the dashboard (60+).

---

## 8. AI Property Matching

1. Go to a contact detail page
2. Click **Find Matches**
3. The AI compares the contact's preferences (budget, location, type) against all active properties
4. Returns ranked matches with:
   - **Match score** (0-100%)
   - **Reason** why each property is a good or poor fit
   - Direct links to the property detail page

Only properties scoring 30+ are shown. Best matches appear first.

---

## 9. AI Communication Drafter

1. Go to `/ai`
2. Select **Draft Communication**
3. Fill in:
   - **Recipient**: `John Smith`
   - **Medium**: Email or Text
   - **Purpose**: Follow-up, Outreach, Offer, Price Reduction, etc.
   - **Tone**: Professional, Friendly, Urgent
   - **Context**: Any additional info (e.g., "Showed him 456 Oak Ave last week, seemed interested")
4. Click **Generate**

For emails, you get a subject line + body. For texts, you get a concise message under 300 characters.

---

## 10. AI Chat Assistant

1. Click **AI Assistant** in the sidebar (or `/ai`)
2. Type any real estate question:
   - _"What's the homestead exemption in Louisiana?"_
   - _"How does redhibition work for seller disclosures?"_
   - _"Compare the NW Arkansas and Baton Rouge markets for investment properties"_
   - _"What should I know about flood zones in Jefferson Parish?"_

The AI knows state-specific law for LA, AR, and MS — civil law vs common law, parish vs county terminology, local market details.

**Conversations auto-save** and can be resumed from the sidebar.

---

## 11. Prospecting Engine — Search Public Records

This is where NewGen becomes a gap-filler. No other tool combines public record search + AI scoring + AI outreach in one platform.

**Requires `ATTOM_API_KEY`** for live searches. Without it, you can add prospects manually.

### Search for motivated sellers

1. Click **Prospects** in the sidebar
2. Click **Search Public Records** (or go to `/prospects/search`)
3. Configure your search:
   - **Search Type**: Choose one:
     - **Absentee Owners** — Owner lives elsewhere (landlords, inherited homes)
     - **Pre-Foreclosure** — Notice of Default filed (financial distress)
     - **Long-Term Owners** — 10+ years ownership (sitting on equity)
     - **Tax Delinquent** — Overdue property taxes
     - **Vacant Properties** — Unoccupied (carrying cost burden)
   - **State**: LA, AR, or MS
   - **Parish/County**: e.g., `Jefferson` or `Pulaski`
   - **City** (optional): narrow to a specific city
   - **Zip Code** (optional): narrow to a zip
   - **Max Results**: 50 (default)
4. Click **Search Public Records**

The system:
- Calls the ATTOM Data API
- Returns property records with owner names, addresses, valuations
- **Auto-deduplicates** — skips properties already in your database
- Imports new prospects with all their data

You'll see a results summary: "Found 47, imported 42, skipped 5 duplicates."

### Manual prospect entry

If you don't have an ATTOM key, click **+ Add Prospect** (future feature) or use the API:

```bash
curl -X POST http://localhost:8000/api/prospects \
  -H "Content-Type: application/json" \
  -d '{
    "property_address": "789 Elm St",
    "property_city": "Metairie",
    "property_parish": "Jefferson",
    "property_state": "LA",
    "property_zip": "70001",
    "prospect_type": "absentee_owner",
    "first_name": "Jane",
    "last_name": "Doe",
    "motivation_signals": {"absentee": true, "ownership_years": 12}
  }'
```

---

## 12. Prospect Detail & Enrichment

Click any prospect to see their detail page at `/prospects/{id}`.

### What you see

- **Owner Details** — Name, email, phone, mailing address, data source
- **Property Details** — Address, city, parish/county, SqFt, beds/baths, year built, assessed value, market value, AVM estimate, last sale info
- **Motivation Signals** — Visual display of why this prospect may sell (absentee, tax delinquent amount, ownership years, vacancy, etc.)
- **AI Prospect Score** — Score and reasoning (if scored)
- **TCPA Compliance** — Consent status, DNC list status, opt-out tracking

### Enrich with ATTOM Data

1. Click **Enrich with ATTOM Data** in Quick Actions
2. Pulls additional property details + AVM (Automated Valuation Model) estimate
3. Updates the prospect with richer data for better scoring

---

## 13. AI Prospect Scoring

1. Go to a prospect detail page
2. Click **Score Prospect** (or **Rescore Prospect**)
3. The AI evaluates:
   - **Type signals (40%)**: absentee+tax delinquent=very high, pre-foreclosure=high urgency, long-term=moderate
   - **Equity position (20%)**: calculated from AVM vs last sale price
   - **Market timing (15%)**: local appreciation and market conditions
   - **Property condition (15%)**: age, vacancy, tax delinquency amount
   - **Data completeness (10%)**: more contact info = higher actionability
4. Returns:
   - **Score** (0-100)
   - **Motivation level** (high/medium/low)
   - **Reasoning** referencing specific data points
   - **Suggested approach** (e.g., "personalized letter emphasizing equity")
   - **Suggested outreach type** (letter/email/text/phone)

**Score ranges:**
- 85-100: **Highly Motivated** — multiple distress signals, act immediately
- 70-84: **Strong** — clear motivation, prioritize outreach
- 50-69: **Moderate** — worth including in campaigns
- 30-49: **Low** — batch outreach only
- 0-29: **Unlikely** — no clear motivation

Scored prospects appear in **Top Prospects** on the dashboard.

---

## 14. AI Outreach Generation

From a prospect detail page, generate personalized outreach:

1. In Quick Actions, click **Email**, **Letter**, or **Text**
2. The AI drafts a message tailored to:
   - The prospect's **type** (tone adapts — empathetic for foreclosure, sensitive for probate, business-focused for absentee)
   - Their **property details** (references address, area, estimated value)
   - Their **specific situation** (key motivation signal highlighted)
3. The generated message appears in the sidebar with:
   - Subject line (emails only)
   - Full message body
   - **Compliance flags** (warnings if no consent, on DNC list, etc.)

### Tone by prospect type

| Type | Tone | Key approach |
|------|------|-------------|
| Pre-foreclosure | Empathetic | Never says "foreclosure" — offers options and help |
| Probate | Sensitive | Acknowledges loss, simplifies the process |
| Absentee owner | Business-focused | Hassle-free sale, remove management burden |
| Long-term owner | Congratulatory | Equity growth, market timing opportunity |
| Tax delinquent | Helpful | Resolve tax situation through sale |
| Vacant | Practical | Carrying costs, liability, convert to cash |
| FSBO | Respectful | Professional support, broader exposure |

---

## 15. Skip Tracing — Find Contact Info

Many prospects from public records have no phone or email. Skip tracing finds this info.

### Single prospect

1. Go to a prospect detail page
2. Click **Skip Trace (Find Contact Info)**
3. The system searches for phone numbers, email addresses, and mailing addresses
4. Found data auto-updates the prospect record

### How it works

- **Default ("free" provider)**: Returns no data — it's a framework stub
- **Paid provider**: Set `SKIP_TRACE_PROVIDER=batchskiptracing` and `SKIP_TRACE_API_KEY` in `.env` for real results (~$0.15/record)
- Results include confidence levels (high/medium/low) for each contact method found

---

## 16. Bulk Operations

On the **Prospects** list page (`/prospects`), three bulk action buttons appear when you have prospects:

### Bulk Score
- Scores all **unscored** prospects using AI
- Shows average score when done
- Uses AI credits (one API call per prospect)

### DNC Check
- Checks the Do Not Call list for all prospects with **unchecked phone numbers**
- Reports how many are on the DNC list
- Flags them in the UI so you don't contact them

### Skip Trace
- Runs skip tracing for all prospects **missing contact info** (no phone and no email)
- Reports how many were updated with new data
- Requires a paid skip trace provider for real results

---

## 17. Outreach Campaigns

Campaigns organize your outreach efforts at scale.

### Create a campaign

1. Click **Outreach** in the sidebar
2. Click **+ New Campaign**
3. Fill in:
   - **Name**: e.g., "Jefferson Parish Absentee Owners — April 2026"
   - **Type**: Email, Letter, or Text
   - **Prospect List** (optional): Select a saved prospect list
   - **Description**: Optional notes
4. Click **Create Campaign**

### Generate messages

**From a prospect detail page:**
- Click Email/Letter/Text → message is generated and saved to the campaign

**Bulk generation (from campaign detail):**
- Requires a prospect list assigned to the campaign
- Generates AI-personalized messages for every prospect in the list
- Skips prospects marked "do not contact"
- Flags compliance issues (no consent, on DNC list)

### Track messages

Campaign detail page (`/outreach/{id}`) shows:
- **Stats**: Total messages, sent, delivered, opened, replied (with percentages)
- **Messages table**: Click any row to expand and read the full message body
- **Status badges**: draft → sent → delivered → opened → replied
- **Compliance column**: Green "Clear" or amber flags

### Manage campaign status

- **Draft** → Click **Activate** to start
- **Active** → Click **Pause** to hold
- **Paused** → Click **Resume** to continue

---

## 18. Campaign Analytics

1. Go to a campaign detail page
2. Click **AI Insights**
3. The AI analyzes:
   - Response rates by prospect type and medium
   - What's working vs. what to change
   - Specific optimization suggestions
4. Full analysis viewable in expandable "Full analysis" section

---

## 19. Convert Prospect to Contact

When a prospect responds or qualifies:

1. Go to their prospect detail page
2. Click **Convert to Contact** in Quick Actions
3. The system:
   - Creates a new Contact record with their info
   - Sets contact type to "lead" with source tracking (e.g., `prospect_absentee_owner`)
   - Links the prospect to the contact
   - Marks the prospect as "converted"
   - Logs the conversion as an activity
4. You're redirected to the new contact record

From there, use the full CRM: score leads, match properties, draft communications, log activities.

---

## 20. Dashboard Insights

Once you have properties, contacts, and prospects:

1. Go to the Dashboard (`/`)
2. Click **Generate Insights**
3. The AI analyzes your entire portfolio:
   - **Market Observations**: Patterns in listings, leads, location concentration
   - **Action Items**: Specific things to do today/this week
   - **Opportunities**: Gaps between what contacts want and what's available

Example insight: _"3 buyers want Benton County AR but you have 0 listings there — consider prospecting in that area."_

---

## 21. What Makes This a Gap-Filler

### The problem today

Real estate agents use 5-8 separate tools:

| Need | Typical tool | Cost/month |
|------|-------------|-----------|
| Find motivated sellers | PropStream | $99 |
| Find contact info | BatchLeads | $99 |
| CRM + pipeline | Follow Up Boss | $69 |
| Write outreach | ChatGPT (manual copy-paste) | $20 |
| Track campaigns | Mailchimp or spreadsheet | $0-50 |
| Market comps | MLS + manual analysis | Included in MLS dues |
| Compliance checking | Manual / hope | $0 |

**Total: $300-400/month across disconnected tools** with manual copy-paste between them.

### What NewGen does differently

**One platform** that connects the entire pipeline:

```
Search public records (ATTOM)
    ↓
Import prospects with property + owner data
    ↓
AI scores 0-100 based on motivation signals
    ↓
AI generates personalized outreach (email/letter/text)
    ↓
Track campaigns with delivery + response metrics
    ↓
AI analyzes campaign performance
    ↓
Convert qualified prospects to CRM contacts
    ↓
AI lead scoring + property matching + communications
    ↓
Close the deal
```

Every step feeds data to the next. The AI gets smarter about your market as you add more properties, contacts, and prospects.

### Key differentiators

1. **AI-personalized outreach per prospect type** — Not generic templates. A pre-foreclosure gets an empathetic letter. An absentee owner gets a business-focused email. A probate heir gets a sensitive message acknowledging their loss.

2. **TCPA compliance built into every action** — Consent tracking, DNC checking, contact hours enforcement, opt-out processing. The platform prevents $1,500/violation mistakes.

3. **Multi-state intelligence** — Knows the difference between Louisiana parishes and Arkansas counties, civil law vs common law, redhibition vs standard disclosure, flood zones vs tornado alley.

4. **Public records → AI scoring → Outreach → CRM** in one pipeline — No copy-pasting between tools. Import a prospect, score them, generate outreach, track the campaign, convert to a contact, and close — all in one platform.

5. **Pluggable data sources** — ATTOM for the core data, county portals for free supplementary records, skip tracing providers for contact enrichment. Add new sources without rebuilding.

---

## API Quick Reference

If you want to test via the API directly:

```bash
# Health check
curl http://localhost:8000/api/health

# List properties
curl http://localhost:8000/api/properties

# List contacts
curl http://localhost:8000/api/contacts

# List prospects
curl http://localhost:8000/api/prospects

# Check ATTOM status
curl http://localhost:8000/api/prospects/status

# AI chat
curl -X POST http://localhost:8000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is redhibition in Louisiana?"}]}'

# AI usage stats
curl http://localhost:8000/api/ai/usage

# List outreach campaigns
curl http://localhost:8000/api/outreach/campaigns

# Available county data sources
curl http://localhost:8000/api/prospects/county-sources
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Backend won't start | Check `backend/.env` exists with valid `ANTHROPIC_API_KEY` |
| Frontend blank page | Run `npm install` in `frontend/`, then `npm run dev` |
| AI features return errors | Check `ANTHROPIC_API_KEY` is valid, check `/api/ai/usage` for daily limits |
| ATTOM search returns 503 | `ATTOM_API_KEY` not set — add to `backend/.env` |
| Prospect scoring fails | Make sure the prospect has property data (try enriching first) |
| Port already in use | Run `stop.bat` or kill processes on ports 3000/8000 manually |
| Database errors | Delete `backend/newgen_realty.db` and restart — tables auto-create |
