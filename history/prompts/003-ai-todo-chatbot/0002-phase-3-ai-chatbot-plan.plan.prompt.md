---
id: "0002"
title: phase-3-ai-chatbot-plan
stage: plan
date: 2026-03-26
surface: agent
model: claude-sonnet-4-6
feature: 003-ai-todo-chatbot
branch: 001-todo-web-app
user: ASFAR
command: continue (session resume)
labels: ["phase-3","ai","chatbot","architecture","plan","openai-agents","mcp","vercel-ai-sdk","sse","streaming"]
links:
  spec: specs/003-ai-todo-chatbot/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/003-ai-todo-chatbot/plan.md
tests:
  - 9 Definition of Done checkpoints in plan.md § 11
---

## Prompt

(session resumed — continuing from Phase III spec completion)
Generate the architectural plan for Phase III: AI-Powered Todo Chatbot.

## Response snapshot

Created `specs/003-ai-todo-chatbot/plan.md` with:

**12 Decision sections covering:**

1. **Scope** — `/chat` route, 6 CRUD tools via NL, SSE streaming, MCP embedded, history persistence

2. **Key Architecture Decisions:**
   - Decision 1: AI runs in FastAPI (OpenAI Agents SDK), not Next.js
   - Decision 2: FastAPI emits Vercel AI SDK v3 data stream protocol (SSE format)
   - Decision 3: MCP tools are in-process Python functions via `@function_tool`, NOT a separate MCP server transport — `make_task_tools(session, user_id)` factory closes over auth context
   - Decision 4: Stateless agent per request; history loaded from DB (last 20 messages)
   - Decision 5: One conversation per user (lazily created); clear deletes messages not conversation row

3. **Data Model** — `conversation` (UNIQUE user_id) + `message` (role, content, tool_name, created_at) tables; Alembic migration 002

4. **Backend files** — conversation.py, message.py, schemas/chat.py, mcp/task_tools.py, services/chat_service.py, api/routes/chat.py; updates to main.py, config.py, pyproject.toml

5. **Frontend files** — Next.js proxy at /api/chat/route.ts (handles Bearer token server-side), chat/page.tsx, ChatWindow/MessageList/MessageBubble/ToolCallBubble/ChatInput components; useChat from Vercel AI SDK

6. **Security** — OPENAI_API_KEY backend-only, user_id always from JWT (never user message), proxy prevents token exposure

7. **6-phase implementation plan** (data model → MCP tools → routes → proxy+UI → message UI → polish)
