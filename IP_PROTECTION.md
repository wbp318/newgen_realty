# NewGen Realty AI — Intellectual Property Protection Plan

Steps to protect the software, brand, and trade secrets before commercialization.

**Disclaimer:** This document is a planning reference, not legal advice. Consult a licensed IP attorney before taking commercial action.

---

## Current Protection (Already In Place)

| Protection | Status | How |
|-----------|--------|-----|
| **Copyright** | Automatic | Copyright exists the moment code is written. The `LICENSE` file asserts ownership by James Nolan Parker and William Brooks Parker. |
| **Trade Secrets** | Covered by LICENSE | Source code, algorithms, AI prompts, system architecture, and business logic are declared trade secrets under federal (DTSA) and state laws (LA, AR, MS). |
| **License Terms** | In repo | Proprietary license prohibits copying, modification, reverse engineering, and distribution without written consent. |
| **Code Repository** | Private-capable | GitHub repo with license file. Can be made private at any time before commercial release. |

---

## Step 1: Register Copyright with U.S. Copyright Office

**Why:** Automatic copyright lets you prove ownership, but **registration** unlocks statutory damages (up to $150,000 per infringement) and attorney's fees in court. Without registration, you can only recover actual damages — which are hard to prove for software.

**How:**
1. Go to [copyright.gov/registration](https://www.copyright.gov/registration/)
2. Create an account on the Electronic Copyright Office (eCO) system
3. Select "Literary Work" (software is classified as literary work)
4. Fill in:
   - **Title:** NewGen Realty AI
   - **Authors:** James Nolan Parker and William Brooks Parker
   - **Year of completion:** 2024
   - **Publication status:** Unpublished (if not yet commercially released)
   - **Claimant:** James Nolan Parker and William Brooks Parker
5. Upload a deposit copy — typically a portion of your source code (first 25 and last 25 pages, with trade secrets redacted if desired)
6. Pay the filing fee: **~$65 for online filing**
7. Processing time: 3-6 months (but protection is retroactive to filing date)

**Cost:** $65
**Priority:** High — do this before sharing the software with anyone outside your team.

---

## Step 2: Register "NewGen Realty" Trademark with USPTO

**Why:** Trademark registration protects the brand name. Without it, someone else could create a product called "NewGen Realty" in a different state and you'd have limited recourse. Federal registration gives you nationwide exclusive rights.

**How:**
1. Go to [uspto.gov/trademarks](https://www.uspto.gov/trademarks)
2. Search the Trademark Electronic Search System (TESS) to confirm "NewGen Realty" isn't already registered
3. File via the Trademark Electronic Application System (TEAS):
   - **TEAS Plus:** $250 per class (cheapest, stricter requirements)
   - **TEAS Standard:** $350 per class (more flexible)
4. Fill in:
   - **Mark:** NewGen Realty (standard character mark) or with logo if you have one
   - **Owner:** James Nolan Parker and William Brooks Parker (or your business entity)
   - **Class of goods/services:** Class 42 (Software as a Service — computer software) and/or Class 36 (Real estate services)
   - **Basis:** "Intent to Use" (if not yet commercially launched) or "Use in Commerce" (if already selling)
   - **Specimen:** Screenshot of the software showing the name in use
5. Pay the filing fee: **$250-350 per class**
6. Processing time: 8-12 months. You'll receive an Office Action if there are issues.

**Cost:** $250-700 (depending on number of classes)
**Priority:** Medium — do this before public launch or marketing.

---

## Step 3: Consider a Provisional Patent (Optional)

**Why:** If any of the AI workflows are truly novel (e.g., the prospect type → tone adaptation pipeline, the motivation signal scoring algorithm), a patent could provide 20 years of protection. A provisional patent gives you 12 months of "patent pending" status while you decide whether to file a full patent.

**What might be patentable:**
- The AI outreach tone adaptation system (prospect type → tone → AI-generated personalized message)
- The multi-signal prospect scoring algorithm (weighted motivation signals → AI evaluation)
- The integrated public record → AI scoring → compliance-checked outreach pipeline

**How:**
1. File a Provisional Patent Application with the USPTO
2. Go to [uspto.gov/patents](https://www.uspto.gov/patents)
3. Describe the invention in detail (no formal claims needed for provisional)
4. Pay the filing fee: **$150 (micro entity) or $300 (small entity)**
5. You get 12 months of "Patent Pending" status
6. Within 12 months, decide whether to file a full non-provisional patent ($1,500-15,000+ with attorney)

**Cost:** $150-300 for provisional; $5,000-15,000+ for full patent with attorney
**Priority:** Low unless you believe the AI workflows are genuinely novel. Consult a patent attorney.

---

## Step 4: Form a Business Entity

**Why:** Operating as individuals exposes your personal assets to business liability. An LLC or corporation provides a liability shield and makes IP ownership cleaner for investors, partners, and customers.

**Options:**

| Entity | Best for | Cost | Where to file |
|--------|---------|------|--------------|
| **Louisiana LLC** | Simple protection, pass-through taxes | ~$100 filing fee | [sos.la.gov](https://www.sos.la.gov/) |
| **Louisiana Corporation** | Raising investment, more formal structure | ~$75 filing fee | [sos.la.gov](https://www.sos.la.gov/) |
| **Delaware LLC** | Industry standard for tech/SaaS, investor-friendly | ~$90 filing fee + $300/yr franchise tax | [corp.delaware.gov](https://corp.delaware.gov/) |

**After forming:**
1. Assign all IP (copyright, trademark, trade secrets) from both individuals to the business entity
2. Update the LICENSE file to reflect the entity as owner
3. Open a business bank account
4. Get an EIN from the IRS (free, [irs.gov](https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online))

**Cost:** $75-300 depending on entity type and state
**Priority:** High before taking any money or signing any contracts.

---

## Step 5: Remote Online Notarization (RON) — If Needed

All three states support remote online notarization. You do NOT need to notarize the software license itself — it's enforceable as-is. But you may need notarization for:
- Business entity formation documents
- IP assignment agreements (transferring IP to your LLC)
- Contracts with customers or investors

| State | RON Authorized | Law | Platform |
|-------|---------------|-----|---------|
| **Louisiana** | Yes (2020) | Act 264 | [notarize.com](https://www.notarize.com/), DocuSign Notary |
| **Arkansas** | Yes (2019) | Act 731 | [notarize.com](https://www.notarize.com/), DocuSign Notary |
| **Mississippi** | Yes (2020) | HB 1564 | [notarize.com](https://www.notarize.com/), DocuSign Notary |

**Cost:** $25-50 per notarization session online
**Note:** Louisiana Civil Law Notaries have broader powers than notaries in AR/MS — they can prepare and authenticate real estate documents, not just witness signatures.

---

## Priority Checklist

| # | Action | Cost | Priority | Timeline |
|---|--------|------|----------|----------|
| 1 | Register copyright (copyright.gov) | $65 | **Do now** | Before sharing with anyone |
| 2 | Form LLC or Corporation | $75-300 | **Do now** | Before taking money |
| 3 | Register trademark (uspto.gov) | $250-350 | **Before launch** | Before public marketing |
| 4 | Assign IP to business entity | $0-50 | **After forming entity** | Immediately after Step 2 |
| 5 | Consult IP attorney | $200-500/hr | **Before selling** | Before first commercial license |
| 6 | Consider provisional patent | $150-300 | **Optional** | If AI workflows are novel |

---

## What NOT To Do

- **Don't make the repo public** until you've registered copyright and trademark
- **Don't share the full source code** with potential customers — demo the product, don't give them the code
- **Don't sell licenses** without an attorney reviewing your license terms
- **Don't use someone else's API keys** in the distributed product — each customer needs their own
- **Don't forget to update the LICENSE** if you form a business entity — ownership should transfer to the entity
