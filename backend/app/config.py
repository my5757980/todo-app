from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    All secrets are read from .env — never hardcoded.
    Ref: backend/CLAUDE.md § Config Rules
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Better Auth — shared with Next.js frontend
    BETTER_AUTH_SECRET: str

    # Neon Serverless PostgreSQL (asyncpg driver)
    DATABASE_URL: str

    # CORS — frontend origin(s) allowed to call this API
    BACKEND_CORS_ORIGIN: str = "http://localhost:3000"

    # Grok (xAI) — used via OpenAI-compatible API
    # NEVER expose this key to the frontend or logs
    GROK_API_KEY: str = ""

    # Model to use for the AI chatbot
    GROK_MODEL: str = "grok-3-mini"

    # Number of past messages loaded as agent context per request (FR-007)
    MAX_CONTEXT_MESSAGES: int = 20


@lru_cache()
def get_settings() -> Settings:
    """Singleton settings instance — cached after first load."""
    return Settings()
