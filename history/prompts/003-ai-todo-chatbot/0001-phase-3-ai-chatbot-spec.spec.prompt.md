---
id: "0001"
title: phase-3-ai-chatbot-spec
stage: spec
date: 2026-03-26
surface: agent
model: claude-sonnet-4-6
feature: 003-ai-todo-chatbot
branch: 003-ai-todo-chatbot
user: ASFAR
command: /sp.specify
labels: ["phase-3","ai","chatbot","openai-agents","mcp","vercel-ai-sdk","spec"]
links:
  spec: specs/003-ai-todo-chatbot/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/003-ai-todo-chatbot/spec.md
tests:
  - 11 success criteria in spec.md § Success Criteria
---

## Prompt

[overview.md content]:
Phase III - AI-Powered Todo Chatbot. Add conversational AI chatbot to existing Phase II web app. Natural language CRUD for todos. Frontend: OpenAI ChatKit. Backend: FastAPI + OpenAI Agents SDK. MCP Server: Official MCP SDK (embedded). Database: Neon + new conversations/messages tables. Auth: Better Auth JWT same as Phase II. Chat stateless, state persists in DB.

[Clarification answers]:
1. "OpenAI ChatKit" = Vercel AI SDK (ai package) + custom shadcn-style chat UI components
2. MCP Server = Embedded inside existing FastAPI (Option A — no new container)
3. Chat UX = New /chat protected route under (dashboard) group, nav between /tasks and /chat

## Response snapshot

Created `specs/003-ai-todo-chatbot/spec.md` with:

**8 User Stories**:
- US1 (P1): Open chat interface — loads history or empty state
- US2 (P1): Create task via NL — "Add buy groceries" → task created
- US3 (P1): View tasks via NL — "What are my todos?" → listed
- US4 (P2): Toggle complete via NL — "Mark X as done"
- US5 (P2): Delete task via NL — with confirmation handling
- US6 (P2): Update task via NL — title/description changes
- US7 (P3): Filter/summarize via NL — "Show pending tasks", "How many?"
- US8 (P3): Clear chat history — button or "/clear" command

**8 Functional Requirements** (streaming, tool visibility, JWT, stateless agent, user-scoped tools, 1 conversation/user, 20-message context window, error handling)

**Data Model**: 2 new tables — `conversation` (unique per user) + `message` (role, content, tool_name)

**6 MCP Tool Contracts**: list_tasks, create_task, get_task, update_task, delete_task, toggle_task_complete — all thin wrappers over existing task_service.py

**3 API Contracts**: POST /api/{user_id}/chat (streaming SSE), GET /api/{user_id}/chat/history, DELETE /api/{user_id}/chat/history (204)

**Frontend structure**: chat/page.tsx + ChatWindow, MessageList, MessageBubble, ToolCallBubble, ChatInput

**Backend structure**: models/, schemas/chat.py, mcp/task_tools.py, services/chat_service.py, api/routes/chat.py + Alembic migration 002

**Security**: OPENAI_API_KEY server-side only, user_id always from JWT, tools scoped to authenticated user

## Outcome

- ✅ Impact: Full Phase III spec created. 8 user stories, 8 FRs, 11 success criteria, complete data model, MCP tool contracts, API contracts, frontend and backend structure.
- 🧪 Tests: 11 manual acceptance tests in § Success Criteria
- 📁 Files: 1 spec file created
- 🔁 Next prompts: /sp.plan — generate implementation plan, data model detail, ADR decisions (agent loop design, MCP embedding strategy, Vercel AI SDK streaming protocol)
- 🧠 Reflection: Clarifying "OpenAI ChatKit" was critical — avoided building wrong streaming protocol. Embedding MCP in FastAPI (not separate container) keeps docker-compose simple. One conversation per user simplifies history management for Phase III.

## Evaluation notes (flywheel)

- Failure modes observed: "OpenAI ChatKit" was ambiguous — required clarification before spec could be written
- Graders run and results (PASS/FAIL): Not applicable (spec stage)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Run /sp.plan to generate architecture decisions, particularly around Vercel AI SDK ↔ FastAPI streaming protocol compatibility
