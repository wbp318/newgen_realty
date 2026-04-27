from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = ""
    DATABASE_URL: str = "sqlite+aiosqlite:///./newgen_realty.db"
    AI_MODEL: str = "claude-sonnet-4-6"
    AI_MODEL_FAST: str = "claude-haiku-4-5-20251001"
    DAILY_REQUEST_LIMIT: int = 100  # max AI requests per day
    MAX_TOKENS_CHAT: int = 1024  # keep chat responses concise
    MAX_TOKENS_LISTING: int = 1500  # listings need more room
    MAX_TOKENS_ANALYSIS: int = 2000  # comp analysis needs detail
    MAX_TOKENS_COMM: int = 512  # emails/texts are short
    # Market data (Realty Mole via RapidAPI)
    REALTY_MOLE_API_KEY: str = ""
    # Prospect data (ATTOM Data API)
    ATTOM_API_KEY: str = ""
    MAX_TOKENS_PROSPECT_SCORE: int = 1000
    MAX_TOKENS_OUTREACH: int = 800
    MAX_TOKENS_CAMPAIGN_INSIGHTS: int = 1500
    # Skip tracing
    SKIP_TRACE_PROVIDER: str = "free"
    SKIP_TRACE_API_KEY: str = ""
    SUPPORTED_STATES: list[str] = ["LA", "AR", "MS"]
    # Outreach send providers (Phase 1A)
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""
    # Public URL Twilio is configured to POST to. Used for X-Twilio-Signature
    # validation when the FastAPI server sits behind a reverse proxy / ngrok
    # and sees a different URL than the one Twilio signed with. Leave empty
    # in plain local dev; the request URL will be used as-is.
    TWILIO_WEBHOOK_URL: str = ""
    INBOUND_WEBHOOK_SECRET: str = ""
    # Drip scheduler
    SCHEDULER_ENABLED: bool = True
    SCHEDULER_TICK_SECONDS: int = 60
    SCHEDULER_BATCH_SIZE: int = 50
    DAILY_SEND_CAP_EMAIL: int = 500
    DAILY_SEND_CAP_SMS: int = 200
    # Geocoding (Phase 4A)
    GEOCODE_PROVIDER: str = "nominatim"
    GEOCODE_USER_AGENT: str = "newgen-realty/0.2"

    class Config:
        env_file = ".env"


settings = Settings()
