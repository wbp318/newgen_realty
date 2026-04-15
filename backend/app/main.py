from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import properties, contacts, ai, activities, conversations, market_data, prospects


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


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

app.include_router(properties.router)
app.include_router(contacts.router)
app.include_router(ai.router)
app.include_router(activities.router)
app.include_router(conversations.router)
app.include_router(market_data.router)
app.include_router(prospects.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "newgen-realty"}
