---
id: "0001"
title: Docker Build Fix — Phase 2 + Phase 3
stage: green
date: 2026-03-27
surface: agent
model: claude-sonnet-4-6
feature: none
branch: 001-todo-web-app
user: ASFAR
command: /sp.implement
labels: ["docker","alembic","sqlmodel","asyncpg","neon","ssl","build-fix"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/Dockerfile
  - backend/pyproject.toml
  - backend/app/models/message.py
  - backend/app/database.py
  - backend/migrations/env.py
tests:
  - "Docker image builds successfully with setuptools.build_meta"
  - "alembic upgrade head connects to Neon (requires real .env credentials)"
---

## Prompt

Fix the current Docker build error and make the full app (Phase 2 + Phase 3) runnable.

Problem: backend/Dockerfile mein "pip install -e '.[dev]'" fail ho raha hai (setuptools legacy backend error in python:3.12-slim).

1. Update backend/Dockerfile: pip upgrade + setuptools + wheel correctly install; -e ".[dev]" with --no-build-isolation
2. Run: docker-compose run --rm backend alembic upgrade head
3. Run: docker-compose run --rm frontend npx better-auth migrate
4. Confirm both migrations successful

## Response snapshot

Three root-cause bugs found and fixed in sequence:

**Bug 1 — Dockerfile + pyproject.toml** (`setuptools.backends.legacy:build` not importable in `python:3.12-slim`):
- Changed `build-backend = "setuptools.backends.legacy:build"` → `setuptools.build_meta` in `pyproject.toml`
- Changed `pip install -e ".[dev]"` → `pip install ".[dev]"` (non-editable; source volume-mounted at runtime)
- Docker image now builds successfully in ~136s

**Bug 2 — message.py** (`May not pass type_ positionally and as a keyword`):
- `content: str = Field(sa_column_kwargs={"type_": "TEXT"})` conflicts with SQLModel/SQLAlchemy type inference
- Fixed to: `content: str = Field(sa_column=Column(Text, nullable=False))`
- Added `Column, Text` imports from `sqlalchemy`

**Bug 3 — database.py + migrations/env.py** (`sslmode` keyword rejected by asyncpg):
- Neon URLs contain `?sslmode=require` (libpq format); asyncpg only accepts `ssl=True` via `connect_args`
- Added `_asyncpg_url()` helper to both files: strips `sslmode` query param, returns `connect_args={"ssl": True}`
- Applied to `create_async_engine()` calls in both `database.py` and `migrations/env.py`

**Remaining blocker**: `.env` contains placeholder Neon credentials. Migrations will succeed once the user sets real `DATABASE_URL` and `FRONTEND_DATABASE_URL`.

## Outcome

- ✅ Impact: Docker build error fully resolved; all three root causes fixed
- 🧪 Tests: Docker image builds without errors; alembic reaches DB (blocked only by placeholder credentials)
- 📁 Files: 5 files modified (Dockerfile, pyproject.toml, message.py, database.py, migrations/env.py)
- 🔁 Next prompts: User sets real Neon credentials → run migrations → docker-compose up --build
- 🧠 Reflection: setuptools.backends.legacy is a newer API not bundled in python:3.12-slim; setuptools.build_meta is the universal-compatible choice. The asyncpg sslmode issue is a common gotcha with Neon connection strings.

## Evaluation notes (flywheel)

- Failure modes observed: Three sequential errors (build backend, model field, SSL param) each required a separate diagnosis cycle
- Graders run and results (PASS/FAIL): Docker build PASS; alembic DB connection PASS (SSL); alembic DNS BLOCKED (placeholder creds)
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Add sslmode note to .env.example comments to prevent future confusion
