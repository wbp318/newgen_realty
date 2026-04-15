# NewGen Realty AI — TCPA Compliance Reference

This document explains every compliance flag, what it means, what you can and cannot do, and how to resolve each one. **Ignoring compliance flags can result in fines up to $1,500 per violation** under the Telephone Consumer Protection Act (TCPA).

---

## Table of Contents

1. [Understanding Compliance Flags](#1-understanding-compliance-flags)
2. [Flag Reference](#2-flag-reference)
3. [Consent Statuses Explained](#3-consent-statuses-explained)
4. [What's Allowed by Medium](#4-whats-allowed-by-medium)
5. [How to Resolve Each Flag](#5-how-to-resolve-each-flag)
6. [DNC (Do Not Call) List](#6-dnc-do-not-call-list)
7. [Opt-Out Processing](#7-opt-out-processing)
8. [Contact Hours](#8-contact-hours)
9. [Record Keeping](#9-record-keeping)
10. [Common Scenarios](#10-common-scenarios)

---

## 1. Understanding Compliance Flags

Every time you generate an outreach message, the system checks the prospect's compliance status and returns **flags** — warnings that tell you something may prevent or restrict contact with this person.

Flags appear as a yellow banner on the generated outreach:

```
Compliance flags: no_consent
```

**Flags do NOT block message generation.** The system still generates the message so you can review it, but the flags warn you about what's safe to send. It's your responsibility to act on the flags before sending.

A message with **no flags** shows "Clear" in green — you're good to send via any medium.

---

## 2. Flag Reference

### `no_consent`

**What it means:** This prospect has not given written consent to be contacted via phone, text, or email.

**Why it matters:** As of January 27, 2025, the FCC requires **specific, written consent** before contacting someone via phone call, text message, or email for marketing purposes. Consent must be tied to YOUR business specifically — you can't use consent given to a different company or lead generator.

**What you can still do:**
- Send a **physical letter** (protected by the First Amendment — no consent required)
- This is why letters are often the best first contact for cold prospects

**What you cannot do:**
- Call them
- Text them
- Email them for marketing purposes

**How to resolve:** Obtain written consent. Methods:
- Include a response card in your letter with consent language
- Get verbal consent on a recorded call (if they call you back)
- Have them sign a consent form at a meeting
- Get consent via an online form on your website

Once consent is obtained, update the prospect's `consent_status` to `granted` and set `consent_method` (e.g., "written_letter", "online_form", "verbal_recorded").

---

### `on_dnc_list`

**What it means:** This prospect's phone number is registered on the National Do Not Call Registry.

**Why it matters:** Calling or texting numbers on the DNC list without prior express consent is a federal violation. Penalties: **up to $1,500 per call/text** to a DNC-listed number.

**What you can still do:**
- Send a physical letter
- Send an email (DNC only applies to phone/text)
- Call/text ONLY if they gave you prior express written consent

**What you cannot do:**
- Cold call this number
- Cold text this number

**How to resolve:** You cannot remove someone from the DNC list — it's their choice. Your options:
- Use letter or email outreach instead
- If they respond to your letter and give consent, you may then call/text
- The DNC restriction does not apply if you have an established business relationship (EBR) — but this is narrow and risky to rely on

---

### `pending_opt_out`

**What it means:** This prospect requested to opt out of communications, and the opt-out has not yet been fully processed.

**Why it matters:** The FCC requires opt-outs to be processed within **10 business days**. During this processing window, you must not contact them.

**What you can still do:**
- Nothing. Do not contact this person until the opt-out is processed.

**What you cannot do:**
- Send any outreach via any medium until the processing window closes

**How to resolve:** Wait for the 10-business-day window to expire. The system tracks the deadline automatically. After processing:
- The prospect status should be changed to `do_not_contact`
- They should never be contacted again unless they explicitly re-consent

---

### `do_not_contact`

**What it means:** This prospect is permanently flagged as do-not-contact. Either they explicitly requested no further contact, or they were marked by you/your team.

**Why it matters:** Contacting someone who has asked not to be contacted can result in TCPA violations, state-level penalties, and potential harassment claims.

**What you can still do:**
- Nothing. This is a hard block.

**What you cannot do:**
- Send any outreach via any medium, ever

**How to resolve:** This status is intentionally difficult to reverse. If you believe it was set in error, manually update the prospect's status. But if the prospect requested no contact, **respect that permanently**.

---

### `no_contact_info`

**What it means:** This prospect has no email address, no phone number, and no mailing address on file.

**Why it matters:** You literally cannot contact them — there's no way to reach them.

**What you can still do:**
- Run **skip tracing** to find contact info (phone, email, mailing address)
- **Enrich** the prospect with ATTOM data to pull owner mailing address
- Look up the property's tax mailing address through county records

**How to resolve:**
1. Click **Skip Trace (Find Contact Info)** on the prospect detail page
2. Click **Enrich with ATTOM Data** to pull the owner's mailing address
3. Use the **DNC Check** after finding a phone number

---

### `outside_contact_hours`

**What it means:** The current time is outside the allowed contact window of **8:00 AM to 9:00 PM** in the recipient's local timezone.

**Why it matters:** The TCPA prohibits telemarketing calls and texts outside of 8am-9pm in the recipient's timezone. All three supported states (LA, AR, MS) are in the Central Time Zone.

**What you can still do:**
- Generate and save the message as a draft for later
- Send physical letters (no time restriction)
- Send emails (technically no TCPA time restriction, but best practice is to respect business hours)

**What you cannot do:**
- Make phone calls
- Send text messages

**How to resolve:** Wait until 8:00 AM local time. This flag is automatic and will clear on its own when the time is right.

---

## 3. Consent Statuses Explained

Every prospect has a `consent_status` field that tracks where they are in the consent process.

| Status | Badge Color | Meaning | Allowed Channels |
|--------|-------------|---------|-----------------|
| **none** | Gray | No consent obtained or requested | Letters only |
| **pending** | Yellow | You've sent a consent request (e.g., response card in a letter) but haven't received it back | Letters only |
| **granted** | Green | You have written, documented consent | All channels (letter, email, phone, text) |
| **denied** | Red | They explicitly said no to being contacted | Letters only (but strongly consider not contacting) |
| **revoked** | Red | They previously consented but withdrew it | No contact via any channel |

### What counts as valid consent (post-January 2025 FCC rules)

- Must be **written** (digital signatures, online forms, and recorded verbal all count)
- Must be **specific to your business** — not a blanket consent to "real estate companies"
- Must clearly state what they're consenting to (calls, texts, emails)
- Lead generators can no longer sell "consented leads" with blanket consent
- You must be able to **prove** consent if challenged

### What does NOT count as consent

- "They gave their number to a lead gen website" — not specific to your business
- "They're listed as a property owner in public records" — public data ≠ consent
- "They didn't say no" — silence is not consent
- Verbal consent that wasn't recorded — you can't prove it

---

## 4. What's Allowed by Medium

| Medium | Consent Required? | DNC Applies? | Contact Hours Apply? | Notes |
|--------|-------------------|-------------|---------------------|-------|
| **Letter** | No (First Amendment) | No | No | Best for first contact with cold prospects. Highest response rate for motivated sellers. |
| **Email** | Yes (CAN-SPAM + TCPA) | No | No (but best practice: business hours) | Must include unsubscribe option. |
| **Phone Call** | Yes (TCPA) | Yes | Yes (8am-9pm) | Requires prior express written consent for marketing. |
| **Text Message** | Yes (TCPA) | Yes | Yes (8am-9pm) | Same consent requirements as phone. Keep under 300 characters. |

### The Letter Advantage

Physical letters are the safest and often most effective first contact for cold prospects:
- **No consent required** — protected by the First Amendment
- **No DNC restrictions** — DNC only applies to phone/text
- **No time restrictions** — mail when you want
- **Highest response rate** — direct mail to motivated sellers typically outperforms email and phone
- **Establishes you** — a professional letter carries more weight than a cold call

**Recommended workflow:** Send a letter first → include a response card or phone number → when they respond, you've established contact → obtain consent for phone/text/email going forward.

---

## 5. How to Resolve Each Flag

| Flag | Resolution | Steps in NewGen |
|------|-----------|-----------------|
| `no_consent` | Obtain written consent or use letters | Send a letter with response card. Update `consent_status` to `granted` when they respond. |
| `on_dnc_list` | Use non-phone channels | Switch to letter or email outreach. Don't call or text. |
| `pending_opt_out` | Wait 10 business days | System tracks automatically. Don't contact until processed. |
| `do_not_contact` | Respect permanently | Do not contact. Remove from all campaigns. |
| `no_contact_info` | Skip trace or enrich | Click "Skip Trace" or "Enrich with ATTOM Data" on prospect detail. |
| `outside_contact_hours` | Wait until 8am | Save as draft. Send during 8am-9pm recipient time. |

---

## 6. DNC (Do Not Call) List

### What is it?
The National Do Not Call Registry is maintained by the FTC. Consumers can register their phone numbers to avoid telemarketing calls.

### How NewGen handles it
- **Batch DNC Check** button on the prospects list page checks all phone numbers
- Each prospect has `dnc_checked` (boolean), `dnc_checked_at` (timestamp), and `dnc_listed` (boolean) fields
- DNC status is displayed on prospect detail pages and in campaign message compliance columns
- Outreach generation flags `on_dnc_list` for any DNC-listed prospect

### How often to check
- Check before every campaign
- The DNC list is updated regularly — numbers are added and (rarely) removed
- Best practice: re-check quarterly for existing prospects

### Exceptions (narrow — use with caution)
- **Prior express written consent** overrides DNC for that specific relationship
- **Established Business Relationship (EBR)** — if they've done business with you in the last 18 months, or inquired in the last 3 months. This is narrow and risky.
- **Personal relationship** — if you know them personally (not applicable to cold prospects)

---

## 7. Opt-Out Processing

### FCC Rules (effective January 2025)
- Opt-outs must be processed within **10 business days** (reduced from 30 days)
- You must provide **multiple opt-out channels**: SMS reply, email, voicemail, phone call
- During the processing window, **do not contact** the person

### How NewGen tracks it
- `opt_out_date` — when the opt-out was requested
- `opt_out_processed` — whether it's been fully processed
- The compliance service calculates the 10-business-day deadline automatically
- `pending_opt_out` flag appears until the window closes

### What "processing" means
1. Remove the person from all active campaigns
2. Update their prospect status to `do_not_contact`
3. Ensure no future outreach is generated for them
4. Mark `opt_out_processed = true`
5. Keep records of the opt-out request and processing date

---

## 8. Contact Hours

### The Rule
TCPA prohibits telemarketing calls and texts before **8:00 AM** or after **9:00 PM** in the recipient's local timezone.

### How NewGen enforces it
- The compliance service checks `contact_window_timezone` for each prospect
- All three supported states (LA, AR, MS) are in **Central Time (America/Chicago)**
- The `outside_contact_hours` flag appears when the current time is outside the 8am-9pm window
- This flag only affects phone and text — letters and emails are not time-restricted

### Edge cases
- If a prospect's timezone is unknown, the system defaults to Central Time
- Daylight Saving Time is handled automatically by the timezone library

---

## 9. Record Keeping

**Always document:**
- When and how consent was obtained (`consent_date`, `consent_method`)
- When DNC was checked (`dnc_checked_at`)
- When opt-outs were requested and processed (`opt_out_date`, `opt_out_processed`)
- All outreach attempts (the system logs these as Activities automatically)

**Why:** If a complaint is filed, you need to prove:
1. You had consent (or used an exempt channel like letters)
2. You checked the DNC list
3. You respected opt-out requests within 10 business days
4. You contacted within allowed hours

NewGen tracks all of this automatically through the prospect record and activity timeline.

---

## 10. Common Scenarios

### Scenario 1: New prospect from ATTOM, no contact info
**Flags:** `no_consent`, `no_contact_info`
**Action:** Enrich with ATTOM to get mailing address. Send a letter (no consent needed). Include a response card to obtain consent for future phone/email contact.

### Scenario 2: Prospect has phone but no consent
**Flags:** `no_consent`
**Action:** Do NOT call or text. Send a letter first. When they respond, obtain written consent, then you can call/text.

### Scenario 3: Prospect has phone and it's on the DNC list
**Flags:** `no_consent`, `on_dnc_list`
**Action:** Do NOT call or text even if you obtain consent (DNC overrides unless they give specific written consent to YOUR business). Use letters and email only.

### Scenario 4: Prospect opted out last week
**Flags:** `pending_opt_out`, `do_not_contact`
**Action:** Do nothing. Wait for the 10-business-day processing window. After that, never contact them again.

### Scenario 5: It's 9:30 PM and you want to text a prospect
**Flags:** `outside_contact_hours`
**Action:** Save the text as a draft. Send it tomorrow after 8:00 AM their time.

### Scenario 6: Prospect responded to your letter and gave verbal consent on a recorded call
**Flags:** (was `no_consent`, now cleared)
**Action:** Update `consent_status` to `granted`, `consent_method` to `verbal_recorded`, `consent_date` to today. You can now use all channels.

### Scenario 7: No flags — all clear
**Flags:** (none — shows "Clear" in green)
**Action:** You're good. Send via any channel during contact hours.

---

## Disclaimer

This document provides general guidance on TCPA compliance as implemented in the NewGen Realty platform. It is **not legal advice**. Real estate communication laws vary by state and are subject to change. Consult a licensed attorney for specific legal questions about your outreach practices.

The platform's compliance features are tools to help you stay compliant — they do not guarantee compliance. You are ultimately responsible for ensuring your outreach practices comply with all applicable federal, state, and local laws.
