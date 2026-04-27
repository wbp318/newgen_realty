# NewGen Realty AI — Complete Guide

Everything you need to know to use the platform. Terms, statuses, workflows, and how every piece connects.

---

## Table of Contents

1. [Core Concepts](#1-core-concepts)
2. [Terms & Definitions](#2-terms--definitions)
3. [Property Workflow](#3-property-workflow)
4. [Contact Workflow](#4-contact-workflow)
5. [Prospect Workflow](#5-prospect-workflow)
6. [Outreach Campaign Workflow](#6-outreach-campaign-workflow)
7. [AI Features Reference](#7-ai-features-reference)
8. [TCPA Compliance Guide](#8-tcpa-compliance-guide)
9. [Multi-State Reference](#9-multi-state-reference)
10. [Prospect Types Explained](#10-prospect-types-explained)
11. [Scoring Systems](#11-scoring-systems)
12. [Data Sources](#12-data-sources)
13. [Activity Types](#13-activity-types)
14. [Status Reference](#14-status-reference)
15. [Complete Pipeline — End to End](#15-complete-pipeline--end-to-end)
16. [Farm Map](#16-farm-map)

---

## 1. Core Concepts

NewGen Realty has four main entities that work together:

```
PROSPECT ──(convert)──→ CONTACT
    │                       │
    │                       ├── matched to → PROPERTY
    │                       ├── scored by → AI LEAD SCORING
    │                       └── tracked via → ACTIVITIES
    │
    ├── scored by → AI PROSPECT SCORING
    ├── outreach via → OUTREACH CAMPAIGNS
    └── found via → ATTOM / COUNTY RECORDS
```

### Property
A real estate listing you're selling or managing. Has an address, price, details, and status. AI can generate listing descriptions and suggest pricing.

### Contact
A person in your CRM you're actively working with — a buyer, seller, lead, or both. Has preferences, budget, and an AI lead score. This is someone you know and are communicating with.

### Prospect
A cold lead found from **public records**. You don't know them yet — you found them through data (absentee owner records, foreclosure filings, tax records, etc.). Prospects live in a separate pipeline from contacts. When a prospect responds or qualifies, you **convert** them into a contact.

### Outreach Campaign
An organized effort to contact a group of prospects. Contains AI-generated messages (emails, letters, texts) with delivery tracking and compliance checks.

---

## 2. Terms & Definitions

### Real Estate Terms

| Term | Definition |
|------|-----------|
| **Parish** | Louisiana's equivalent of a county. LA has 64 parishes. Always say "parish" for LA, "county" for AR and MS. |
| **MLS** | Multiple Listing Service — the database where agents list properties for sale. Access requires a real estate license and MLS membership. |
| **Comp / Comparable** | A recently sold property similar to yours, used to determine market value. |
| **AVM** | Automated Valuation Model — a computer-generated property value estimate based on public data (similar to a Zillow Zestimate). |
| **CMA** | Comparative Market Analysis — a formal pricing report using comparable sales. |
| **Assessed Value** | The value a county/parish assessor assigns for property tax purposes. Usually lower than market value. |
| **Market Value** | What a property would likely sell for on the open market. |
| **Equity** | Market value minus what's owed. A homeowner who bought for $150k and the home is now worth $250k has ~$100k in equity. |
| **Absentee Owner** | Someone who owns a property but lives at a different address. Often landlords or people who inherited. |
| **Pre-Foreclosure** | A property where the owner has received a Notice of Default (NOD) — they've missed payments and the lender has started the foreclosure process. The owner hasn't lost the property yet. |
| **Notice of Default (NOD)** | A legal filing by a lender when a homeowner misses mortgage payments. This is public record. |
| **Probate** | The legal process of settling a deceased person's estate. Probate properties are often sold by heirs who want a quick, hassle-free sale. |
| **FSBO** | For Sale By Owner — a property listed for sale without a real estate agent. |
| **Expired Listing** | A property that was listed on the MLS but didn't sell before the listing contract ended. The seller may be frustrated and open to a new agent. |
| **Redhibition** | Louisiana-specific. The seller's obligation to disclose known defects. Buyers can pursue legal action for undisclosed defects within 1-4 years. Only applies in LA. |
| **Usufruct** | Louisiana-specific. The right to use property owned by someone else. Common in estate planning — a surviving spouse may have usufruct of the family home. |
| **Community Property** | Louisiana is a community property state — property acquired during marriage is presumed to belong to both spouses equally. AR and MS use equitable distribution instead. |
| **Homestead Exemption** | A tax break for primary residences. LA: up to $75,000 off assessed value. AR: up to $375/year credit. MS: first $7,500 of assessed value. |
| **Deed of Trust** | Mississippi uses deeds of trust instead of mortgages. Foreclosures are typically non-judicial (no court required). |
| **Right of Redemption** | Arkansas allows foreclosed homeowners to buy back their property within 1 year of foreclosure sale. |

### Platform Terms

| Term | Definition |
|------|-----------|
| **Prospect Score** | AI-generated 0-100 score predicting how likely a property owner is to sell. Based on motivation signals, equity, market timing, and data quality. |
| **Lead Score** | AI-generated 0-100 score for CRM contacts predicting how likely they are to complete a transaction. Based on budget alignment, activity, and inventory match. |
| **Motivation Signals** | Data points suggesting a property owner may be motivated to sell — absentee ownership, tax delinquency, vacancy, foreclosure status, long ownership duration, etc. |
| **Skip Tracing** | The process of finding contact information (phone, email, address) for a person using public records and data aggregators. |
| **DNC List** | The national Do Not Call Registry. It's illegal to cold-call numbers on this list without prior consent. Penalties up to $1,500 per violation. |
| **TCPA** | Telephone Consumer Protection Act — federal law governing phone calls, texts, and faxes. Requires consent, restricts contact hours, mandates opt-out processing. |
| **Enrichment** | Pulling additional data from ATTOM to fill in missing property details, AVM estimates, and owner information for a prospect. |
| **Conversion** | The act of turning a prospect (cold lead) into a contact (active CRM record) when they respond or qualify. |
| **Campaign** | An organized outreach effort targeting a group of prospects with AI-generated messages. |

---

## 3. Property Workflow

```
CREATE (draft) → ACTIVATE (active) → RECEIVE OFFER (pending) → CLOSE (sold)
                        │
                        ├── AI generates listing description
                        ├── AI suggests price via comp analysis
                        ├── AI matches to buyer contacts
                        └── Appears in dashboard portfolio value
                        
                   or → WITHDRAW (withdrawn) if pulled off market
```

### Statuses

| Status | Meaning | What happens |
|--------|---------|-------------|
| **Draft** | Just entered, not ready | Default for new properties. Not included in AI matching or portfolio stats. |
| **Active** | Live listing | Included in lead scoring, property matching, portfolio value, and dashboard stats. |
| **Pending** | Under contract | Still visible but marked as pending. |
| **Sold** | Closed | Moves to sold history. |
| **Withdrawn** | Off market | Removed from active inventory. |

### Key actions on a property

- **Edit** — Update any field (price, details, status)
- **Generate Listing** — AI writes MLS description
- **Auto Comp Analysis** — Fetch real comps + AI pricing (requires Realty Mole key)
- **Delete** — Remove permanently

### Tips
- Set properties to **active** for them to count in AI analysis
- Add multiple properties across different parishes/counties for better AI insights
- The AI considers your entire active inventory when scoring leads

---

## 4. Contact Workflow

```
CREATE (lead) → SCORE → MATCH PROPERTIES → COMMUNICATE → CLOSE
    │
    ├── Type: buyer, seller, both, or lead
    ├── AI scores 0-100 based on inventory match + activity
    ├── AI matches to best properties
    ├── AI drafts personalized emails/texts
    └── Activity timeline tracks all interactions
```

### Contact Types

| Type | Meaning |
|------|---------|
| **Lead** | Someone who's expressed interest but you don't know their intent yet. Default type. |
| **Buyer** | Actively looking to purchase property. |
| **Seller** | Has property to sell or is considering selling. |
| **Both** | Selling one property and buying another. |

### Key actions on a contact

- **Edit** — Update info, preferences, budget, parishes
- **Score Lead** — AI evaluates against your inventory and their activity
- **Find Matches** — AI recommends best properties for this contact
- **Log Activity** — Record calls, emails, showings, meetings, notes

### Preferences you should fill in
- **Budget Min/Max** — Price range they're looking in
- **Preferred Parishes/Counties** — Where they want to be
- **Preferred Property Types** — single_family, condo, land, etc.
- **Preferred Cities** — Specific cities within their parishes/counties

The more preference data you enter, the better AI scoring and matching works.

---

## 5. Prospect Workflow

This is the prospecting engine — the core differentiator.

```
SEARCH PUBLIC RECORDS
    ↓
IMPORT PROSPECTS (auto-deduplicates)
    ↓
ENRICH with ATTOM data + AVM
    ↓
SKIP TRACE to find phone/email
    ↓
AI SCORE 0-100 (motivation signals)
    ↓
AI GENERATE OUTREACH (email/letter/text)
    ↓
TRACK via CAMPAIGNS
    ↓
CONVERT to CONTACT when they respond
    ↓
FULL CRM WORKFLOW (score, match, close)
```

### Prospect Statuses

| Status | Meaning | Next step |
|--------|---------|-----------|
| **New** | Just imported from public records | Enrich, score, or research further |
| **Researching** | You're gathering more info | Enrich with ATTOM, skip trace for contact info |
| **Qualified** | Has strong motivation signals, worth contacting | Generate outreach, add to campaign |
| **Contacted** | You've sent outreach | Wait for response, follow up |
| **Responding** | They've replied or engaged | Have a conversation, qualify further |
| **Converted** | Became a CRM contact | Work them in the contact pipeline |
| **Not Interested** | They said no | Archive, maybe revisit later |
| **Do Not Contact** | They requested no contact or are on DNC | Never contact again. System blocks outreach. |

### Recommended workflow

1. **Search** — Use `/prospects/search` to find prospects by type and location
2. **Bulk Score** — Score all imported prospects to prioritize
3. **Review top scores** — Focus on 70+ scores first
4. **Enrich** — Pull more ATTOM data for your top prospects
5. **Skip Trace** — Find contact info for prospects without phone/email
6. **Create Campaign** — Organize outreach by prospect type and area
7. **Generate Outreach** — AI creates personalized messages
8. **Track Responses** — Update message statuses as responses come in
9. **Convert** — Move responding prospects to your CRM

---

## 6. Outreach Campaign Workflow

```
CREATE CAMPAIGN (draft)
    ↓
ASSIGN PROSPECT LIST
    ↓
GENERATE MESSAGES (single or bulk)
    ↓
REVIEW for compliance flags
    ↓
ACTIVATE CAMPAIGN
    ↓
SEND MESSAGES (manual — mark as sent)
    ↓
TRACK: sent → delivered → opened → replied
    ↓
AI CAMPAIGN INSIGHTS
    ↓
OPTIMIZE and repeat
```

### Campaign Statuses

| Status | Meaning |
|--------|---------|
| **Draft** | Being set up, messages being generated |
| **Active** | Outreach is happening |
| **Paused** | Temporarily stopped |
| **Completed** | Campaign finished |

### Message Statuses

| Status | Meaning |
|--------|---------|
| **Draft** | Generated but not sent |
| **Queued** | Ready to send |
| **Sent** | Sent to recipient |
| **Delivered** | Confirmed delivered |
| **Opened** | Recipient opened (email) |
| **Replied** | Recipient responded |
| **Bounced** | Delivery failed |
| **Failed** | Error sending |

### Campaign types

| Type | Best for | Notes |
|------|---------|-------|
| **Email** | Prospects with email addresses | Subject line + body. Best open rates. |
| **Letter** | Prospects with mailing address only | Physical mail. Highest response rate for motivated sellers. Letters don't require TCPA consent. |
| **Text** | Prospects with phone numbers and consent | Short messages. Requires written consent under TCPA. |

---

## 7. AI Features Reference

Every AI feature uses Claude with state-specific knowledge for LA, AR, and MS.

| Feature | What it does | Where to use it |
|---------|-------------|----------------|
| **AI Chat** | General real estate Q&A with state-specific knowledge | `/ai` page |
| **Listing Generator** | Writes MLS property descriptions in 4 tones | `/ai` or property detail |
| **Comp Analysis** | Analyzes comparable sales, suggests pricing | `/ai` or property detail (auto) |
| **Communication Drafter** | Drafts emails and texts for any scenario | `/ai` page |
| **Lead Scoring** | Scores contacts 0-100 on transaction likelihood | Contact detail page |
| **Property Matching** | Matches contacts to best available properties | Contact detail page |
| **Prospect Scoring** | Scores prospects 0-100 on sell motivation | Prospect detail page |
| **Outreach Generation** | Personalized email/letter/text per prospect type | Prospect detail page |
| **Campaign Insights** | Analyzes outreach performance, suggests optimizations | Campaign detail page |
| **Dashboard Insights** | Analyzes entire portfolio, suggests actions | Dashboard |

### AI usage tracking

- Default limit: 100 AI requests per day
- Check usage: Dashboard or `GET /api/ai/usage`
- Each scoring, generation, or chat message counts as 1 request
- Bulk scoring counts as 1 request per prospect

---

## 8. TCPA Compliance Guide

The platform enforces TCPA (Telephone Consumer Protection Act) rules at every step. Violations carry penalties up to **$1,500 per incident**.

### Rules the platform enforces

| Rule | How it's enforced |
|------|------------------|
| **Written consent required for calls/texts** | `consent_status` field on every prospect. Outreach generation flags "no_consent" if not granted. |
| **Do Not Call list** | `dnc_checked` / `dnc_listed` fields. Batch DNC check button. Flagged in outreach. |
| **Contact hours: 8am-9pm** | `compliance.py` checks recipient timezone. Flags "outside_contact_hours" if violated. |
| **Opt-out within 10 business days** | `opt_out_date` + `opt_out_processed` fields. `process_opt_out()` calculates deadline. |
| **Record consent method** | `consent_method` field: "written_letter", "online_form", "verbal_recorded" |

### Consent statuses

| Status | Meaning | Can you contact? |
|--------|---------|-----------------|
| **None** | No consent obtained | Letters only (First Amendment). No email/phone/text. |
| **Pending** | Consent requested, waiting | Letters only. |
| **Granted** | Written consent obtained | All channels allowed. |
| **Denied** | They said no | Letters only (but consider not contacting at all). |
| **Revoked** | Previously granted, now revoked | No contact. |

### What's allowed without consent

- **Physical letters** — Protected by the First Amendment. No TCPA consent needed. However, respect "do not contact" requests.
- **Everything else** (phone, text, email) — Requires written, specific consent under TCPA rules effective January 2025.

### Compliance flags in outreach

When generating outreach, the system checks compliance and returns flags:

| Flag | Meaning | Action |
|------|---------|--------|
| `no_consent` | No written consent on file | Only send letters, or obtain consent first |
| `on_dnc_list` | Phone number is on DNC registry | Do not call or text |
| `pending_opt_out` | Opt-out requested, not yet processed | Do not contact until processed |
| `do_not_contact` | Prospect marked as do-not-contact | Never contact |
| `no_contact_info` | No email, phone, or mailing address | Skip trace first |
| `outside_contact_hours` | Current time is outside 8am-9pm recipient time | Wait until contact hours |

---

## 9. Multi-State Reference

NewGen supports three states with distinct legal and market characteristics.

### Louisiana (LA)

| Aspect | Detail |
|--------|--------|
| Legal system | **Civil Law** (Napoleonic Code) — only US state with this |
| Subdivisions | **64 parishes** (not counties) |
| Property regime | **Community property** — marital property belongs to both spouses |
| Key law | **Redhibition** — sellers must disclose known defects, buyers can sue for 1-4 years |
| Closings | **Civil Law Notary** has broader powers than in other states |
| Special concept | **Usufruct** — right to use property owned by another (common in estates) |
| Tax break | **$75,000 homestead exemption** from property taxes |
| Capital gains | **No state capital gains tax** |
| Key risks | **Flood zones** (FEMA), hurricanes, elevation critical |
| Key markets | New Orleans (Orleans, Jefferson, St. Tammany), Baton Rouge, Lafayette, Shreveport-Bossier, Lake Charles |
| Property styles | Shotgun houses, Creole cottages, raised Acadian, plantation-style |

### Arkansas (AR)

| Aspect | Detail |
|--------|--------|
| Legal system | **Common Law** |
| Subdivisions | **75 counties** |
| Property regime | **Equitable distribution** (not community property) |
| Key law | **Right of Redemption** — foreclosed owners can buy back within 1 year |
| Disclosure | Property Disclosure Form required |
| Tax break | **$375/year homestead credit** |
| Capital gains | Taxed as regular income at **0.9%–4.4%** |
| Property tax | Low average ~**0.62%** |
| Key risks | **Tornado Alley** (central/western AR), storm shelters add value |
| Key markets | Little Rock (Pulaski), NW Arkansas (Benton/Washington — fastest growing US metro), Fort Smith, Jonesboro, Hot Springs |
| Property styles | Ranch homes, farmhouses, log cabins (Ozarks), traditional Southern |

### Mississippi (MS)

| Aspect | Detail |
|--------|--------|
| Legal system | **Common Law** |
| Subdivisions | **82 counties** |
| Property regime | **Equitable distribution** (title theory) |
| Key law | **Deed of Trust** state — non-judicial foreclosures |
| Closings | Effectively requires **attorney involvement** |
| Tax break | First **$7,500 assessed value** exempt (~$300/year savings) |
| Capital gains | Taxed as regular income at **0%–5%** |
| Key risks | **Flood zones** (Mississippi River Delta, Gulf Coast), hurricanes (coastal counties) |
| Key markets | Jackson (Hinds/Rankin/Madison), Gulf Coast (Harrison/Hancock/Jackson), Hattiesburg, Tupelo, Oxford, Southaven/DeSoto |
| Property styles | Antebellum homes, shotgun houses, ranch homes, Gulf Coast cottages |

### How the platform handles multi-state

- The `parish` database column stores parish (LA) or county (AR/MS)
- Frontend dynamically labels "Parish" or "County" based on the `state` field
- AI system prompts include state-specific legal frameworks and market knowledge
- Listing descriptions mention state-appropriate features (flood zones for LA/MS, storm shelters for AR)
- Prospect searches work by state with appropriate terminology

---

## 10. Prospect Types Explained

Each type represents a different motivation signal for why someone might sell.

### Absentee Owner
**What**: Owner's mailing address is different from the property address.
**Why they sell**: Managing a property from afar is a hassle. Maintenance, tenants, taxes — all from a distance. Many are tired landlords or people who inherited and never moved in.
**Outreach approach**: Business-focused. Emphasize hassle-free sale, no more management burden.
**Typical score**: 50-70 (higher if combined with tax delinquency or vacancy)

### Pre-Foreclosure
**What**: The lender has filed a Notice of Default — the owner has missed mortgage payments.
**Why they sell**: Financial distress creates urgency. Selling before foreclosure preserves credit and may yield equity.
**Outreach approach**: Empathetic. Never use the word "foreclosure." Offer options and help navigating the situation.
**Typical score**: 70-90 (high urgency)
**Sensitivity**: High — these people are in financial distress. Be helpful, not predatory.

### Probate / Succession
**What**: Property is part of a deceased person's estate going through probate court.
**Why they sell**: Heirs often want a quick sale — they may live elsewhere, can't afford upkeep, or need to split proceeds among multiple heirs.
**Outreach approach**: Sensitive. Acknowledge the loss. Offer to simplify a complicated process.
**Typical score**: 60-80
**Sensitivity**: Very high — someone died. Lead with empathy.

### Long-Term Owner
**What**: Someone who's owned the property for 10+ years.
**Why they sell**: They may not realize how much equity they've built. Market conditions might make now the right time to cash out.
**Outreach approach**: Congratulatory. "Your property has appreciated significantly." Market timing angle.
**Typical score**: 40-65 (moderate — they're not necessarily motivated)

### Tax Delinquent
**What**: Property taxes are overdue/delinquent.
**Why they sell**: Financial stress signal. If taxes remain unpaid, the property can be sold at a tax sale.
**Outreach approach**: Helpful. Mention that selling could resolve the tax situation and preserve their credit.
**Typical score**: 65-85 (higher with larger delinquent amounts)

### Vacant
**What**: Property appears unoccupied — no utility usage, mail forwarding, or occupancy indicators.
**Why they sell**: Carrying costs (taxes, insurance, maintenance) with zero benefit. Vacant properties also attract vandalism, code violations, and liability.
**Outreach approach**: Practical. Highlight carrying costs, liability risk, and the opportunity to convert a burden into cash.
**Typical score**: 55-75

### FSBO (For Sale By Owner)
**What**: Owner is trying to sell without an agent.
**Why they'll work with you**: They're already motivated to sell but may be frustrated with lack of exposure, lowball offers, or the complexity of the process.
**Outreach approach**: Respectful. Don't insult their effort. Offer the value you bring: broader exposure, negotiation expertise, transaction management.
**Typical score**: 45-60

### Expired Listing
**What**: Property was listed on the MLS but didn't sell before the listing agreement expired.
**Why they'll work with you**: They wanted to sell but their previous agent/strategy didn't work. They may be frustrated and open to a fresh approach.
**Outreach approach**: Professional. Explain what you'd do differently. Don't bash their previous agent.
**Typical score**: 50-70
**Note**: Requires MLS access to find expired listings (future feature).

---

## 11. Scoring Systems

### AI Lead Score (Contacts)

Evaluates CRM contacts on their likelihood to complete a transaction.

| Factor | What it measures |
|--------|-----------------|
| Budget alignment | Does their budget match your available inventory? |
| Location alignment | Do their preferred parishes/counties match your listings? |
| Activity recency | Have they been engaging recently? |
| Contact completeness | Do you have email + phone + preferences? |
| Contact type | Active buyer/seller > lead |
| Source quality | Referral > cold lead |

| Score | Label | Meaning |
|-------|-------|---------|
| 80-100 | **Hot** | Ready to transact, strong match. Act now. |
| 60-79 | **Warm** | Good potential, some gaps. Follow up. |
| 40-59 | **Moderate** | Needs nurturing or more inventory. |
| 20-39 | **Cool** | Early stage, limited match. |
| 0-19 | **Cold** | Minimal engagement or mismatch. |

### AI Prospect Score (Prospects)

Evaluates public record leads on their motivation to sell.

| Factor | Weight | What it measures |
|--------|--------|-----------------|
| Prospect type signals | 40% | Multiple distress signals = higher score |
| Equity position | 20% | More equity = more flexibility |
| Market timing | 15% | Local appreciation, days on market |
| Property condition | 15% | Age, vacancy duration, tax delinquency |
| Data completeness | 10% | Phone + email + address = actionable |

| Score | Label | Meaning |
|-------|-------|---------|
| 85-100 | **Highly Motivated** | Multiple distress signals. Contact immediately. |
| 70-84 | **Strong** | Clear motivation signal. Prioritize outreach. |
| 50-69 | **Moderate** | Some signals. Include in campaigns. |
| 30-49 | **Low** | Minimal signals. Batch outreach only. |
| 0-29 | **Unlikely** | No clear motivation. |

---

## 12. Data Sources

### ATTOM Data API (Primary)
- **Cost**: ~$95/month
- **Coverage**: All 50 states including LA, AR, MS
- **What it provides**: Property records, owner info, assessed values, AVM estimates, deed transfers, foreclosure data, tax records, vacancy indicators, ownership duration
- **Used for**: Prospect search, property enrichment, AVM estimates
- **Config**: Set `ATTOM_API_KEY` in `.env`

### Realty Mole Property API (Market Data)
- **Cost**: Free tier available on RapidAPI
- **Coverage**: National
- **What it provides**: Comparable sales data, property records
- **Used for**: Auto comp analysis, market pricing
- **Config**: Set `REALTY_MOLE_API_KEY` in `.env`

### County/Parish Portals (Free Supplementary)
- **Cost**: Free
- **Louisiana**: Parish assessor portals (Prior Inc platform for Ouachita, Rapides, Lincoln, etc.)
- **Arkansas**: ARCountyData.com (all 75 counties)
- **Mississippi**: County chancery clerk portals
- **What it provides**: Assessed values, owner names, parcel data
- **Used for**: Supplementary data when ATTOM doesn't cover a parish/county

### Skip Tracing Providers
- **Default**: "free" (stub — no data returned)
- **BatchSkipTracing.com**: ~$0.15/record for phone, email, address
- **Config**: Set `SKIP_TRACE_PROVIDER` and `SKIP_TRACE_API_KEY` in `.env`

---

## 13. Activity Types

Activities are automatically logged for most actions. They appear in the activity timeline on contact and prospect detail pages, and on the dashboard.

| Type | Icon | When it's logged |
|------|------|-----------------|
| `call` | 📞 | Manually logged phone call |
| `email` | 📧 | Manually logged email |
| `text` | 💬 | Manually logged text message |
| `showing` | 🏠 | Property showing |
| `meeting` | 🤝 | In-person or virtual meeting |
| `note` | 📝 | General note, or auto-logged when records are updated |
| `ai_action` | 🤖 | Any AI action: scoring, matching, outreach generation, prospect search, enrichment, skip trace |
| `status_change` | 🔄 | Property status change |
| `offer` | 💰 | Offer made or received |

---

## 14. Status Reference

### Property Statuses
| Status | Color | Meaning |
|--------|-------|---------|
| `draft` | Gray | Not ready, not in AI calculations |
| `active` | Green | Live listing, included in all AI features |
| `pending` | Amber | Under contract |
| `sold` | Blue | Closed |
| `withdrawn` | Red | Off market |

### Contact Types
| Type | Color | Meaning |
|------|-------|---------|
| `lead` | Amber | Unknown intent, default |
| `buyer` | Blue | Looking to buy |
| `seller` | Green | Has property to sell |
| `both` | Purple | Buying and selling |

### Prospect Statuses
| Status | Meaning |
|--------|---------|
| `new` | Just imported |
| `researching` | Gathering more info |
| `qualified` | Worth contacting |
| `contacted` | Outreach sent |
| `responding` | They replied |
| `converted` | Now a CRM contact |
| `not_interested` | Declined |
| `do_not_contact` | Blocked from all outreach |

### Campaign Statuses
| Status | Meaning |
|--------|---------|
| `draft` | Being set up |
| `active` | Outreach happening |
| `paused` | Temporarily stopped |
| `completed` | Done |

### Message Statuses
| Status | Meaning |
|--------|---------|
| `draft` | Generated, not sent |
| `queued` | Ready to send |
| `sent` | Sent |
| `delivered` | Confirmed delivered |
| `opened` | Recipient opened |
| `replied` | Recipient responded |
| `bounced` | Failed delivery |
| `failed` | Error |

### Consent Statuses
| Status | Meaning | Allowed channels |
|--------|---------|-----------------|
| `none` | No consent | Letters only |
| `pending` | Requested | Letters only |
| `granted` | Have written consent | All channels |
| `denied` | They said no | Letters only (consider not contacting) |
| `revoked` | Was granted, now revoked | No contact |

---

## 15. Complete Pipeline — End to End

Here's the full workflow from finding a prospect to closing a deal:

### Stage 1: Find Prospects
1. Go to `/prospects/search`
2. Search ATTOM for absentee owners in Jefferson Parish, LA
3. Import 40 prospects

### Stage 2: Score & Prioritize
4. Go to `/prospects`
5. Click **Bulk Score** — AI scores all 40 prospects
6. Sort by score — focus on the 70+ scores

### Stage 3: Enrich & Skip Trace
7. Click the top prospect to view detail
8. Click **Enrich with ATTOM Data** — pulls AVM, full property details
9. Click **Skip Trace** — finds phone number and email
10. Repeat for top 10 prospects

### Stage 4: Create Campaign
11. Go to `/outreach`
12. Create campaign: "Jefferson Parish Absentee Owners — April 2026"
13. Type: Letter (doesn't require consent for first contact)

### Stage 5: Generate Outreach
14. From each prospect detail, click **Letter**
15. AI writes a personalized letter referencing their property, area, and situation
16. Review for compliance flags
17. Or use bulk generation from campaign detail

### Stage 6: Send & Track
18. Print and mail the letters
19. Mark messages as "sent" in the campaign
20. As responses come in, mark as "replied"

### Stage 7: Convert & Close
21. When a prospect responds, go to their detail page
22. Click **Convert to Contact** — creates a CRM record
23. Now use the full CRM: **Score Lead**, **Match Properties**, **Draft Communications**
24. Log calls, showings, and meetings as activities
25. Close the deal

### Stage 8: Optimize
26. Go to campaign detail, click **AI Insights**
27. AI tells you what's working and what to change
28. Create your next campaign with optimized approach
29. Check **Dashboard Insights** for portfolio-wide analysis

---

## 16. Farm Map

`/map` is the geographic view of your business — your "farm." A real-estate farm
is the area you work repeatedly: where you mail, knock, and build name
recognition. The map layers prospects (circles) over properties (squares) so you
can see leads relative to your inventory at a glance.

### What you see

| Shape | What it is | Color by |
|-------|------------|----------|
| Circle | Prospect (cold lead from public records) | AI prospect score (red 80+, amber 60-79, yellow 40-59, blue <40) |
| Square | Property (your inventory) | Status (green active, blue pending, purple sold, gray draft/withdrawn) |

There's also a heat overlay (prospect density only — properties aren't included
in the heat) and a parish/county boundary overlay for LA, AR, and MS.

### How prospects get on the map

Prospects are geocoded automatically:
- **ATTOM search import** — coords are saved at import time
- **Manual create** at `/prospects/new` — geocoded on save
- **Already imported but missing coords** — click "Geocode missing" on `/map`
  to backfill up to 50 at a time

### How properties get on the map

Properties are geocoded automatically:
- **Manual create** at `/properties/new` — geocoded on save
- **Edit** — re-geocoded if you change `street_address`, `city`, `state`, or `zip_code`

### Address rules (both prospects and properties)

The geocoder is OpenStreetMap Nominatim — a real geocoder, free, no key required.

- **Use real addresses.** Fake/test addresses (e.g. "123 Test St, Nowhere") will
  silently fail to geocode. The row gets created but won't appear on the map
  until you fix the address.
- **ZIP code: 5-digit is fine.** ZIP+4 (e.g. `70130-1234`) also works since the
  DB column is `String(10)`, but it gives no extra accuracy. Nominatim relies
  on street + city + state and uses ZIP only as a tiebreaker.
- **Throttle: ~1 second per add** (Nominatim ToS, 1 req/sec global). Creating
  5 prospects in a row takes ~5 seconds total.
- **Geocoding is best-effort.** A failure does not block the create — the row
  is saved with `latitude`, `longitude`, and `geocoded_at` left null.
- **Rural areas may pin at the town center**, not the exact street. OSM has
  spotty street-level coverage in small unincorporated communities. The
  geocoder falls back through: street → city+state+zip → city+state →
  zip+state, taking the most specific match that resolves. So a property
  on a back road in Transylvania, LA will show as a square at the
  Transylvania town center rather than not appearing at all.

### Filters

| Control | Affects | Notes |
|---------|---------|-------|
| Min score | Prospects only | Score doesn't apply to properties |
| State (LA/AR/MS) | Both layers | |
| Prospect types (multi-select) | Prospects only | Up to 10 types |
| Click a parish on the map | Both layers | Filters to that parish; click the same parish again or the × chip to clear |
| Basemap (Street / Satellite) | Tiles | Esri World Imagery for satellite, no key needed |
| Heat layer toggle | Prospects only | |
| Prospects toggle | Prospect markers visibility | |
| Properties toggle | Property markers visibility | |
| Parish lines toggle | Boundary overlay visibility | |

The map auto-fits its zoom to the loaded points on first render. Subsequent
filter changes don't re-fit — pan and zoom yourself.

### Tips

- **Layer prospects on properties to find target areas.** If you've sold three
  houses in Bossier and have 20 hot prospects clustered there, lead with proof
  in your outreach.
- **Use the score filter to triage.** Set min score to 80 to see only your
  hottest prospects — anything below 60 is usually noise on the first pass.
- **Click a parish to focus.** It filters both prospects and properties to
  exactly that parish/county. Click the same parish again or the × chip
  above the map to clear.
- **Properties appear at the address you give them**, not at the lot polygon.
  Parcel polygons via Regrid are on the roadmap.

---

## Appendix: Keyboard Shortcuts

None yet — all interactions are click-based through the web UI.

## Appendix: API Limits

- **AI requests**: 100/day default (configurable via `DAILY_REQUEST_LIMIT`)
- **Pagination**: All list endpoints default to 50 results, max 200
- **ATTOM searches**: 100 results max per search
- **Bulk scoring**: One AI call per prospect (plan accordingly with daily limits)
