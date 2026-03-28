---
id: "0002"
title: Phase 2 Web App Plan
stage: plan
date: 2026-03-26
surface: agent
model: claude-sonnet-4-6
feature: 001-todo-web-app
branch: 001-todo-web-app
user: ASFAR
command: /sp.plan
labels: ["plan","phase-2","nextjs","fastapi","better-auth","neon","sqlmodel","monorepo","jwt"]
links:
  spec: specs/001-todo-web-app/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-todo-web-app/plan.md
  - specs/001-todo-web-app/research.md
  - specs/001-todo-web-app/data-model.md
  - specs/001-todo-web-app/quickstart.md
  - specs/001-todo-web-app/contracts/openapi.yaml
  - history/prompts/001-todo-web-app/0002-phase-2-web-app-plan.plan.prompt.md
tests:
  - none
---

## Prompt

/sp.plan

Phase II High-Level Plan (Spec-Driven Development)

Goal: Phase I console app ko modern multi-user full-stack web application mein convert karna hai using Next.js + FastAPI + Neon DB + Better Auth (JWT).

### 1. Project Setup & Monorepo Structure
- Create full monorepo structure as per Spec-Kit Plus (PDF pages 9-16)
- Add .spec-kit/config.yaml (phase2-web)
- Create root CLAUDE.md, frontend/CLAUDE.md, backend/CLAUDE.md
- Add docker-compose.yml for local development

### 2. Database Layer
- Neon Serverless PostgreSQL connection
- SQLModel models (Task + User if needed)
- Database migration/setup script
- Task table with user_id foreign key for isolation

### 3. Backend (FastAPI)
- FastAPI application with proper project structure
- JWT middleware (verify BETTER_AUTH_SECRET)
- Extract user_id from JWT token in every request
- All 6 REST endpoints (GET/POST/PUT/DELETE/PATCH) with user_id filtering
- Proper error handling (401 Unauthorized, 404, etc.)
- Pydantic request/response models

### 4. Frontend (Next.js 16+ App Router)
- Better Auth setup (signup, signin, session management)
- JWT token storage and automatic attachment to every API call
- Responsive UI with Tailwind CSS
- Task list page (with status indicators)
- Add new task form
- Edit task modal/form
- Delete confirmation
- Mark complete/incomplete toggle
- Protected routes (only logged-in users)

### 5. Integration & Security
- Frontend ↔ Backend communication via API client with JWT header
- User isolation enforced on every operation
- Shared BETTER_AUTH_SECRET between frontend and backend
- Environment variables management (.env.example)

### 6. Development & Deployment
- docker-compose for local run (frontend + backend + db)
- README.md with complete setup instructions
- Vercel deployment ready for frontend
- Backend can run on Render/Fly.io/ Railway etc.

### Success Criteria
- User can signup/login
- Every user sees ONLY their own tasks
- All 5 basic features work perfectly via web UI
- No cross-user data leakage
- Clean, maintainable code following CLAUDE.md guidelines

Next step after this plan: /sp.tasks → /sp.implement
All implementation must be 100% via Claude Code. No manual coding.

## Response snapshot

Generated complete Phase 0 + Phase 1 planning artifacts for 001-todo-web-app. Produced: research.md (8 architectural decisions resolved), data-model.md (User + Task entities, DDL, JWT payload), contracts/openapi.yaml (full OpenAPI 3.1 spec for all 6 endpoints), quickstart.md (Docker Compose + Neon local setup), and plan.md (technical context, constitution check, 16-step implementation sequence). Two constitution exemptions documented: direct HTTP (pre-Kafka Phase II exemption) and deployment-ready config (deferred to Phase V). Agent context updated via update-agent-context.sh.

## Outcome

- ✅ Impact: Full Phase 0+1 plan covering monorepo structure, auth flow, DB schema, API contract, and 16-step implementation sequence for /sp.tasks
- 🧪 Tests: No tests run (plan stage)
- 📁 Files: plan.md, research.md, data-model.md, quickstart.md, contracts/openapi.yaml
- 🔁 Next prompts: /sp.tasks on 001-todo-web-app to generate dependency-ordered implementation tasks
- 🧠 Reflection: Constitution check surfaced 2 phase-constrained exemptions (direct HTTP, deployment config). The {user_id} URL pattern is kept per spec but flagged as an ADR candidate. BETTER_AUTH_SECRET shared-secret pattern is the core integration seam between Next.js and FastAPI.

## Evaluation notes (flywheel)

- Failure modes observed: setup-plan.sh defaulted to wrong branch (001-tasks-api); manually switched to 001-todo-web-app before proceeding
- Graders run and results (PASS/FAIL): constitution check — 2 CONDITIONAL (documented exemptions), 8 PASS
- Prompt variant (if applicable): /sp.plan with inline full plan input
- Next experiment (smallest change to try): run /sp.tasks on 001-todo-web-app
