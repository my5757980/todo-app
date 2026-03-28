# Tasks: Todo App Phase III — AI-Powered Todo Chatbot

**Input**: Design documents from `/specs/003-ai-todo-chatbot/`
**Branch**: `003-ai-todo-chatbot` | **Date**: 2026-03-26
**Prerequisites**: plan.md ✅ | spec.md ✅ | Phase II complete (all 72 tasks ✅)

**Tests**: Smoke-test checkpoints per phase. Unit tests not requested in spec.

**Total Tasks**: 42 | **Phases**: 6 | **Parallelizable**: 12 tasks marked [P]

---

## Format: `- [ ] [ID] [P?] [Story?] Description → file/path`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[US#]**: Maps to User Story from spec.md
- All file paths relative to repository root

---

## Phase 1: Data Model + Migration + Config

**Purpose**: New DB tables and backend config changes. No business logic yet.

- [x] T001 Add `Conversation(SQLModel, table=True)` to `backend/app/models/conversation.py` — fields: `id: UUID (PK, default gen)`, `user_id: UUID (FK user.id, ON DELETE CASCADE, UNIQUE)`, `created_at: datetime (default utcnow)`, `updated_at: datetime (default utcnow)`; UNIQUE constraint on `user_id` (one conversation per user) → `backend/app/models/conversation.py`
- [x] T002 [P] Add `Message(SQLModel, table=True)` to `backend/app/models/message.py` — fields: `id: UUID (PK, default gen)`, `conversation_id: UUID (FK conversation.id, ON DELETE CASCADE)`, `role: str (max 20)`, `content: str (TEXT, not null)`, `tool_name: Optional[str] (max 100, nullable)`, `created_at: datetime (default utcnow)`; composite index on `(conversation_id, created_at)` → `backend/app/models/message.py`
- [x] T003 Update `backend/app/config.py` — add `GROK_API_KEY: str`, `GROK_MODEL: str = "grok-3-mini"`, and `MAX_CONTEXT_MESSAGES: int = 20` fields to `Settings`; these are read from `.env` → `backend/app/config.py`
- [x] T004 [P] Update `backend/pyproject.toml` — add `openai>=1.56.0` to `dependencies` (used in Grok-compatible mode) → `backend/pyproject.toml`
- [x] T005 Generate Alembic migration `002` — manually written migration creates both tables with correct columns, FKs, unique constraint on conversation.user_id, and composite index on message → `backend/migrations/versions/002_create_conversation_message_tables.py`
- [x] T006 [P] Update `.env.example` at repo root — add `GROK_API_KEY`, `GROK_MODEL`, and `MAX_CONTEXT_MESSAGES` with inline comments → `.env.example`

**Checkpoint ✓**: `alembic upgrade head` runs clean against Neon dev branch. Both tables exist. `conversation` has UNIQUE on `user_id`. `message` has composite index on `(conversation_id, created_at)`.

---

## Phase 2: Backend MCP Tools + Chat Service + Schemas

**Purpose**: The AI agent's tool layer and orchestration service. No HTTP endpoints yet.

### Schemas

- [x] T007 Create `backend/app/schemas/chat.py` — `ChatRequest`, `MessageResponse`, `HistoryResponse` Pydantic models → `backend/app/schemas/chat.py`

### MCP Tools

- [x] T008 Create `backend/app/mcp/__init__.py` (empty) → `backend/app/mcp/__init__.py`
- [x] T009 Create `backend/app/mcp/task_tools.py` — `make_task_tools(session, user_id)` factory returns `(TOOL_SCHEMAS, executors)` with 6 OpenAI-compatible tool schemas + async executor closures; try/except in each executor (FR-008) → `backend/app/mcp/task_tools.py`

### Chat Service

- [x] T010 Create `backend/app/services/chat_service.py` — 5 async functions: `get_or_create_conversation`, `load_history`, `save_messages`, `clear_history`, `build_agent_messages` → `backend/app/services/chat_service.py`

- [x] T011 Implement `stream_chat` async generator in `chat_service.py` — non-streaming Grok tool loop (emits `9:` + `a:` events), then streaming final response (`0:` events), finish marker (`d:`), error fallback (`3:`); appends to `collected_messages` list for DB persistence → `backend/app/services/chat_service.py`

**Checkpoint ✓**: `make_task_tools` can be instantiated with a mock session and called directly. Each tool calls through to the corresponding `task_service` function. `stream_chat` yields valid SSE lines when tested with a real OpenAI key.

---

## Phase 3: Backend API Routes

**Purpose**: Expose chat endpoints under `/api/{user_id}/chat`.

- [x] T012 Create `backend/app/api/routes/chat.py` — POST / (StreamingResponse, own session in generator), GET /history (HistoryResponse), DELETE /history (204); all three guarded by `get_current_user_id` dep → `backend/app/api/routes/chat.py`
- [x] T013 Update `backend/app/main.py` — imported `chat_router`; mounted at `/api/{user_id}/chat` with `tags=["chat"]` → `backend/app/main.py`

**Checkpoint ✓**: `GET /api/{user_id}/chat/history` returns 200 with empty `messages: []` for a new user. `POST /api/{user_id}/chat` with a valid JWT + OpenAI key streams SSE lines. `DELETE /api/{user_id}/chat/history` returns 204.

---

## Phase 4: Frontend Proxy + Chat Page Foundation

**Purpose**: Next.js proxy route + base chat page + `useChat` integration.

- [x] T014 Install Vercel AI SDK in `frontend/` — added `"ai": "^4.3.0"` to dependencies → `frontend/package.json`
- [x] T015 Create Next.js proxy API route at `frontend/src/app/api/chat/route.ts` — validates session server-side; extracts last user message from useChat's messages array; forwards JWT (from client Authorization header) to FastAPI; pipes SSE stream back with `X-Vercel-AI-Data-Stream: v1` → `frontend/src/app/api/chat/route.ts`
- [x] T016 Create `frontend/src/components/chat/ChatInput.tsx` — textarea (Enter=submit, Shift+Enter=newline, max-h 4 lines), spinner on loading, send icon button → `frontend/src/components/chat/ChatInput.tsx`
- [x] T017 Create `frontend/src/app/(dashboard)/chat/page.tsx` — loads JWT + history on mount, passes initialMessages to ChatWindow → `frontend/src/app/(dashboard)/chat/page.tsx`

**Checkpoint ✓**: Navigate to `/chat` → page loads. `GET /chat/history` called on mount (empty array for new user). Chat page renders without TypeScript errors.

---

## Phase 5: Frontend Chat Message UI

**Purpose**: Full chat interface — message bubbles, tool indicators, history display, clear action, nav links.

- [x] T018 [P] Create `frontend/src/components/chat/MessageBubble.tsx` — user=right/blue, assistant=left/gray; renders ToolCallBubble per toolInvocation; newline-safe content → `frontend/src/components/chat/MessageBubble.tsx`
- [x] T019 [P] Create `frontend/src/components/chat/ToolCallBubble.tsx` — animated ping dot + 🔧 label + human-readable tool name map → `frontend/src/components/chat/ToolCallBubble.tsx`
- [x] T020 Create `frontend/src/components/chat/MessageList.tsx` — auto-scroll on messages change, thinking indicator when isLoading, empty state → `frontend/src/components/chat/MessageList.tsx`
- [x] T021 Create `frontend/src/components/chat/ChatWindow.tsx` — useChat with JWT headers + userId body; clear chat (apiDelete + setMessages([])); error banners → `frontend/src/components/chat/ChatWindow.tsx`
- [x] T022 [P] Update `frontend/src/app/(dashboard)/layout.tsx` — added NavLink client component for /tasks ↔ /chat with active-state styling; middleware updated to protect /chat → `frontend/src/app/(dashboard)/layout.tsx`
- [x] T023 [US8] Clear chat wired: apiDelete → setMessages([]) → empty state shown → `frontend/src/components/chat/ChatWindow.tsx`

**Checkpoint ✓**: User Story 1 verified. `/chat` loads with empty state or prior history. Messages render with correct bubbles. Tool call indicator appears. Clear chat button empties DB and UI. Nav shows Tasks ↔ AI Chat links.

---

## Phase 6: Polish + Integration + Docs

**Purpose**: Error handling, loading states, user isolation, README update, smoke test.

- [x] T024 [P] Error state in chat page — `pageState === "error"` renders red banner with reload button; ChatWindow shows `error` banner from useChat when stream fails → `frontend/src/app/(dashboard)/chat/page.tsx`
- [x] T025 [P] "AI is thinking…" indicator in `MessageList.tsx` — `showThinking = isLoading && lastMsg?.role === "user"` renders `<ToolCallBubble toolName="Thinking…" />` → `frontend/src/components/chat/MessageList.tsx`
- [x] T026 [P] 503 / Grok error handling in `chat_service.py` — Grok API exceptions caught in both tool loop and streaming phase; emits `3:{error}` SSE line; `generate()` in chat.py wraps entire flow in try/except with `3:` fallback → `backend/app/api/routes/chat.py`, `backend/app/services/chat_service.py`
- [x] T027 User isolation verified by design — `get_current_user_id` dep enforces path `user_id` == JWT `sub`; `make_task_tools` binds `user_id` at construction; 403 returned on cross-user chat attempt
- [x] T028 [P] Update `README.md` — add Phase III section: new env var (`OPENAI_API_KEY`), npm install step (`npm install` picks up `ai` package), migration 002 command, chat smoke test (navigate to `/chat`, type "Add buy milk", verify task created, navigate to `/tasks` to confirm it appears) → `README.md`
- [x] T029 End-to-end smoke test — follow this sequence manually:
  1. Register new user → land on `/tasks`
  2. Navigate to `/chat` → empty state shown
  3. Type "Add buy groceries to my list" → task created, AI confirms
  4. Type "What are my todos?" → AI lists "Buy groceries"
  5. Type "Mark buy groceries as done" → AI confirms toggle
  6. Navigate to `/tasks` → "Buy groceries" shows strikethrough ✓
  7. Return to `/chat` → history still visible
  8. Click "Clear chat" → history cleared, empty state shown
  9. Refresh `/chat` → still empty (history cleared from DB)

**Checkpoint ✓**: All 8 User Stories pass independent tests. User isolation verified (403 on cross-user chat). OpenAI unavailable → 503 returned. Clear chat → empty state. History persists across page refresh.

---

## Dependencies & Execution Order

```
Phase 1: Data model     → No dependencies. Start immediately.
Phase 2: Tools/Service  → Requires Phase 1 (models must exist for DB ops).
Phase 3: Routes         → Requires Phase 2 (service must exist to call).
Phase 4: Frontend proxy → Requires Phase 3 (endpoint must exist to proxy to).
Phase 5: Chat UI        → Requires Phase 4 (proxy route must work for useChat).
Phase 6: Polish         → Requires Phases 4+5.
```

### Within-Phase Dependencies

- **Phase 1**: T001+T002 → T005 (models before migration); T003+T004 parallel
- **Phase 2**: T007 → T009 (schemas before tools need TaskCreateRequest etc.); T008+T009 → T010+T011 (tools before service); T010 and T011 in same file (sequential)
- **Phase 3**: T012 → T013 (routes before main.py update)
- **Phase 5**: T018+T019 → T020 → T021 (bubbles before list before window)

### Parallel Opportunities per Phase

```
Phase 1:  T001 ‖ T002 ‖ T004 ‖ T006
Phase 2:  T007 ‖ T008  (then T009 depends on both)
Phase 5:  T018 ‖ T019 ‖ T022  (then T020 depends on T018+T019)
Phase 6:  T024 ‖ T025 ‖ T026 ‖ T028
```

---

## Notes

- `user_id` is ALWAYS from `get_current_user_id` JWT dep — never from chat message content (FR-003, FR-005)
- All MCP tools are thin wrappers over `task_service.py` — zero duplicate DB logic
- The Next.js proxy route is essential: it attaches the Bearer token server-side, preventing token exposure in browser network requests to FastAPI
- `gpt-4o-mini` chosen for cost efficiency; swap to `gpt-4o` in settings if higher capability needed
- `make_task_tools(session, user_id)` factory: tools are closures — `user_id` is bound at construction time, the AI cannot override it via prompt injection
- Vercel AI SDK `useChat` `initialMessages` prop accepts the history loaded from `GET /chat/history` — ensures DB-persisted history renders on mount
