from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import properties, contacts, ai, activities, conversations, exports, integrations, market_data, prospects, outreach
from app.services import scheduler as drip_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    drip_scheduler.start_scheduler()
    try:
        yield
    finally:
        drip_scheduler.shutdown_scheduler()


app = FastAPI(
    title="NewGen Realty AI",
    description="AI-powered real estate platform for Louisiana, Arkansas, and Mississippi",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Set baseline security headers on every response and override the
    default Server header so we don't advertise uvicorn to attackers.
    These are pentest production-checklist items.
    """
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    # HSTS only takes effect over HTTPS but is harmless under HTTP.
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # Replace Starlette/uvicorn's default Server header — leaving "uvicorn"
    # on it tells attackers exactly what we're running.
    if "server" in response.headers:
        del response.headers["server"]
    response.headers["Server"] = "newgen-realty"
    return response

app.include_router(properties.router)
app.include_router(contacts.router)
app.include_router(ai.router)
app.include_router(activities.router)
app.include_router(conversations.router)
app.include_router(market_data.router)
app.include_router(prospects.router)
app.include_router(outreach.router)
app.include_router(integrations.router)
app.include_router(exports.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "newgen-realty"}
