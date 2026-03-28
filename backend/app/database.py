from collections.abc import AsyncGenerator
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from app.config import get_settings

_settings = get_settings()


def _asyncpg_url(url: str) -> tuple[str, dict]:
    """Strip libpq-only params asyncpg does not understand (sslmode,
    channel_binding) and return (clean_url, connect_args)."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query, keep_blank_values=True)
    sslmode = params.pop("sslmode", [None])[0]
    params.pop("channel_binding", None)  # asyncpg does not support this param
    clean_query = urlencode({k: v[0] for k, v in params.items()})
    clean_url = urlunparse(parsed._replace(query=clean_query))
    connect_args: dict = {}
    if sslmode and sslmode != "disable":
        connect_args["ssl"] = True
    return clean_url, connect_args


_db_url, _connect_args = _asyncpg_url(_settings.DATABASE_URL)

# Async engine — uses asyncpg driver with Neon cloud PostgreSQL
# pool_pre_ping=True reconnects after idle periods (important for serverless)
async_engine = create_async_engine(
    _db_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,  # objects remain accessible after commit
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields a database session per request.

    Usage in route:
        session: AsyncSession = Depends(get_session)
    """
    async with AsyncSessionLocal() as session:
        yield session


async def create_db_and_tables() -> None:
    """Create all tables defined in SQLModel metadata.
    Used for testing / dev only — production uses Alembic migrations.
    """
    async with async_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
