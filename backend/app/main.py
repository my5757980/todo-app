"""FastAPI application factory.

Mounts:
  - CORS middleware (frontend origin from BACKEND_CORS_ORIGIN env)
  - GET /health — liveness + DB readiness check
  - /api/{user_id}/tasks — all 6 task endpoints (JWT required)

Ref: backend/CLAUDE.md
     specs/001-todo-web-app/plan.md § 1.1 Authentication Flow
     tasks.md T064
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.routes.chat import router as chat_router
from app.api.routes.tasks import router as tasks_router
from app.config import get_settings
from app.database import async_engine

# Import all models so SQLAlchemy metadata is fully populated before any DB write.
# Without this, FK resolution fails on INSERT (NoReferencedTableError for 'user').
import app.models.user  # noqa: F401
import app.models.task  # noqa: F401
import app.models.conversation  # noqa: F401
import app.models.message  # noqa: F401

logger = logging.getLogger(__name__)
settings = get_settings()

app = FastAPI(
    title="Todo App Phase II API",
    version="1.0.0",
    description=(
        "Multi-user todo REST API. "
        "All task endpoints require a valid JWT issued by Better Auth. "
        "See /docs for the interactive API explorer."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — allow the Next.js frontend to call the API
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.BACKEND_CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ---------------------------------------------------------------------------
# Startup — verify DB connectivity (lightweight SELECT 1)
# Logs success/failure; does NOT prevent startup (Neon may be cold-starting)
# Ref: tasks.md T064
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def verify_db_connection() -> None:
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection verified on startup.")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Database connectivity check failed on startup: %s", exc)


# ---------------------------------------------------------------------------
# Health check — used by Docker Compose healthcheck and ops monitoring
# Reports DB reachability (does NOT block returns on failure)
# Ref: tasks.md T064
# ---------------------------------------------------------------------------
@app.get("/health", tags=["system"], summary="Liveness + DB readiness check")
async def health_check() -> dict:
    db_status = "connected"
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001
        db_status = "unreachable"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "version": "1.0.0",
        "db": db_status,
    }


# ---------------------------------------------------------------------------
# Task routes — prefix: /api/{user_id}/tasks
# Ref: specs/001-todo-web-app/contracts/openapi.yaml
# ---------------------------------------------------------------------------
app.include_router(
    tasks_router,
    prefix="/api/{user_id}/tasks",
    tags=["tasks"],
)

# ---------------------------------------------------------------------------
# Chat routes — prefix: /api/{user_id}/chat
# Ref: specs/003-ai-todo-chatbot/spec.md § API Contracts
# ---------------------------------------------------------------------------
app.include_router(
    chat_router,
    prefix="/api/{user_id}/chat",
    tags=["chat"],
)
