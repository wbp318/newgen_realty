# NewGen Realty AI — Security Audit & Pre-Production Checklist

Last audited: April 15, 2026 (v0.2.0)

---

## Current Security Status

### What's Done (Safe for Local Testing)

| Area | Status | Detail |
|------|--------|--------|
| SQL Injection | **Protected** | All queries use SQLAlchemy ORM with parameterized statements. No raw SQL anywhere. |
| XSS | **Protected** | React auto-escapes all rendered text. No `dangerouslySetInnerHTML` used. |
| API Key Storage | **Protected** | Keys in `.env` file, properly `.gitignored`. Never hardcoded. |
| Error Messages | **Sanitized** | Error responses return generic messages, not raw exception details. |
| Input Validation | **Protected** | All endpoints use Pydantic schemas. Text search limited to 100 chars. |
| Batch Limits | **Protected** | Bulk score (50 max), batch skip trace (100 max), batch DNC (200 max). |
| Environment Files | **Protected** | `.env` gitignored, `.env.example` contains only placeholders. |

---

## Pre-Production Checklist

These must be completed before the platform is deployed to the internet or used by anyone other than the development team.

### 1. Authentication (CRITICAL)

**Current state:** No authentication. Every endpoint is publicly accessible.

**What to implement:**
- JWT-based authentication with login/signup
- API key authentication for programmatic access
- Role-based access (admin, agent, read-only)
- Session management with token refresh

**How to implement in FastAPI:**
```python
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    token = credentials.credentials
    # Verify JWT token, return user
    ...

# Then add to every router:
@router.get("/api/properties")
async def list_properties(
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ...
```

**Libraries to add:** `python-jose[cryptography]`, `passlib[bcrypt]`

**Estimated effort:** 1-2 days

---

### 2. Rate Limiting (HIGH)

**Current state:** Only AI endpoints have a daily request limit (100/day via UsageTracker). No per-IP or per-user rate limiting on any endpoint.

**What to implement:**
- Per-IP rate limiting on all endpoints
- Stricter limits on expensive endpoints (ATTOM search, skip trace, AI scoring)
- Cost-aware limits on third-party API calls

**Recommended limits:**
| Endpoint Group | Limit |
|---------------|-------|
| General CRUD | 100 requests/minute per IP |
| AI endpoints | 20 requests/minute per IP |
| ATTOM search | 10 requests/hour per IP |
| Skip trace | 5 requests/minute per IP |
| Batch operations | 2 requests/minute per IP |

**How to implement:**
```python
# pip install slowapi
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@router.post("/search")
@limiter.limit("10/hour")
async def search_prospects(request: Request, ...):
    ...
```

**Libraries to add:** `slowapi`

**Estimated effort:** 2-4 hours

---

### 3. HTTPS / TLS (HIGH)

**Current state:** HTTP only (localhost). No encryption in transit.

**What to implement:**
- TLS certificate (Let's Encrypt or similar)
- HTTPS-only in production
- HSTS header
- Redirect HTTP → HTTPS

**How:** Deploy behind a reverse proxy (nginx, Caddy, or cloud load balancer) that handles TLS termination.

**Estimated effort:** 1-2 hours with Caddy, half a day with nginx

---

### 4. Security Headers (MEDIUM)

**Current state:** No security headers in responses.

**What to add:**
```python
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response
```

**Estimated effort:** 30 minutes

---

### 5. CORS Tightening (MEDIUM)

**Current state:** Allows `http://localhost:3000` with all methods and all headers.

**What to change for production:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.yourdomain.com"],  # Your actual domain
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)
```

**Estimated effort:** 5 minutes (just change the config)

---

### 6. Request Logging / Audit Trail (MEDIUM)

**Current state:** No request logging. Activity model logs AI actions but not HTTP requests.

**What to implement:**
- Log every request: method, path, IP, user (once auth exists), timestamp, response code
- Store in a separate log file or logging service
- Critical for security forensics and compliance

**How:**
```python
import logging

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"{request.method} {request.url.path} from {request.client.host}")
    response = await call_next(request)
    logger.info(f"  → {response.status_code}")
    return response
```

**Libraries to consider:** `structlog`, `python-json-logger`

**Estimated effort:** 1-2 hours

---

### 7. Database Security (MEDIUM)

**Current state:** SQLite file in the working directory. No encryption. No backups.

**What to implement for production:**
- Use PostgreSQL (already supported via docker-compose)
- Strong database password (not `newgen:newgen`)
- Encrypt sensitive fields (contact phone/email) at rest
- Automated backups
- Connection pooling with limits

**What to change in docker-compose:**
```yaml
environment:
  POSTGRES_USER: newgen_prod
  POSTGRES_PASSWORD: <generated-strong-password>
```

**Estimated effort:** 2-4 hours

---

### 8. JSON Column Validation (LOW)

**Current state:** `motivation_signals` and `property_data` JSON columns accept arbitrary dicts.

**What to implement:** Structured Pydantic models for JSON column data to prevent oversized payloads.

```python
class MotivationSignals(BaseModel):
    absentee: Optional[bool] = None
    ownership_years: Optional[int] = None
    tax_delinquent: Optional[bool] = None
    tax_delinquent_amount: Optional[float] = None
    foreclosure_status: Optional[str] = None
    vacant: Optional[bool] = None
    # ... defined structure
```

**Estimated effort:** 1-2 hours

---

### 9. Dependency Updates (LOW)

**Current state:** All dependencies at recent versions as of April 2026.

**What to implement:**
- Run `pip audit` or `safety check` regularly
- Dependabot or Renovate for automatic PR updates
- Pin exact versions in requirements.txt (already done)

**Command to check:**
```bash
pip install pip-audit
pip-audit
```

**Estimated effort:** 30 minutes initial, ongoing

---

## Production Deployment Checklist

Before going live, confirm each item:

- [ ] Authentication implemented and tested
- [ ] Rate limiting on all endpoints
- [ ] HTTPS with valid TLS certificate
- [ ] Security headers middleware added
- [ ] CORS restricted to production domain
- [ ] Request logging enabled
- [ ] PostgreSQL with strong password (not SQLite)
- [ ] Database backups configured
- [ ] API keys rotated (fresh keys for production)
- [ ] `.env` contains production values
- [ ] Error responses verified (no stack traces leaking)
- [ ] Dependency audit clean
- [ ] Load testing completed
- [ ] DNC list API integrated (replace stub)
- [ ] Skip trace provider configured and tested
- [ ] ATTOM API key with appropriate plan limits
