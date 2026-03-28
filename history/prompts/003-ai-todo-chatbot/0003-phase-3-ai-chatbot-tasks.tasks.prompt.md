---
id: "0003"
title: phase-3-ai-chatbot-tasks
stage: tasks
date: 2026-03-26
surface: agent
model: claude-sonnet-4-6
feature: 003-ai-todo-chatbot
branch: 001-todo-web-app
user: ASFAR
command: continue (session resume)
labels: ["phase-3","ai","chatbot","tasks","breakdown","mcp","vercel-ai-sdk","streaming"]
links:
  spec: specs/003-ai-todo-chatbot/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/003-ai-todo-chatbot/tasks.md
tests:
  - Phase 1 checkpoint: migration 002 runs clean, both tables created
  - Phase 2 checkpoint: make_task_tools callable, stream_chat yields valid SSE
  - Phase 3 checkpoint: all 3 chat endpoints respond correctly
  - Phase 4 checkpoint: /chat page loads, history GET called on mount
  - Phase 5 checkpoint: US1 verified, clear chat works, nav links present
  - Phase 6 checkpoint: all 8 US pass, user isolation verified, 503 handled
---

## Prompt

(session resumed — continuing from Phase III plan completion)
Generate the task breakdown for Phase III AI chatbot.

## Response snapshot

Created `specs/003-ai-todo-chatbot/tasks.md` with **42 tasks across 6 phases**:

**Phase 1 (6 tasks)**: Data model + migration + config — conversation.py, message.py, Alembic migration 002, config updates for OPENAI_API_KEY + MAX_CONTEXT_MESSAGES, .env.example update

**Phase 2 (5 tasks)**: Backend MCP tools + chat service — schemas/chat.py, mcp/__init__.py, mcp/task_tools.py (make_task_tools factory with 6 tools as closures), chat_service.py (5 async functions + stream_chat generator in Vercel AI SDK SSE format)

**Phase 3 (2 tasks)**: Backend API routes — chat.py (POST streaming, GET history, DELETE history), main.py update to include chat router

**Phase 4 (4 tasks)**: Frontend proxy + base — npm install ai, Next.js proxy /api/chat/route.ts (Bearer token server-side, pipes SSE), ChatInput component, chat/page.tsx (useChat + initialMessages from history GET)

**Phase 5 (6 tasks)**: Frontend chat UI — MessageBubble, ToolCallBubble, MessageList (auto-scroll), ChatWindow (clear button), nav bar update with /tasks ↔ /chat links

**Phase 6 (6 tasks)**: Polish + integration — 503 error handling, "thinking" indicator, user isolation test, README update, end-to-end 9-step smoke test

**Key architectural choices in tasks:**
- make_task_tools closes over user_id at request time (injection-safe)
- Next.js proxy attaches Bearer token server-side (token never in browser for FastAPI)
- useChat initialMessages populated from GET /chat/history on mount
- Vercel AI SDK SSE format emitted by FastAPI (0: text, b: tool_start, a: tool_result, d: finish)
