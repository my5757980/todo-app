# Todo App — Phase II + III

Multi-user web todo application with an AI-powered chatbot assistant.

**Phase II**: Next.js 15+ (App Router), FastAPI, Neon PostgreSQL, Better Auth JWT — full task CRUD with user isolation.
**Phase III**: Conversational AI chatbot (Grok via xAI) — manage tasks via natural language, persistent chat history, streaming responses.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Docker + Docker Compose | 24+ | For containerised local dev |
| Node.js | 20+ | For local frontend dev (non-Docker) |
| Python | 3.12.6 | For local backend dev (non-Docker) |
| Neon account | — | Free tier sufficient — [console.neon.tech](https://console.neon.tech) |
| xAI account | — | For Grok API key — [console.x.ai](https://console.x.ai) (Phase III) |

---

## Quick Start (Docker Compose)

### 1. Clone the repository

```bash
git clone <repo-url>
cd console-todo-app-hackathone-2-first-phase
```

### 2. Provision a Neon database

1. Sign in at [console.neon.tech](https://console.neon.tech)
2. Create a new project
3. Copy the connection string from **Connection Details**

You need two connection strings for the same database:
- **Backend** (asyncpg driver): `postgresql+asyncpg://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`
- **Frontend** (pg driver): `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in all values:

```env
# Shared secret — generate with: openssl rand -hex 32
BETTER_AUTH_SECRET=<your-32-char-secret>
BETTER_AUTH_URL=http://localhost:3000

# Backend — asyncpg driver format
DATABASE_URL=postgresql+asyncpg://user:pass@ep-xxx.neon.tech/dbname?sslmode=require

# Frontend Better Auth — standard pg driver (same DB, different prefix)
FRONTEND_DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require

# Backend service
BACKEND_PORT=8000
BACKEND_CORS_ORIGIN=http://localhost:3000

# Frontend (browser-accessible — must have NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# ── Phase III: Grok AI Chatbot ──────────────────────────────────────────────
# Get your key at https://console.x.ai → API Keys
# BACKEND ONLY — never use NEXT_PUBLIC_ prefix for this key
GROK_API_KEY=xai-your-key-here
GROK_MODEL=grok-3-mini
MAX_CONTEXT_MESSAGES=20
```

> **Security**: Never commit `.env`. It is git-ignored. Only `.env.example` is committed.
> **Grok key**: `GROK_API_KEY` is used exclusively in the FastAPI backend process. It is never exposed to the browser, never in `NEXT_PUBLIC_*` variables, and never logged.

### 4. Run database migrations

App tables (user + task + conversation + message):

```bash
docker-compose run --rm backend alembic upgrade head
```

This runs both migrations:
- `001` — creates `user` and `task` tables
- `002` — creates `conversation` and `message` tables (Phase III chat history)

Better Auth session tables:

```bash
docker-compose run --rm frontend npx better-auth migrate
```

### 5. Install frontend dependencies

```bash
cd frontend && npm install && cd ..
```

This installs the `ai` package (Vercel AI SDK) added in Phase III.

### 6. Start all services

```bash
docker-compose up --build
```

Both services start in development mode with live reload.

### 7. Verify

```bash
# Backend health (should show {"status":"ok","db":"connected"})
curl http://localhost:8000/health

# Open the app
open http://localhost:3000
```

---

## Local Development (Without Docker)

### Backend

```bash
cd backend
pip install -e ".[dev]"

# Create backend/.env with asyncpg DATABASE_URL, BETTER_AUTH_SECRET, BACKEND_CORS_ORIGIN
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Create frontend/.env.local (see frontend/.env.local.example)
# Use postgresql:// (not postgresql+asyncpg://) for DATABASE_URL
npx better-auth migrate
npm run dev
```

---

## Architecture Overview

```
Browser
  │
  ├── Next.js 15 App Router (port 3000)
  │     ├── /login, /signup          → Better Auth sign-in/sign-up
  │     ├── /tasks                   → Task CRUD dashboard (JWT required)
  │     ├── /chat                    → AI chatbot (JWT required)  ← Phase III
  │     ├── middleware.ts            → Cookie-based route guard
  │     ├── /api/auth/[...all]       → Better Auth handler
  │     └── /api/chat                → SSE proxy → FastAPI  ← Phase III
  │
  └── FastAPI (port 8000)
        ├── /api/{user_id}/tasks/*   → 6 REST endpoints (JWT Bearer required)
        └── /api/{user_id}/chat/*    → Chat endpoints (JWT Bearer required)  ← Phase III
              POST /                 → Grok agent loop + SSE stream
              GET  /history          → Load conversation history
              DELETE /history        → Clear conversation

AI: Grok (xAI) via OpenAI-compatible API  ← Phase III
  └── base_url = https://api.x.ai/v1, model = grok-3-mini (configurable)

Database: Neon Serverless PostgreSQL (cloud, shared by both services)
  ├── Better Auth tables: user, session, account, verification
  ├── App tables:         task (user_id FK → user.id CASCADE DELETE)
  └── Chat tables:        conversation (1 per user) + message  ← Phase III
```

### JWT Auth Flow

```
1. User signs in → Better Auth issues HS256 JWT (signed with BETTER_AUTH_SECRET)
2. JWT stored as cookie by Better Auth
3. api-client.ts extracts JWT → attaches Authorization: Bearer <token>
4. FastAPI deps.py decodes JWT with same BETTER_AUTH_SECRET
5. URL {user_id} validated against JWT sub claim → 403 if mismatch
6. All DB queries scoped to current_user_id → no cross-user data leakage
```

---

## API Reference

Base URL: `http://localhost:8000`

### Task Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Liveness + DB connectivity check |
| `GET` | `/api/{user_id}/tasks` | JWT | List tasks (`?status=pending\|completed`) |
| `POST` | `/api/{user_id}/tasks` | JWT | Create task (201) |
| `GET` | `/api/{user_id}/tasks/{task_id}` | JWT | Get single task |
| `PUT` | `/api/{user_id}/tasks/{task_id}` | JWT | Update task title/description |
| `DELETE` | `/api/{user_id}/tasks/{task_id}` | JWT | Delete task (204) |
| `PATCH` | `/api/{user_id}/tasks/{task_id}/complete` | JWT | Toggle is_complete |

### Chat Endpoints (Phase III)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/{user_id}/chat` | JWT | Send message → streams AI response (SSE) |
| `GET` | `/api/{user_id}/chat/history` | JWT | Load conversation history (up to 100 msgs) |
| `DELETE` | `/api/{user_id}/chat/history` | JWT | Clear all messages (204) |

Interactive docs: `http://localhost:8000/docs`

---

## Smoke Test — AI Chatbot (Phase III)

After the stack is running with a valid `GROK_API_KEY`, follow these steps:

```
1. Sign in → navigate to http://localhost:3000/chat
   ✓ Empty chat state: "No messages yet — ask me about your tasks…"

2. Type: "Add buy groceries to my list"
   ✓ Stream starts: 🔧 Creating task… indicator appears
   ✓ AI responds: "Done! I've added 'Buy groceries' to your tasks."

3. Navigate to /tasks
   ✓ "Buy groceries" appears in the task list

4. Return to /chat
   ✓ Previous message history is restored from DB

5. Type: "What are my todos?"
   ✓ 🔧 Listing your tasks… indicator appears
   ✓ AI lists all tasks with their titles and status

6. Type: "Mark buy groceries as done"
   ✓ 🔧 Updating task status… indicator appears
   ✓ AI confirms toggle

7. Navigate to /tasks
   ✓ "Buy groceries" shows strikethrough (is_complete = true)

8. Return to /chat → click "Clear chat"
   ✓ Messages cleared from DB and UI shows empty state

9. Refresh page → still empty
   ✓ History cleared from DB (not just client state)

10. Test user isolation:
    Sign out → sign up as a second user → navigate to /chat
    Type: "List my tasks"
    ✓ AI responds with empty list (cannot see first user's tasks)
```

---

## Smoke Test — User Isolation (for Judges)

After the stack is running, follow these steps to verify multi-user data isolation:

```
1. Navigate to http://localhost:3000/signup
   Register: user_a@test.com / Password123
   ✓ Redirected to /tasks (empty dashboard)

2. Create 3 tasks: "Task A1", "Task A2", "Task A3"
   ✓ All 3 appear in the list

3. Sign out (top-right button)
   ✓ Redirected to /login

4. Navigate to http://localhost:3000/signup
   Register: user_b@test.com / Password456
   ✓ Redirected to /tasks — EMPTY (no cross-user leakage)

5. Create 2 tasks: "Task B1", "Task B2"
   ✓ Only B1 and B2 visible

6. Sign out → sign in as user_a@test.com
   ✓ See only Task A1, A2, A3

7. Toggle A1 complete → click "Active" filter → A1 disappears
   Click "Completed" → A1 appears with strikethrough
   Click "All" → all 3 visible

8. Direct /tasks access without login:
   Sign out → navigate to http://localhost:3000/tasks
   ✓ Redirected to /login

9. API cross-user attempt (with curl or Postman):
   DELETE http://localhost:8000/api/{user_b_id}/tasks/{user_a_task_id}
   Authorization: Bearer <user_b_jwt>
   ✓ Returns 404 (prevents ownership leakage — not 403)
```

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
npx vercel
```

**Vercel environment variables:**

| Variable | Value |
|---|---|
| `BETTER_AUTH_SECRET` | Same secret as backend — must match exactly |
| `BETTER_AUTH_URL` | Your Vercel URL: `https://your-app.vercel.app` |
| `DATABASE_URL` | Neon `postgresql://` URL (pg driver — no asyncpg prefix) |
| `NEXT_PUBLIC_API_BASE_URL` | Your backend URL: `https://your-api.onrender.com` |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Same as `BETTER_AUTH_URL` |

Build command: `npm run build` | Output: `.next` | Install: `npm ci`

### Backend → Render / Railway / Fly.io

**Environment variables:**

| Variable | Value |
|---|---|
| `BETTER_AUTH_SECRET` | Same secret as frontend — must match exactly |
| `DATABASE_URL` | Neon `postgresql+asyncpg://` URL |
| `BACKEND_CORS_ORIGIN` | Your Vercel URL: `https://your-app.vercel.app` |
| `GROK_API_KEY` | Your xAI API key from [console.x.ai](https://console.x.ai) |
| `GROK_MODEL` | `grok-3-mini` (default) or `grok-3` for higher capability |
| `MAX_CONTEXT_MESSAGES` | `20` (default) — messages loaded per chat request |

**Start command:**

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Pre-deploy / release command:**

```bash
alembic upgrade head
```

> **Critical**: `BETTER_AUTH_SECRET` must be **byte-for-byte identical** in both services. The JWT is signed by Better Auth (Node.js) and verified by python-jose (Python) using this shared secret with HS256.
>
> **Security**: `GROK_API_KEY` belongs only in the backend service's environment. It must never appear in `NEXT_PUBLIC_*` variables or frontend environment. The AI chatbot proxy in Next.js forwards the user's JWT to FastAPI — the Grok key never touches the browser.

---

## Project Structure

```
/
├── frontend/                         # Next.js 15 App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/               # Public: /login, /signup
│   │   │   ├── (dashboard)/          # Protected: /tasks, /chat
│   │   │   │   ├── tasks/page.tsx    # Task CRUD dashboard
│   │   │   │   ├── chat/page.tsx     # AI chatbot page ← Phase III
│   │   │   │   ├── layout.tsx        # Nav bar (Tasks + AI Chat links)
│   │   │   │   └── NavLink.tsx       # Active-state nav link ← Phase III
│   │   │   ├── api/
│   │   │   │   ├── auth/[...all]/    # Better Auth handler
│   │   │   │   └── chat/route.ts     # SSE proxy → FastAPI ← Phase III
│   │   ├── components/
│   │   │   ├── tasks/                # TaskCard, TaskList, TaskForm, TaskFilter, DeleteConfirm
│   │   │   ├── chat/                 # ← Phase III
│   │   │   │   ├── ChatWindow.tsx    # useChat root + clear button
│   │   │   │   ├── MessageList.tsx   # Auto-scroll + thinking indicator
│   │   │   │   ├── MessageBubble.tsx # User/assistant message bubbles
│   │   │   │   ├── ToolCallBubble.tsx # 🔧 tool call indicator
│   │   │   │   └── ChatInput.tsx     # Textarea + send button
│   │   │   └── ui/                   # Button, Input/Textarea
│   │   ├── hooks/useTasks.ts         # All task data + mutations
│   │   ├── lib/
│   │   │   ├── auth.ts               # Better Auth server instance
│   │   │   ├── auth-client.ts        # Better Auth React client
│   │   │   └── api-client.ts         # HTTP client (JWT Bearer + 401 handler)
│   │   ├── middleware.ts             # Edge route protection (/tasks + /chat)
│   │   └── types/task.ts             # Shared TypeScript types
│   └── Dockerfile
│
├── backend/                          # FastAPI + SQLModel
│   ├── app/
│   │   ├── main.py                   # FastAPI factory + CORS + /health + routers
│   │   ├── config.py                 # Settings (GROK_API_KEY, GROK_MODEL, MAX_CONTEXT_MESSAGES)
│   │   ├── database.py               # async_engine + AsyncSessionLocal
│   │   ├── models/
│   │   │   ├── user.py, task.py      # Phase II tables
│   │   │   ├── conversation.py       # 1 per user ← Phase III
│   │   │   └── message.py            # Chat history ← Phase III
│   │   ├── schemas/
│   │   │   ├── task.py               # Task request/response shapes
│   │   │   └── chat.py               # ChatRequest, MessageResponse, HistoryResponse ← Phase III
│   │   ├── mcp/
│   │   │   └── task_tools.py         # make_task_tools() — 6 in-process tool closures ← Phase III
│   │   ├── api/
│   │   │   ├── deps.py               # get_current_user_id() JWT dep
│   │   │   └── routes/
│   │   │       ├── tasks.py          # 6 task REST endpoints
│   │   │       └── chat.py           # POST /chat + GET/DELETE /history ← Phase III
│   │   └── services/
│   │       ├── task_service.py       # Task business logic
│   │       └── chat_service.py       # Agent loop + Grok streaming ← Phase III
│   ├── migrations/
│   │   └── versions/
│   │       ├── 001_create_user_task_tables.py
│   │       └── 002_create_conversation_message_tables.py  ← Phase III
│   └── Dockerfile
│
├── specs/                            # Spec-Driven Development artifacts
│   ├── 001-todo-web-app/             # Phase II spec, plan, tasks
│   ├── 003-ai-todo-chatbot/          # Phase III spec, plan, tasks ← Phase III
│   ├── 001-auth-jwt/
│   ├── 001-tasks-crud/
│   └── 001-tasks-api/
├── history/prompts/                  # Prompt History Records (PHRs)
├── docker-compose.yml
├── .env.example                      # Template (committed)
└── .env                              # Values (git-ignored — NEVER commit)
```

---

## Specification Artifacts

### Phase II (todo web app)

| Artifact | Path |
|---|---|
| Phase II spec | `specs/001-todo-web-app/spec.md` |
| Implementation plan | `specs/001-todo-web-app/plan.md` |
| Task list (72 tasks) | `specs/001-todo-web-app/tasks.md` |
| OpenAPI contract | `specs/001-todo-web-app/contracts/openapi.yaml` |
| Data model | `specs/001-todo-web-app/data-model.md` |
| Local quickstart | `specs/001-todo-web-app/quickstart.md` |
| Auth spec | `specs/001-auth-jwt/spec.md` |
| Tasks CRUD spec | `specs/001-tasks-crud/spec.md` |
| REST API spec | `specs/001-tasks-api/spec.md` |
| Prompt history | `history/prompts/001-todo-web-app/` |

### Phase III (AI chatbot)

| Artifact | Path |
|---|---|
| Phase III spec | `specs/003-ai-todo-chatbot/spec.md` |
| Architecture plan | `specs/003-ai-todo-chatbot/plan.md` |
| Task list (42 tasks) | `specs/003-ai-todo-chatbot/tasks.md` |
| Prompt history | `history/prompts/003-ai-todo-chatbot/` |
