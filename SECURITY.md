# NewGen Realty AI — Security Audit & Pre-Production Checklist

Last audited: April 27, 2026 (v0.2.5)
Previously audited: April 15, 2026 (v0.2.0)

This audit covers the codebase as it stands, gives a current security
posture, and tracks what still has to land before the platform is
deployed to the public internet.

---

## Current Security Status

### What's Done (Safe for Local + Trusted-Network Testing)

| Area | Status | Detail |
|------|--------|--------|
| SQL injection | **Protected** | All queries use SQLAlchemy ORM with parameterized statements. Pentest fires SQLi in query params and bodies — all blocked. |
| XSS (stored) | **Protected** | React auto-escapes rendered text. No `dangerouslySetInnerHTML` anywhere in the frontend. Pentest stores `<script>`, `<svg onload=...>`, etc.; everything renders as text. |
| Error message leakage | **Sanitized** | Routers raise generic `HTTPException` with safe `detail` strings. No raw exception text in responses. Stack traces stay in server logs. |
| Input validation | **Protected** | Every Create/Update endpoint uses Pydantic with `max_length` on all text fields. Names ≤ 100, addresses ≤ 500, notes ≤ 5K-10K, message bodies ≤ 50K, chat content ≤ 20K. List fields capped (e.g. tags ≤ 20 items). Query params capped via `Query(max_length=100)`. |
| **JSON column size** | **Protected (new)** | `app/schemas/_validators.py` exports `BoundedJSONDict` which serializes the value and rejects > 64 KB. Applied to `motivation_signals`, `property_data`, `features`, `extra_data`, `search_criteria`. Pentest's 1 MB JSON payload now rejected (was a WARN). |
| **Oversized payloads** | **Protected (new)** | A 10 MB string in `notes` is now rejected at validation time, not silently truncated or stored. Pentest WARN → PASS. |
| Batch limits | **Protected** | Bulk score (50 max), batch skip trace (100 max), batch DNC (200 max). All enforce via Pydantic `Field(max_length=N)`. Sequence config capped at 20 steps. |
| **Per-endpoint rate limiting** | **Protected (new)** | In-memory sliding-window IP-based limiter (`app/services/rate_limit.py`, no extra deps). Applied to `GET /api/properties` (100/60s), `POST /api/ai/chat` (20/60s), `POST /api/prospects/search` (10/3600s), `POST /api/prospects/{id}/skip-trace` (5/60s), `POST /api/outreach/generate-message` (20/60s). Returns 429 with `Retry-After`. |
| AI daily cost limit | **Protected** | `UsageTracker` caps total AI requests/day at `DAILY_REQUEST_LIMIT` (default 100). Per-call token usage tracked + estimated cost surfaced via `/api/ai/usage`. |
| **Security headers** | **Protected (new)** | Middleware in `main.py` sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `Referrer-Policy: strict-origin-when-cross-origin`. |
| **Server header leak** | **Protected (new)** | Uvicorn started with `--no-server-header`; middleware additionally sets `Server: newgen-realty`. The default `Server: uvicorn` no longer leaks the runtime to attackers. |
| Compliance gating | **Protected** | Every outreach generation runs `validate_outreach_compliance()`. The drip scheduler re-validates compliance at *send* time, not just generation, so DNC / opt-out / contact-hour blocks can't be bypassed by stale flags. |
| API key storage | **Protected** | Keys live in `backend/.env`, gitignored, never hardcoded. `.env.example` has placeholders only. The integrations status endpoint exposes only the last 4 chars of any key. |
| Webhook HMAC (Resend) | **Protected when `INBOUND_WEBHOOK_SECRET` set** | `POST /api/outreach/webhooks/resend` verifies a Svix-style HMAC signature before processing the body. Falls open in dev when secret is unset (intentional, documented). |

### Pentest Snapshot (current)

```
Suite                       Pass   Fail   Warn   Skip
Input Validation             21      0      0      0
Security Headers & CORS       9      0      0      0
API Abuse & Business Logic    4      0      0      1   (mass ATTOM skipped — not configured)
Rate Limiting                 5      0      0      0
Authentication                0      1      0      6   (deferred — see below)
API Access Control            0      0      0      1   (auto-skip until auth lands)
IDOR                          0      0      0      1   (auto-skip until auth lands)
─────────────────────────  ─────  ─────  ─────  ─────
Total                        39      1      0      9
```

The single `FAIL` is "endpoint accessible without auth" — see Item 1 below.

---

## Pre-Production Checklist

These must be completed before the platform is deployed to the public internet.

### 1. Authentication (CRITICAL — DEFERRED for now)

**Current state:** No authentication. Every endpoint is publicly accessible. The pentest's lone FAIL is a direct consequence.

**Why deferred:** Operating decision (2026-04-27) — the platform is still in heavy iteration and adding login friction to every dev round-trip outweighs the security benefit during pre-production. Auth-dependent pentest suites (API access control, IDOR) auto-skip cleanly until this lands.

**What to implement when ready:**
- JWT-based auth with login/signup
- API key auth for programmatic access
- Role-based access (admin, agent, read-only)
- Session management with token refresh
- Local-dev bypass to keep testing frictionless (env flag, not a back door)

**Libraries:** `python-jose[cryptography]`, `passlib[bcrypt]`

**Estimated effort:** 1-2 days (plus a frontend login flow)

---

### 2. ~~Rate Limiting~~ → DONE

Per-endpoint sliding-window IP rate limiter shipped on 2026-04-27.
See `app/services/rate_limit.py`. Five endpoints covered. The remaining
production-grade work is to swap the in-memory store for Redis when
scaling beyond a single backend process.

**Open items at this layer:**
- **Geocoder DoS vector.** `POST /api/properties` and `POST /api/prospects` aren't rate-limited and each triggers a Nominatim call gated by a 1.1s global lock. A burst of creates ties up the threadpool. Either (a) put a per-IP rate limit on the create endpoints, or (b) move geocoding to a background task. Low risk while only Tap is using the app; capture before going public.
- **Backfill endpoints.** `POST /api/prospects/geocode-backfill` and `POST /api/properties/geocode-backfill` are bounded by `limit ≤ 200` per call but not rate-limited per IP. Same fix.

---

### 3. HTTPS / TLS (HIGH)

**Current state:** HTTP only (localhost). HSTS header is sent regardless, but browsers ignore it over HTTP — it only takes effect after the first HTTPS connection.

**What to implement:**
- TLS certificate (Let's Encrypt / Caddy / cloud LB)
- HTTPS-only in production
- Redirect HTTP → HTTPS at the proxy

**Recommended:** Caddy in front of the FastAPI process. Auto-cert from Let's Encrypt, no config required.

**Estimated effort:** 1-2 hours with Caddy.

---

### 4. ~~Security Headers~~ → DONE

Middleware ships in `main.py`. All four pentest-flagged headers present.
The `X-XSS-Protection` header from the original 2026-04-15 audit was
intentionally omitted — modern browsers ignore it and OWASP recommends
against setting it. CSP could be added in a future pass once the
frontend's exact resource-origins are stable.

---

### 5. CORS Tightening (MEDIUM)

**Current state:** Only `http://localhost:3000` is allowed (already restrictive). Methods and headers are wildcarded — change for production.

**What to change for production:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.yourdomain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)
```

**Estimated effort:** 5 minutes.

---

### 6. Request Logging / Audit Trail (MEDIUM)

**Current state:** Uvicorn's per-request access log lands in stdout. No structured request log, no per-user attribution (because no auth yet).

**What to implement when auth lands:**
- Method, path, IP, user, timestamp, response code, latency
- Store separately from app logs (security-forensics has different retention requirements)
- Particular interest: every POST to `/api/outreach/*`, `/api/prospects/{id}/skip-trace`, and `/api/ai/*` (cost-bearing endpoints)

**Libraries:** `structlog` for structured output; ship to a logging service in production.

**Estimated effort:** 1-2 hours.

---

### 7. Database Security (MEDIUM)

**Current state:** SQLite file in the working directory. No encryption. No automated backups. Local dev only.

**What to implement for production:**
- Use PostgreSQL (already supported via `docker-compose`; `DATABASE_URL` switch)
- Strong DB password (NOT the default `newgen:newgen` from compose)
- Encrypt sensitive contact fields (phone, email) at rest if compliance requires it
- Automated daily backups
- Connection pool limits

---

### 8. ~~JSON Column Validation~~ → DONE

`BoundedJSONDict` validator in `app/schemas/_validators.py` rejects
payloads larger than 64 KB on every JSON column. Applied to
`motivation_signals`, `property_data`, `features`, `extra_data`, and
`search_criteria`.

A nice-to-have follow-up: replace the `dict` type with a structured
Pydantic model where the keys are well-known (e.g. `MotivationSignals`
with explicit `absentee: bool`, `tax_delinquent: bool`, etc.). Better
type safety, IDE help, and self-documenting.

---

### 9. **Twilio webhook signature not verified (NEW finding)**

**Current state:** `POST /api/outreach/webhooks/twilio` reads
`X-Twilio-Signature` header but never validates it, even when
`INBOUND_WEBHOOK_SECRET` is set. The Resend webhook handler does
verify HMAC; the Twilio handler does not. An attacker who knows the
URL can forge inbound SMS replies and STOP messages.

**What to fix:**
```python
from twilio.request_validator import RequestValidator

if settings.TWILIO_AUTH_TOKEN:
    validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)
    url = str(request.url)
    if not validator.validate(url, params, x_twilio_signature or ""):
        raise HTTPException(status_code=401, detail="Invalid signature")
```

**Why it matters:** A forged STOP can mark a real prospect as
do-not-contact, killing legitimate campaigns. A forged inbound SMS can
inject content into Activity logs.

**Risk while undeployed:** Minimal — the webhook URL isn't reachable
from the internet during local dev. Becomes high-priority before any
public deployment.

**Estimated effort:** 30 minutes.

---

### 10. Dependency Updates (LOW, ongoing)

**Current state:** Dependencies pinned. No automated audit.

**What to implement:**
- `pip-audit` in CI on every PR
- Dependabot / Renovate for auto-PR upgrades
- Quarterly manual review of `requirements.txt`

```bash
pip install pip-audit
pip-audit
```

**Estimated effort:** 30 minutes initial, ongoing.

---

## Production Deployment Checklist

Before going live, confirm each item:

### Code-level (mostly done)

- [x] SQL injection mitigations verified by pentest
- [x] XSS mitigations verified by pentest
- [x] Error responses sanitized (no stack traces leaking)
- [x] Pydantic `max_length` on every text field
- [x] JSON columns size-bounded (`BoundedJSONDict`)
- [x] Batch operations capped
- [x] Per-endpoint rate limiting (5 endpoints)
- [x] Security headers middleware
- [x] Server header suppressed (`--no-server-header`)
- [x] AI daily cost cap
- [x] Resend webhook HMAC verified
- [ ] **Twilio webhook signature verified** (Item 9)
- [ ] Rate limit on prospect/property create endpoints (Item 2 follow-up)
- [ ] Authentication implemented (Item 1)
- [ ] Request logging w/ user attribution (Item 6)

### Deployment-level (still pending)

- [ ] HTTPS with valid TLS certificate
- [ ] CORS restricted to production domain
- [ ] PostgreSQL with strong password (not SQLite)
- [ ] Database backups configured
- [ ] API keys rotated (fresh keys for production, never the dev keys)
- [ ] `.env` contains production values (loaded from secrets manager)
- [ ] Dependency audit clean
- [ ] Load testing completed
- [ ] DNC list API integrated (replace stub)
- [ ] Skip trace provider configured and tested
- [ ] ATTOM API key with appropriate plan limits
- [ ] Sentry / similar for runtime error visibility
- [ ] Backup tested by *restoring*, not just creating

---

## Audit changelog

- **2026-04-27 (v0.2.5):** Rate limiting, security headers, Server-header suppression, max_length on text fields, JSON-size validator, geocoder fallback chain, county-portal directory replacing broken scrapers. New findings: Twilio webhook signature not verified, geocoder DoS via unrestricted creates. Auth deferred per operating decision.
- **2026-04-15 (v0.2.0):** Initial audit. Identified 9 pre-production items. Verified SQLi/XSS/error-leakage already handled.
