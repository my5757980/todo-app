---
id: "0001"
title: Tasks API Spec
stage: spec
date: 2026-03-26
surface: agent
model: claude-sonnet-4-6
feature: 001-tasks-api
branch: 001-tasks-api
user: ASFAR
command: inline feature description
labels: ["spec","api","rest","tasks","jwt","phase-2","crud","authorization"]
links:
  spec: specs/001-tasks-api/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-tasks-api/spec.md
  - specs/001-tasks-api/checklists/requirements.md
  - history/prompts/001-tasks-api/0001-tasks-api-spec.spec.prompt.md
tests:
  - none
---

## Prompt

specs/api/rest-endpoints.md

# REST API Endpoints (Phase II)

Base: /api/{user_id}/tasks
All endpoints require JWT.

- GET    /api/{user_id}/tasks          → List tasks (with ?status=pending)
- POST   /api/{user_id}/tasks          → Create task
- GET    /api/{user_id}/tasks/{id}     → Get single task
- PUT    /api/{user_id}/tasks/{id}     → Update task
- DELETE /api/{user_id}/tasks/{id}     → Delete task
- PATCH  /api/{user_id}/tasks/{id}/complete → Toggle complete

## Response snapshot

Created feature branch `001-tasks-api` and wrote a complete specification for the Task REST API Contract. The spec defines 6 prioritized user stories (list, create, get, update, delete, toggle), 18 functional requirements grouped by endpoint, 3 key entities (Task, Session Credential, Status Filter), 7 measurable success criteria, and 6 edge cases. HTTP methods and URL paths are kept out of the spec body. The {user_id} URL path segment is flagged as an architectural decision with an ADR suggestion. All checklist items pass.

## Outcome

- ✅ Impact: Full API contract spec covering all 6 endpoints with authentication enforcement, ownership validation, input validation, and the {user_id}-vs-JWT identity design question surfaced as an ADR
- 🧪 Tests: No tests run (spec stage)
- 📁 Files: specs/001-tasks-api/spec.md, specs/001-tasks-api/checklists/requirements.md
- 🔁 Next prompts: /sp.adr user-id-in-url-vs-jwt-only (recommended before planning); /sp.plan on 001-tasks-api
- 🧠 Reflection: The {user_id} in the URL path creates a double-identity problem — the spec captures the validation requirement (FR-018) but the architectural decision of whether to keep or remove it is flagged for the user to resolve via ADR before planning

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): requirements checklist — all PASS
- Prompt variant (if applicable): inline feature description (raw API table format)
- Next experiment (smallest change to try): resolve ADR on {user_id} in URL, then run /sp.plan
