from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = ""
    DATABASE_URL: str = "sqlite+aiosqlite:///./newgen_realty.db"
    AI_MODEL: str = "claude-sonnet-4-20250514"
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
    SUPPORTED_STATES: list[str] = ["LA", "AR", "MS"]

    class Config:
        env_file = ".env"


settings = Settings()
