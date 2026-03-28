# Quickstart: Todo App Phase II — Local Development

**Branch**: `001-todo-web-app` | **Date**: 2026-03-26

## Prerequisites

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| Node.js | 20 LTS | Next.js frontend |
| Python | 3.12 | FastAPI backend |
| Docker + Docker Compose | Latest stable | Container orchestration |
| Git | 2.x | Version control |
| Neon account | — | Serverless PostgreSQL |

---

## Step 1: Clone and Structure

```bash
git clone <repo-url>
cd <repo-root>
```

Repository layout after Phase II scaffolding:

```
/
├── frontend/           # Next.js 16+ App Router
├── backend/            # FastAPI + SQLModel
├── specs/              # SDD artifacts (this directory)
├── docker-compose.yml  # Local orchestration
├── .env.example        # Template for environment variables
└── CLAUDE.md           # Project constitution (root)
```

---

## Step 2: Environment Variables

Copy the template and fill in values:

```bash
cp .env.example .env
```

Required values in `.env`:

```env
# Better Auth — shared between frontend and backend
BETTER_AUTH_SECRET=<generate: openssl rand -hex 32>
BETTER_AUTH_URL=http://localhost:3000

# Neon database connection string
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<neon-host>/<dbname>?sslmode=require

# Backend
BACKEND_PORT=8000
BACKEND_CORS_ORIGIN=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

> **Never commit `.env` to the repository.** Only `.env.example` is tracked.

---

## Step 3: Database Setup (Neon)

1. Create a Neon project at [neon.tech](https://neon.tech)
2. Create a `dev` branch from the main branch
3. Copy the connection string → `DATABASE_URL` in `.env`
4. Run migrations after backend starts (see Step 5)

---

## Step 4: Start Services via Docker Compose

```bash
docker-compose up --build
```

This starts:
- `frontend` service on `http://localhost:3000`
- `backend` service on `http://localhost:8000`

Both services share the `.env` file mounted at container root.

---

## Step 5: Run Database Migrations

Once the backend container is running:

```bash
docker-compose exec backend python -m alembic upgrade head
```

This creates the `user` and `task` tables in the Neon dev branch.

---

## Step 6: Verify the Stack

```bash
# Backend health check
curl http://localhost:8000/health

# Backend API docs (FastAPI auto-generated)
open http://localhost:8000/docs

# Frontend
open http://localhost:3000
```

---

## Step 7: Local Development Workflow

```bash
# Frontend hot-reload (if running outside Docker)
cd frontend && npm run dev

# Backend auto-reload (if running outside Docker)
cd backend && uvicorn app.main:app --reload --port 8000

# Run backend tests
cd backend && pytest

# Run frontend type-check
cd frontend && npx tsc --noEmit
```

---

## Neon Branch Workflow

For feature branches, create a matching Neon DB branch:

```bash
# Neon CLI (optional)
neon branch create --name feat/my-feature
# Update DATABASE_URL to point to the new branch
```

Merge the Neon branch when the feature PR is merged.

---

## Docker Compose Reference

```yaml
# docker-compose.yml structure (generated during implementation)
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    env_file: .env
    depends_on: [backend]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    env_file: .env
```

> No local database container — all data flows through Neon cloud.

---

## Deployment Readiness (Phase II — NOT deployed yet)

The codebase is structured for deployment but cloud deployment occurs in Phase V:

| Service | Target Platform | Config needed |
|---------|----------------|---------------|
| Frontend | Vercel | `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_API_BASE_URL` |
| Backend | Render / Railway / Fly.io | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BACKEND_CORS_ORIGIN` |

> Per constitution Phase II: deployment-ready code only. Actual cloud deployment = Phase V.
