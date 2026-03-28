---
id: "0005"
title: backend-fastapi-endpoints-complete
stage: green
date: 2026-03-26
surface: agent
model: claude-sonnet-4-6
feature: 001-todo-web-app
branch: 001-tasks-crud
user: ASFAR
command: /sp.implement
labels: ["backend","fastapi","sqlmodel","jwt","rest-api","alembic","phase-2"]
links:
  spec: specs/001-todo-web-app/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - backend/pyproject.toml
  - backend/app/config.py
  - backend/app/database.py
  - backend/app/models/user.py
  - backend/app/models/task.py
  - backend/alembic.ini
  - backend/migrations/env.py
  - backend/migrations/script.py.mako
  - backend/migrations/versions/001_create_user_task_tables.py
  - backend/app/api/deps.py
  - backend/app/schemas/task.py
  - backend/app/services/task_service.py
  - backend/app/api/routes/tasks.py
  - backend/app/main.py
  - backend/Dockerfile
  - backend/tests/conftest.py
tests:
  - backend/tests/conftest.py (AsyncClient fixture via ASGITransport)
---

## Prompt

Yes, proceed with Phase 2 — Foundational (T007–T020). Implement exactly in this order and stop after each major section:
1. Backend (FastAPI + SQLModel + JWT middleware + config + database connection)
2. Database models + Alembic migration
3. All 6 REST API endpoints with full user isolation
4. Frontend Next.js 16+ project + Better Auth + Tailwind + api-client.ts
5. All Task CRUD UI pages and components
6. Full integration + testing

## Response snapshot

Implemented complete FastAPI backend (Sections 1–3):

**Backend Foundation (T007–T015)**:
- `pyproject.toml`: fastapi, uvicorn, sqlmodel, sqlalchemy[asyncio], asyncpg, alembic, python-jose[cryptography], pydantic-settings, passlib[bcrypt], httpx; Python >=3.12
- `app/config.py`: pydantic-settings BaseSettings with BETTER_AUTH_SECRET, DATABASE_URL, BACKEND_CORS_ORIGIN; @lru_cache singleton
- `app/database.py`: async_engine (asyncpg), AsyncSessionLocal, get_session() async generator dep
- `app/models/user.py`: User SQLModel table — id UUID PK, email UNIQUE, hashed_password, created_at
- `app/models/task.py`: Task SQLModel table — id UUID PK, user_id FK→user(id) CASCADE, title max 200, description nullable max 1000, is_complete bool, created_at, updated_at; composite index (user_id, is_complete)
- Alembic: alembic.ini + async migrations/env.py + versions/001_create_user_task_tables.py
- `app/api/deps.py`: get_current_user_id() — HTTPBearer → decode HS256 JWT → 401 if invalid, 403 if path user_id ≠ sub claim
- `app/main.py`: CORSMiddleware, GET /health, tasks_router at /api/{user_id}/tasks

**Schemas (T028, T053)**:
- TaskCreateRequest: title (1–200, strip_whitespace), description (opt, max 1000)
- TaskUpdateRequest: optional title/description with at_least_one_field validator
- TaskResponse: full task fields, from_attributes=True
- TaskListResponse: tasks list + total count
- StatusFilter: Literal["pending", "completed"]

**Services (T029–T030, T039, T043, T048, T054–T055)**:
- create_task: inserts Task with user_id from JWT
- list_tasks: WHERE user_id + optional is_complete filter + ORDER BY created_at DESC
- get_task: fetch by id AND user_id → 404 if not found (prevents ownership leakage)
- update_task: apply non-None fields + updated_at = utcnow()
- toggle_complete: flip is_complete + updated_at
- delete_task: fetch (404 guard) then session.delete + commit

**Routes (T031–T032, T036–T037, T040–T041, T043–T044, T049, T051–T052, T056–T057)**:
All 6 endpoints at /api/{user_id}/tasks — GET list, POST create, GET by id, PUT update, DELETE, PATCH toggle

## Outcome

- ✅ Impact: Complete FastAPI backend implemented — all 6 REST endpoints with user isolation via JWT. T007–T015, T028–T033, T039–T040, T043–T044, T048–T049, T053–T057 marked complete.
- 🧪 Tests: conftest.py AsyncClient fixture in place; no test logic yet (tests not requested in spec)
- 📁 Files: 16 backend files created
- 🔁 Next prompts: Section 4 — Frontend (T016–T020): Next.js 16+ init, Better Auth install, auth.ts, API route handler, api-client.ts
- 🧠 Reflection: All DB queries scoped to current_user_id from JWT dep; 404 returned (not 403) for wrong-owner tasks to prevent ownership leakage

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): Not run (no tests requested)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Add integration tests once Neon dev branch is provisioned
