# Tasks: Todo App Phase II — Multi-User Web Application

**Input**: Design documents from `/specs/001-todo-web-app/`
**Branch**: `001-todo-web-app` | **Date**: 2026-03-26
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/openapi.yaml ✅ | quickstart.md ✅

**Tests**: Not requested in spec — no test tasks generated. Smoke-test checkpoints included per phase.

**Total Tasks**: 72 | **Phases**: 9 | **Parallelizable**: 28 tasks marked [P]

---

## Format: `- [ ] [ID] [P?] [Story?] Description → file/path`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[US#]**: Maps to User Story from spec.md
- All file paths are relative to repository root

---

## Phase 1: Setup — Monorepo & Environment

**Purpose**: Create the full monorepo directory structure, Docker Compose configuration, environment variable template, and per-service CLAUDE.md guidelines. No code logic here — structure only.

- [x] T001 Create monorepo root directory structure: `frontend/`, `backend/`, `backend/app/`, `backend/migrations/`, `backend/tests/`, `frontend/src/app/`, `frontend/src/components/`, `frontend/src/lib/`, `frontend/src/hooks/`, `frontend/tests/`
- [x] T002 [P] Create `docker-compose.yml` at repo root — define `frontend` service (port 3000) and `backend` service (port 8000), both referencing `env_file: .env`; no local DB container (Neon is cloud)
- [x] T003 [P] Create `.env.example` at repo root with all required keys: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `BACKEND_PORT`, `BACKEND_CORS_ORIGIN`, `NEXT_PUBLIC_API_BASE_URL` — all values blank with inline comments
- [x] T004 [P] Update `CLAUDE.md` at repo root — append Phase II technology section: Next.js 16+ App Router + TypeScript, FastAPI + Python 3.12.6, SQLModel + Neon PostgreSQL, Better Auth + JWT; no-hardcoded-secrets rule; monorepo layout reference
- [x] T005 Create `frontend/CLAUDE.md` — document Next.js App Router conventions (route groups, server vs client components), Tailwind CSS usage, Better Auth session patterns, api-client.ts usage, and import path aliases
- [x] T006 [P] Create `backend/CLAUDE.md` — document FastAPI project layout, SQLModel async patterns, JWT dep injection via `deps.py`, service-layer pattern (routes → services → DB), Alembic migration workflow, and `.env` via pydantic-settings

**Checkpoint ✓**: Directory tree exists. `docker-compose.yml`, `.env.example`, and three CLAUDE.md files are in place. `git status` shows all new files untracked.

---

## Phase 2: Foundational — Backend + Frontend Scaffold (Blocking)

**Purpose**: Core infrastructure both services need before any user story can be implemented. All Phase 3+ user story work depends on this phase being complete.

**⚠️ CRITICAL**: No user story work begins until this entire phase is done.

### Backend Foundation

- [x] T007 Create `backend/pyproject.toml` with dependencies: `fastapi`, `uvicorn[standard]`, `sqlmodel`, `sqlalchemy[asyncio]`, `asyncpg`, `alembic`, `python-jose[cryptography]`, `pydantic-settings`, `httpx`; set Python version to `>=3.12`
- [x] T008 [P] Create `backend/app/config.py` — `Settings` class (pydantic-settings `BaseSettings`) with fields: `BETTER_AUTH_SECRET: str`, `DATABASE_URL: str`, `BACKEND_CORS_ORIGIN: str`; `get_settings()` lru_cache dependency
- [x] T009 Create `backend/app/database.py` — create `async_engine` from `DATABASE_URL` (asyncpg driver, `?sslmode=require` for Neon), `AsyncSessionLocal = async_sessionmaker(async_engine, expire_on_commit=False)`, `get_session()` async generator dependency yielding `AsyncSession`
- [x] T010 [P] Create `backend/app/models/user.py` — `User(SQLModel, table=True)` with fields: `id: UUID (PK, default gen)`, `email: str (unique, index, max 320)`, `hashed_password: str`, `created_at: datetime (default utcnow)`
- [x] T011 Create `backend/app/models/task.py` — `Task(SQLModel, table=True)` with fields: `id: UUID (PK, default gen)`, `user_id: UUID (FK user.id, index, ON DELETE CASCADE)`, `title: str (max 200)`, `description: Optional[str] (max 1000, nullable)`, `is_complete: bool (default False)`, `created_at: datetime`, `updated_at: datetime`; composite index on `(user_id, is_complete)`
- [x] T012 Initialize Alembic in `backend/` — run `alembic init migrations`; update `alembic.ini` to use `DATABASE_URL` from env; update `migrations/env.py` to use async engine and import `SQLModel.metadata` as `target_metadata`
- [x] T013 Generate initial Alembic migration — `alembic revision --autogenerate -m "create user and task tables"` → produces `backend/migrations/versions/001_create_user_task_tables.py`; verify it creates both tables with all columns, FKs, and indexes
- [x] T014 Create `backend/app/api/deps.py` — implement `get_current_user_id(user_id: UUID, token: str = Depends(oauth2_scheme), settings = Depends(get_settings)) -> UUID`: decode JWT using `python-jose` with `BETTER_AUTH_SECRET`, extract `sub` claim, compare to `user_id` path param — raise `HTTPException(401)` if invalid/expired, `HTTPException(403)` if mismatch
- [x] T015 [P] Create `backend/app/main.py` — FastAPI app factory: add `CORSMiddleware` (origins from `BACKEND_CORS_ORIGIN`), mount `/api` router prefix, add `GET /health` endpoint returning `{"status": "ok", "version": "1.0.0"}`

### Frontend Foundation

- [x] T016 Initialize Next.js 16+ project in `frontend/` — `npx create-next-app@latest frontend --typescript --tailwind --app --src-dir --import-alias "@/*"` (App Router, TypeScript, Tailwind, src/ layout, @/ alias)
- [x] T017 Install Better Auth in `frontend/` — `npm install better-auth`; add `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` to `frontend/.env.local` (reference from root `.env`)
- [x] T018 [P] Create `frontend/src/lib/auth.ts` — configure Better Auth client: `createAuthClient({ baseURL: process.env.BETTER_AUTH_URL })` exporting `signUp`, `signIn`, `signOut`, `useSession` (or `getSession` for server components); set email/password provider only
- [x] T019 Create Better Auth API route handler at `frontend/src/app/api/auth/[...all]/route.ts` — export `{ GET, POST }` from Better Auth handler; this is the auth endpoint Next.js needs for sign-in/sign-up/sign-out
- [x] T020 [P] Create `frontend/src/lib/api-client.ts` — async `apiRequest(path, options?)` function: reads Better Auth session JWT, constructs full URL from `NEXT_PUBLIC_API_BASE_URL`, attaches `Authorization: Bearer <token>` header; if response is 401, calls `signOut()` and redirects to `/login`; exports typed wrappers: `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiPatch`

**Checkpoint ✓**: Backend: `uvicorn app.main:app` starts, `GET /health` returns 200. Alembic migration runs without error against Neon dev branch. Frontend: `npm run dev` starts, no TypeScript errors. Better Auth API route responds to `GET /api/auth/session`.

---

## Phase 3: User Story 1 — User Registration and Login (Priority: P1) 🎯 MVP

**Goal**: A new visitor can sign up with email + password and be redirected to their dashboard. A returning user can sign in. An authenticated user can log out. Unauthenticated access to the dashboard redirects to `/login`.

**Independent Test**: Navigate to `/signup` → register with `test@example.com` / `password123` → auto-redirected to `/tasks` → navigate to `/login`, sign out, and try accessing `/tasks` directly → redirected to `/login`.

- [x] T021 [US1] Create root layout `frontend/src/app/layout.tsx` — wrap children in Better Auth `SessionProvider` (or equivalent context); set `<html lang="en">` with Tailwind base classes; import global CSS
- [x] T022 [P] [US1] Create `(auth)` route group layout at `frontend/src/app/(auth)/layout.tsx` — server component; check session via `getSession()`; if session exists, redirect to `/tasks`; render centered auth card layout for children
- [x] T023 [P] [US1] Create signup page at `frontend/src/app/(auth)/signup/page.tsx` — client component; form with `email` + `password` fields; on submit call `signUp.email({ email, password, name: email })`; on success redirect to `/tasks`; show inline validation error if email taken or password too short; link to `/login`
- [x] T024 [P] [US1] Create login page at `frontend/src/app/(auth)/login/page.tsx` — client component; form with `email` + `password` fields; on submit call `signIn.email({ email, password })`; on success redirect to `/tasks`; show generic "Invalid credentials" error on failure; link to `/signup`
- [x] T025 [US1] Create `frontend/middleware.ts` at repo root of frontend — Next.js middleware: use Better Auth `auth.api.getSession()` to check for valid session; if request path matches `/(dashboard)/` group and no session found, redirect to `/login`; if request path is `/login` or `/signup` and session exists, redirect to `/tasks`
- [x] T026 [US1] Create `(dashboard)` route group layout at `frontend/src/app/(dashboard)/layout.tsx` — server component; verify session server-side (secondary guard after middleware); render top nav bar with user email display and `Sign Out` button (calls `signOut()` then redirects to `/login`); wraps children in responsive max-width container
- [x] T027 [P] [US1] Create reusable UI components in `frontend/src/components/ui/` — `Button.tsx` (primary/secondary/danger variants, disabled + loading states, Tailwind) and `Input.tsx` (label + error message support, focus ring, Tailwind); used by auth forms and task forms

**Checkpoint ✓**: User Story 1 independently complete. Register → auto sign-in → dashboard visible. Sign out → `/login` shown. Direct `/tasks` access without session → redirected to `/login`. Incorrect login → error shown.

---

## Phase 4: User Story 2 — Create and View Personal Todos (Priority: P2)

**Goal**: Authenticated user creates a todo (title required), sees it appear immediately in their list, and sees only their own todos. Data persists across sessions.

**Independent Test**: Sign in → dashboard shows "No todos yet" empty state → create "Buy milk" → appears in list → sign out → sign back in → "Buy milk" still present → create todo as different user → each user sees only their own list.

### Backend: Create + List Endpoints

- [x] T028 [US2] Create `backend/app/schemas/task.py` — Pydantic models: `TaskCreateRequest(BaseModel)` with `title: str (min_length=1, max_length=200, strip_whitespace=True)` and `description: Optional[str] (max_length=1000)` ; `TaskResponse(SQLModel)` mirroring Task fields; `TaskListResponse(BaseModel)` with `tasks: list[TaskResponse]` and `total: int`
- [x] T029 [US2] Implement `task_service.create_task(session, user_id, data: TaskCreateRequest) -> Task` in `backend/app/services/task_service.py` — strip-and-validate title (reject whitespace-only), set `user_id` from JWT dep (never from request), insert Task, return created record
- [x] T030 [US2] Implement `task_service.list_tasks(session, user_id, status_filter=None) -> list[Task]` in `backend/app/services/task_service.py` — `SELECT * FROM task WHERE user_id = :uid ORDER BY created_at DESC`; if `status_filter == "pending"` add `AND is_complete = false`
- [x] T031 [US2] Implement `POST /api/{user_id}/tasks` in `backend/app/api/routes/tasks.py` — inject `current_user_id = Depends(get_current_user_id)`, call `task_service.create_task()`, return `TaskResponse` with HTTP 201
- [x] T032 [US2] Implement `GET /api/{user_id}/tasks` in `backend/app/api/routes/tasks.py` — inject `current_user_id`, accept optional `?status` query param (enum: `pending`; invalid value → 422), call `task_service.list_tasks()`, return `TaskListResponse`
- [x] T033 [US2] Register tasks router in `backend/app/main.py` — `app.include_router(tasks_router, prefix="/api")` so all endpoints are reachable at `/api/{user_id}/tasks`

### Frontend: Task List + Create Form

- [x] T034 [P] [US2] Create `frontend/src/components/tasks/TaskCard.tsx` — client component; accepts `task: TaskResponse` prop; displays `title` (with strikethrough class when `is_complete`), `description` (if present), completion status indicator (checkbox/checkmark icon); placeholder action buttons (toggle, edit, delete) — wired in later phases
- [x] T035 [P] [US2] Create `frontend/src/components/tasks/TaskList.tsx` — client component; accepts `tasks: TaskResponse[]` prop; renders `TaskCard` for each task; shows "No todos yet — create your first one!" empty state when `tasks.length === 0`
- [x] T036 [US2] Create `frontend/src/components/tasks/TaskForm.tsx` (create mode) — client component; `title` input (required, max 200 chars) and optional `description` textarea (max 1000 chars); client-side validation before submit; on submit call `createTask()` from `useTasks`; show inline validation errors; reset form on success
- [x] T037 [US2] Create `frontend/src/hooks/useTasks.ts` — custom React hook; state: `tasks`, `isLoading`, `error`, `filter`; functions: `fetchTasks()` → `GET /api/{userId}/tasks`, `createTask(data)` → `POST /api/{userId}/tasks`; `userId` sourced from Better Auth session `user.id`; updates local `tasks` state optimistically or on response
- [x] T038 [US2] Create tasks dashboard page at `frontend/src/app/(dashboard)/tasks/page.tsx` — server component for initial load (or client component with `useEffect`); use `useTasks()` hook; render `TaskForm` at top, `TaskList` below; pass `tasks` + handlers down to components; show loading state while fetching

**Checkpoint ✓**: User Story 2 independently complete. Create 3 todos → all 3 appear in list. Whitespace-only title → rejected with error. Two-user isolation test: User A's todos invisible to User B.

---

## Phase 5: User Story 3 — Mark Todos Complete or Incomplete (Priority: P3)

**Goal**: User clicks a toggle on any todo to flip its completion status. Visual indicator (strikethrough/checkmark) updates immediately. Other todos unaffected.

**Independent Test**: Create "Walk dog" → click toggle → strikethrough appears, checkmark shows → click toggle again → strikethrough gone, pending state restored.

- [x] T039 [US3] Implement `task_service.toggle_complete(session, task_id, user_id) -> Task` in `backend/app/services/task_service.py` — fetch task by `id AND user_id` (404 if not found), flip `is_complete`, update `updated_at = utcnow()`, commit, return updated task
- [x] T040 [US3] Implement `PATCH /api/{user_id}/tasks/{task_id}/complete` in `backend/app/api/routes/tasks.py` — no request body; inject `current_user_id`; call `task_service.toggle_complete()`; return updated `TaskResponse` with HTTP 200
- [x] T041 [US3] Add `toggleTask(taskId)` to `frontend/src/hooks/useTasks.ts` — call `apiPatch(/api/${userId}/tasks/${taskId}/complete)`; on success update the matching task in local `tasks` state (flip `is_complete`) without full refetch
- [x] T042 [US3] Wire toggle button in `frontend/src/components/tasks/TaskCard.tsx` — checkbox or circle icon button; `onClick → toggleTask(task.id)`; apply `line-through text-gray-400` Tailwind classes when `is_complete === true`; show `✓` icon when complete, `○` icon when pending

**Checkpoint ✓**: Toggle complete → strikethrough + checkmark. Toggle back → pending restored. Only the toggled task changes; others unchanged. PATCH returns 404 if task doesn't belong to user.

---

## Phase 6: User Story 4 — Delete Todos (Priority: P4)

**Goal**: User permanently removes a todo after confirming. Todo disappears immediately. Last todo deleted shows empty state.

**Independent Test**: Create "Test task" → click delete → confirm dialog appears → click "Delete" → todo gone → list shows empty state. Click delete → click "Cancel" → todo unchanged.

- [x] T043 [US4] Implement `task_service.delete_task(session, task_id, user_id)` in `backend/app/services/task_service.py` — fetch task by `id AND user_id` (404 if not found or not owned), delete record, commit; no return value (204)
- [x] T044 [US4] Implement `DELETE /api/{user_id}/tasks/{task_id}` in `backend/app/api/routes/tasks.py` — inject `current_user_id`; call `task_service.delete_task()`; return `Response(status_code=204)`
- [x] T045 [P] [US4] Create `frontend/src/components/tasks/DeleteConfirm.tsx` — modal/dialog component; props: `isOpen`, `taskTitle`, `onConfirm`, `onCancel`; shows "Delete '{title}'?" with "Delete" (danger red) and "Cancel" buttons; traps focus; closes on Escape key
- [x] T046 [US4] Add `deleteTask(taskId)` to `frontend/src/hooks/useTasks.ts` — call `apiDelete(/api/${userId}/tasks/${taskId})`; on 204 response remove task from local `tasks` state
- [x] T047 [US4] Wire delete button + `DeleteConfirm` into `frontend/src/components/tasks/TaskCard.tsx` — delete (trash icon) button; `onClick` sets `confirmingDeleteId` state; renders `<DeleteConfirm>` when `confirmingDeleteId === task.id`; on confirm call `deleteTask(task.id)`; on cancel clear `confirmingDeleteId`

**Checkpoint ✓**: Create todo → delete → confirm → gone. Cancel → stays. Last todo deleted → "No todos yet" empty state shown. DELETE with wrong user_id returns 404.

---

## Phase 7: User Story 5 — Filter Todos by Status (Priority: P5)

**Goal**: User filters their list with "All | Active | Completed" toggle. Active shows only incomplete, Completed shows only complete, All shows everything.

**Independent Test**: Create 3 incomplete + 2 complete todos → Active filter shows 3 → Completed filter shows 2 → All filter shows 5.

- [x] T048 [US5] Update `task_service.list_tasks()` in `backend/app/services/task_service.py` to accept `status: Optional[Literal["pending", "completed"]]` — add `AND is_complete = false` for `pending`, `AND is_complete = true` for `completed`; `None` returns all
- [x] T049 [US5] Update `GET /api/{user_id}/tasks` in `backend/app/api/routes/tasks.py` — expand `?status` query param enum to accept `pending` and `completed`; pass to `task_service.list_tasks()`
- [x] T050 [P] [US5] Create `frontend/src/components/tasks/TaskFilter.tsx` — client component; 3-button toggle group: "All" | "Active" | "Completed"; accepts `value: "all" | "active" | "completed"` and `onChange` props; active button has distinct Tailwind style (bg-blue-600 text-white)
- [x] T051 [US5] Add `filter` state + `setFilter()` to `frontend/src/hooks/useTasks.ts` — when filter changes, call `fetchTasks()` with appropriate `?status` param (`active` → `?status=pending`, `completed` → `?status=completed`, `all` → no param); update `tasks` state from response
- [x] T052 [US5] Wire `TaskFilter` into tasks page `frontend/src/app/(dashboard)/tasks/page.tsx` — render `<TaskFilter>` above `<TaskList>`; pass `filter` state and `setFilter` from `useTasks` hook

**Checkpoint ✓**: All 5 user stories complete. Filter works: Active=incomplete only, Completed=complete only, All=everything. Filter state persists while on page.

---

## Phase 8: Full CRUD — Edit Task (Completing All 6 API Endpoints)

**Goal**: User can edit a todo's title and optional description. Completes the full 6-endpoint REST contract from `contracts/openapi.yaml`. These operations underlie the "Update a Task" capability from `specs/001-tasks-crud/spec.md`.

**Independent Test**: Create "Old title" → click edit → form pre-filled → change to "New title" → save → list shows "New title". Cancel edit → original unchanged.

- [x] T053 [US2] Add `TaskUpdateRequest(BaseModel)` to `backend/app/schemas/task.py` — fields: `title: Optional[str] (min_length=1, max_length=200, strip_whitespace=True)` and `description: Optional[str] (max_length=1000, nullable)`; at least one field must be provided (validator)
- [x] T054 [US2] Implement `task_service.get_task(session, task_id, user_id) -> Task` in `backend/app/services/task_service.py` — fetch by `id AND user_id`; raise `HTTPException(404)` if not found
- [x] T055 [US2] Implement `task_service.update_task(session, task_id, user_id, data: TaskUpdateRequest) -> Task` in `backend/app/services/task_service.py` — fetch task (404 if not found), apply non-None fields, set `updated_at = utcnow()`, commit, return updated task
- [x] T056 [US2] Implement `GET /api/{user_id}/tasks/{task_id}` in `backend/app/api/routes/tasks.py` — inject `current_user_id`; call `task_service.get_task()`; return `TaskResponse`
- [x] T057 [US2] Implement `PUT /api/{user_id}/tasks/{task_id}` in `backend/app/api/routes/tasks.py` — inject `current_user_id`, body `TaskUpdateRequest`; call `task_service.update_task()`; return updated `TaskResponse` with HTTP 200
- [x] T058 [US2] Extend `frontend/src/components/tasks/TaskForm.tsx` to support edit mode — accept optional `task?: TaskResponse` prop; when provided, pre-fill `title` + `description` fields and show "Save" instead of "Create"; on submit call `updateTask()` from `useTasks` instead of `createTask()`; emit `onSuccess(updatedTask)` callback
- [x] T059 [US2] Add `updateTask(taskId, data)` to `frontend/src/hooks/useTasks.ts` — call `apiPut(/api/${userId}/tasks/${taskId})`; on success update matching task in local `tasks` state
- [x] T060 [US2] Wire edit button + edit form into `frontend/src/components/tasks/TaskCard.tsx` — pencil icon button; `onClick` sets `editingTaskId = task.id`; renders `<TaskForm task={task} onSuccess={...} onCancel={...}>` inline (or as overlay) when `editingTaskId === task.id`; on success/cancel clear `editingTaskId`

**Checkpoint ✓**: All 6 API endpoints functional. Edit → pre-populated form → save → updated. Cancel → unchanged. PUT with another user's task_id returns 404.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, responsive layout, loading states, user isolation smoke test, and final documentation. Affects all user stories.

- [x] T061 Implement global 401 handling in `frontend/src/lib/api-client.ts` — if any API response returns HTTP 401, call `signOut()` then `router.push('/login')` with message `?expired=1`; login page shows "Session expired, please sign in again" when `?expired=1` is in URL
- [x] T062 [P] Add loading skeleton / spinner states to tasks page `frontend/src/app/(dashboard)/tasks/page.tsx` — show skeleton cards (3 gray placeholder boxes) while `isLoading === true` in `useTasks`; show error banner with retry button if `error` is set
- [x] T063 [P] Verify and fix responsive Tailwind layout for all task components — `TaskCard.tsx`: full-width on mobile, max-w on desktop; `TaskForm.tsx`: stacked fields on mobile; `TaskFilter.tsx`: full-width button group on mobile; `TaskList.tsx`: comfortable spacing at 375px width; test at `sm:`, `md:`, `lg:` breakpoints
- [x] T064 [P] Add `/health` endpoint response model and startup DB connection check in `backend/app/main.py` — on startup event, attempt a lightweight `SELECT 1` against Neon; log success/failure; health endpoint returns `{"status": "ok", "db": "connected"}` or `{"status": "degraded", "db": "unreachable"}`
- [x] T065 Run Alembic migration against Neon dev branch — execute `docker-compose exec backend alembic upgrade head`; verify `user` and `task` tables exist with correct columns, FKs, and indexes using Neon console or `psql`
- [x] T066 Write `README.md` at repo root — sections: Prerequisites table, Clone + env setup steps, Neon DB setup, `docker-compose up --build`, migration command, verify checklist (`curl /health`, open `localhost:3000`, register, create todo); reference `specs/001-todo-web-app/quickstart.md` for detail
- [x] T067 [P] Add deployment notes appendix to `README.md` — Frontend (Vercel): env vars to set (`BETTER_AUTH_SECRET`, `NEXT_PUBLIC_API_BASE_URL`, `BETTER_AUTH_URL`), build command, output directory. Backend (Render/Railway/Fly.io): env vars (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BACKEND_CORS_ORIGIN`), start command (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`)
- [x] T068 End-to-end user isolation smoke test — manually follow `specs/001-todo-web-app/quickstart.md`: register User A → create 3 todos → sign out → register User B → create 2 todos → verify User B sees only 2 → sign back in as User A → verify User A sees only 3; also attempt to call `DELETE /api/{userB_id}/tasks/{userA_task_id}` with User A's token → verify 403

**Checkpoint ✓**: Full system complete. All 5 user stories pass independent tests. README allows a fresh clone → running app in < 10 minutes. Two-user isolation verified manually.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup             → No dependencies. Start immediately.
Phase 2: Foundational      → Requires Phase 1. BLOCKS Phases 3–9.
Phase 3: US1 Auth          → Requires Phase 2. Blocks Phases 4–9 (auth needed for all).
Phase 4: US2 Create/View   → Requires Phase 3 (session + API client ready).
Phase 5: US3 Toggle        → Requires Phase 4 (tasks exist in DB + UI).
Phase 6: US4 Delete        → Requires Phase 4 (tasks must exist to delete).
Phase 7: US5 Filter        → Requires Phase 4 (tasks must exist to filter).
Phase 8: Edit Task         → Requires Phase 4 (extends create/view CRUD).
Phase 9: Polish            → Requires Phases 5–8 complete.
```

### Within-Phase Dependencies

- **Phase 2**: T007 → T009 (pyproject before database); T010+T011 → T012 → T013 (models before migration); T008+T009 can run parallel to T010+T011
- **Phase 4**: T028 → T029 → T031 → T032 → T033 (schemas before service before routes); T034+T035 can parallel; T036 → T037 (hook before page)
- **Phase 8**: T053 → T054+T055 → T056+T057 (schema before service before routes); T058 → T059 → T060 (form before hook before wire)

### Parallel Opportunities per Phase

```
Phase 1:  T002 ‖ T003 ‖ T004 ‖ T006         (4 parallel)
Phase 2:  T008 ‖ T010+T011                   (backend parallel)
          T016 ‖ T017+T018 ‖ T019+T020       (frontend parallel after T016)
Phase 3:  T022 ‖ T023 ‖ T024 ‖ T027         (4 parallel after T021)
Phase 4:  T029+T030 ‖ T034+T035             (backend service ‖ frontend components)
Phase 6:  T045 parallel to T043+T044
Phase 7:  T050 parallel to T048+T049
Phase 9:  T062 ‖ T063 ‖ T064 ‖ T067        (4 parallel)
```

---

## Implementation Strategy

### MVP Scope (User Story 1 Only — ~2 hours)

1. Complete Phase 1 (Setup) — T001–T006
2. Complete Phase 2 (Foundational) — T007–T020
3. Complete Phase 3 (US1: Auth) — T021–T027
4. **STOP and VALIDATE**: Register, login, logout, route protection all work
5. Demo: New user signs up → lands on (empty) dashboard

### Incremental Delivery

```
After Phase 3 → Demo: Auth complete (register, login, logout, protected routes)
After Phase 4 → Demo: Create todos + view list (core value delivered)
After Phase 5 → Demo: Toggle completion (strikethrough effect)
After Phase 6 → Demo: Delete with confirmation
After Phase 7 → Demo: Filter All/Active/Completed
After Phase 8 → Demo: Full CRUD (all 6 API endpoints working)
After Phase 9 → Demo: Production-ready with isolation verified
```

### Parallel Team Strategy (2 developers)

```
Both:      Complete Phase 1 + 2 together

Split:
Dev A:     Phase 3 (US1 Auth) → Phase 4 backend (T028–T033) → Phase 5–6 backend
Dev B:     Phase 4 frontend (T034–T038) → Phase 5–6 frontend → Phase 7–8 frontend

Merge:     Phase 9 Polish together
```

---

## Notes

- Tasks marked [P] touch different files and have no shared dependencies within their phase — they can be assigned to parallel LLM agents
- Every phase ends with an independent checkpoint — stop and verify before moving on
- `user_id` is ALWAYS injected from JWT via `get_current_user_id` dep — never accepted from request body or trusted from URL alone (FR-018)
- Title whitespace stripping (`strip_whitespace=True` in Pydantic) prevents empty-after-trim submissions reaching the DB
- All API calls from frontend use `api-client.ts` — never raw `fetch()` with manual header construction
- Secrets in `.env` only — never in source code, never committed
