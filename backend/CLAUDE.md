# Backend Guidelines — Todo App Phase II

## Tech Stack
- **Language**: Python 3.12.6
- **Framework**: FastAPI (async)
- **ORM**: SQLModel (wraps SQLAlchemy 2.x async + Pydantic v2)
- **Database**: Neon Serverless PostgreSQL via asyncpg driver
- **Migrations**: Alembic
- **Auth**: JWT verification via python-jose — shared BETTER_AUTH_SECRET with frontend
- **Config**: pydantic-settings (`BaseSettings`) — reads from environment

## Project Structure
```
backend/
├── app/
│   ├── main.py             # FastAPI factory — CORS + router mount + /health
│   ├── config.py           # Settings (pydantic-settings) — get_settings() dep
│   ├── database.py         # async_engine + AsyncSession + get_session() dep
│   ├── models/
│   │   ├── user.py         # User SQLModel (table=True)
│   │   └── task.py         # Task SQLModel (table=True) — user_id FK
│   ├── schemas/
│   │   └── task.py         # TaskCreateRequest, TaskUpdateRequest, TaskResponse, TaskListResponse
│   ├── api/
│   │   ├── deps.py         # get_current_user_id() — JWT verification + path match
│   │   └── routes/
│   │       └── tasks.py    # All 6 task endpoints
│   └── services/
│       └── task_service.py # Business logic — all DB queries here, never in routes
├── migrations/
│   ├── env.py              # Alembic async config
│   └── versions/           # Migration files
├── tests/
│   ├── conftest.py
│   ├── unit/
│   └── integration/
├── alembic.ini
└── pyproject.toml
```

## Layered Architecture (STRICT)
```
Request → Route handler → Service → Database
```
- **Routes** (`api/routes/`): Only HTTP concerns — validate path params, call service, return response. NO DB queries.
- **Services** (`services/`): All business logic and DB queries. No HTTP concerns.
- **Models** (`models/`): SQLModel table definitions only. No logic.
- **Schemas** (`schemas/`): Pydantic request/response shapes. No DB access.
- **Deps** (`api/deps.py`): FastAPI dependencies — auth, session injection.

## JWT / Auth Rules
- `get_current_user_id()` in `deps.py` is the ONLY auth enforcement point
- Every protected route MUST declare `current_user_id: UUID = Depends(get_current_user_id)`
- `get_current_user_id()` validates JWT with `BETTER_AUTH_SECRET` and checks path `user_id` matches `sub` claim
- Raise `HTTPException(401)` for missing/invalid/expired token
- Raise `HTTPException(403)` for path user_id ≠ JWT sub
- NEVER trust `user_id` from request body — always from `current_user_id` dep

## Database Rules
- Use `async with get_session() as session` via FastAPI dependency injection
- All queries via SQLModel `select()` with explicit `WHERE task.user_id == current_user_id`
- Always `await session.commit()` before returning; use `await session.refresh(obj)` after insert
- Use `updated_at = datetime.utcnow()` explicitly on every update — no triggers
- `ON DELETE CASCADE` on `task.user_id` FK — deleting a user removes all their tasks

## Validation Rules
- `title`: `min_length=1, max_length=200, strip_whitespace=True` — Pydantic rejects whitespace-only
- `description`: `max_length=1000`, nullable — `None` is valid
- Status filter: Pydantic `Literal["pending", "completed"]` enum — invalid values → 422
- Return 404 (not 403) when task exists but belongs to another user — no ownership leakage

## Error Taxonomy
- `401 Unauthorized`: Missing or invalid JWT
- `403 Forbidden`: JWT valid but path user_id ≠ token sub
- `404 Not Found`: Task not found OR task belongs to another user (identical response)
- `422 Unprocessable Entity`: Validation failure (Pydantic) — FastAPI auto-generates
- `204 No Content`: Successful deletion

## Config Rules
- All settings via `pydantic-settings` `BaseSettings` reading from environment
- `get_settings()` is `@lru_cache()` — singleton per process
- Never import `os.environ` directly in app code — always via `Depends(get_settings)`
- DATABASE_URL uses `asyncpg` driver: `postgresql+asyncpg://...`

## Alembic Rules
- Run migrations: `alembic upgrade head`
- Generate migration: `alembic revision --autogenerate -m "description"`
- Migration env.py uses async engine via `run_async_migrations()`
- Target metadata: `SQLModel.metadata`
- Never manually edit migration files after they've been applied
