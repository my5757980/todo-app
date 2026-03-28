import asyncio
from logging.config import fileConfig
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel

# Import ALL models so Alembic sees their metadata
from app.models.user import User  # noqa: F401
from app.models.task import Task  # noqa: F401
from app.models.conversation import Conversation  # noqa: F401
from app.models.message import Message  # noqa: F401
from app.config import get_settings


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

config = context.config
settings = get_settings()

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# SQLModel.metadata is the source of truth for autogenerate
target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Run migrations without a live DB connection (generates SQL script)."""
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=False,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations with an async engine (required for asyncpg)."""
    db_url, connect_args = _asyncpg_url(settings.DATABASE_URL)
    connectable = create_async_engine(db_url, connect_args=connect_args)

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
