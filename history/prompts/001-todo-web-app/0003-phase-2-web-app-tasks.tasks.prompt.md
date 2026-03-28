---
id: "0003"
title: Phase 2 Web App Tasks
stage: tasks
date: 2026-03-26
surface: agent
model: claude-sonnet-4-6
feature: 001-todo-web-app
branch: 001-todo-web-app
user: ASFAR
command: /sp.tasks
labels: ["tasks","phase-2","nextjs","fastapi","better-auth","neon","sqlmodel","crud","jwt","tailwind"]
links:
  spec: specs/001-todo-web-app/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-todo-web-app/tasks.md
  - history/prompts/001-todo-web-app/0003-phase-2-web-app-tasks.tasks.prompt.md
tests:
  - none
---

## Prompt

/sp.tasks

Detailed Tasks for Phase II - Full-Stack Web Application (Spec-Driven)

Task 1: Monorepo Setup & Spec-Kit Configuration
- Create complete folder structure as per Spec-Kit Plus
- Add .spec-kit/config.yaml with phase2-web
- Create root CLAUDE.md, frontend/CLAUDE.md, backend/CLAUDE.md
- Add docker-compose.yml for local development

Task 2: Database Layer (Neon + SQLModel)
- Setup Neon PostgreSQL connection using DATABASE_URL
- Create SQLModel Task model with user_id (for isolation)
- Add migration/initialization script
- Ensure every task is linked to authenticated user_id

Task 3: Backend - FastAPI + JWT Security
- Create FastAPI app with proper structure (main.py, models.py, routes/, db.py)
- Implement JWT middleware (verify BETTER_AUTH_SECRET)
- Extract user_id from token in every request
- Implement all 6 REST endpoints from @specs/api/rest-endpoints.md
- Add proper Pydantic models and error handling (401, 404, 422)
- Filter ALL operations by authenticated user_id

Task 4: Frontend - Next.js + Better Auth
- Setup Next.js 16+ App Router with TypeScript + Tailwind
- Integrate Better Auth (signup, signin, session)
- Configure JWT token generation and storage
- Create API client that automatically adds Authorization: Bearer <token>

Task 5: Frontend UI Components & Pages
- Login/Signup pages
- Protected Task Dashboard
- Task list with status indicators
- Add new task form
- Edit task form/modal
- Delete button with confirmation
- Complete/Incomplete toggle
- Responsive design with Tailwind

Task 6: Full Integration & User Isolation
- Connect frontend API calls to backend
- Ensure every API call sends JWT
- Test that users can only see/modify their own tasks
- Handle 401 Unauthorized gracefully

Task 7: Documentation & Local Development
- Update README.md with full setup instructions
- Add .env.example
- Make sure docker-compose works (frontend + backend + db)
- Add deployment notes for Vercel (frontend)

All tasks must be implemented 100% by Claude Code.
No manual coding allowed.
Follow all CLAUDE.md guidelines and specs strictly.

## Response snapshot

Generated 72-task, 9-phase tasks.md for 001-todo-web-app, organized by the 5 spec user stories (P1→P5) plus Setup, Foundational, Edit CRUD, and Polish phases. Each task has a unique ID (T001–T072), [P] parallel marker where applicable, [US#] story label, and exact file path. 28 tasks are parallelizable. User input (Tasks 1–7) mapped to SDD phases aligned with spec user stories.

## Outcome

- ✅ Impact: 72 immediately-executable tasks covering all 5 user stories + full 6-endpoint API + documentation; ready for /sp.implement
- 🧪 Tests: Not generated (not requested in spec); 8 manual smoke-test checkpoints included per phase
- 📁 Files: specs/001-todo-web-app/tasks.md
- 🔁 Next prompts: /sp.implement to execute tasks; or /sp.analyze for cross-artifact consistency check first
- 🧠 Reflection: User's 7 tech-centric tasks mapped cleanly to SDD user-story phases; edit-task (Phase 8) added to complete all 6 API endpoints from openapi.yaml even though not an explicit user story in spec — necessary for full CRUD contract

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): format check — all 72 tasks follow [checkbox][ID][P?][US?][description with path] — PASS
- Prompt variant (if applicable): /sp.tasks with inline 7-task breakdown
- Next experiment (smallest change to try): run /sp.implement starting from T001
