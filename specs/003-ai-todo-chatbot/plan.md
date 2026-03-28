# Architecture Plan: Todo App Phase III — AI-Powered Todo Chatbot

**Feature Branch**: `003-ai-todo-chatbot`
**Created**: 2026-03-26
**Status**: Draft
**Prerequisites**: Phase II complete — all 72 tasks done, `/tasks` CRUD verified

**Input**: `specs/003-ai-todo-chatbot/spec.md`
**Output**: This plan drives `specs/003-ai-todo-chatbot/tasks.md`

---

## 1. Scope and Dependencies

### In Scope
- `/chat` protected route under the existing `(dashboard)` route group
- Conversational AI for all 6 task CRUD operations via natural language
- Persistent chat history per user (`conversation` + `message` tables in Neon)
- Streaming AI responses token-by-token (SSE) via Vercel AI SDK `useChat`
- MCP tools embedded inside the existing FastAPI process (no new container)
- Tool call visual indicator in the frontend before AI response appears
- Clear conversation history (button + `/clear` command)
- Nav bar updated with `/tasks` ↔ `/chat` links

### Out of Scope
- Multiple named conversations per user
- File/image attachments
- Voice I/O
- Rate limiting (Phase IV)
- LLM fine-tuning or RAG

### External Dependencies
- **OpenAI API** — `gpt-4o-mini` (cost-effective, tool-calling capable)
- **OpenAI Agents SDK** (`openai-agents` PyPI package) — agent loop + tool calling
- **Vercel AI SDK** (`ai` npm package) — `useChat` hook + stream consumption
- **Neon Serverless PostgreSQL** — 2 new tables (conversation, message)
- **Phase II backend** — `task_service.py` functions reused unchanged

---

## 2. Key Decisions and Rationale

### Decision 1: AI runs in FastAPI backend (not Next.js)

**Options considered:**
- A. FastAPI + OpenAI Agents SDK + MCP (spec mandate)
- B. Next.js API route + Vercel AI SDK `streamText` calling OpenAI directly

**Decision: Option A — FastAPI backend.**

**Rationale:**
- `OPENAI_API_KEY` stays server-side in a Python process, never touched by Next.js
- MCP tool definitions live next to `task_service.py` — one codebase owns all task logic
- Phase II backend already has the auth, DB, and service layer; AI logic extends it naturally
- Spec explicitly mandates OpenAI Agents SDK in FastAPI

**Trade-off**: FastAPI must emit SSE in Vercel AI SDK data stream format (handled in Decision 2).

---

### Decision 2: SSE Format — Vercel AI SDK Data Stream Protocol emitted by FastAPI

**Problem**: Vercel AI SDK's `useChat` expects a specific SSE wire format. FastAPI emits raw SSE.

**Decision: FastAPI emits the Vercel AI SDK v3 data stream protocol.**

**Wire format (emitted by FastAPI `StreamingResponse`):**
```
# Text delta:
0:"token text"\n

# Finish:
d:{"finishReason":"stop","usage":{"promptTokens":N,"completionTokens":N}}\n

# Tool call start (before tool executes):
b:{"toolCallId":"id","toolName":"list_tasks"}\n

# Tool result:
a:{"toolCallId":"id","result":{...}}\n
```

**Frontend `useChat` configuration:**
```ts
useChat({
  api: "/api/chat",   // Next.js proxy route
  body: { userId: session.user.id }
})
```

**Next.js proxy at `frontend/src/app/api/chat/route.ts`:**
1. Reads `userId` from request body
2. Gets Bearer token from `auth.api.getSession()`
3. Calls `POST {BACKEND_URL}/api/{userId}/chat` with `Authorization: Bearer <token>`
4. Pipes the SSE stream response back to the browser

This proxy keeps the Bearer token server-side (in Next.js), prevents CORS issues, and lets `useChat` work with its default fetch behavior.

---

### Decision 3: MCP Tools — In-process function wrappers (not a separate MCP server transport)

**Options considered:**
- A. Spin up a separate MCP server process (stdio or HTTP transport)
- B. Define MCP tools as Python functions in-process, passed to the Agent

**Decision: Option B — in-process tool functions.**

**Rationale:**
- No extra container, no IPC, no transport latency
- `user_id` bound at request time via closure — tools are naturally user-scoped
- Spec says "embedded inside existing FastAPI backend (no new container)"
- The `openai-agents` SDK accepts Python functions as tools via `@function_tool` decorator

**Implementation**: `backend/app/mcp/task_tools.py` exports a factory `make_task_tools(session, user_id)` that returns a list of 6 `FunctionTool` objects (from `agents` SDK), each closing over the authenticated `session` and `user_id`.

---

### Decision 4: Agent is stateless per request; history loaded from DB

**Pattern**: Each `POST /api/{user_id}/chat` call:
1. Loads last 20 messages from `message` table for this user's conversation
2. Instantiates a new `Agent` with those messages as history + 6 bound tools
3. Runs the agent with the new user message
4. Streams response back via SSE
5. Persists the new user message + assistant message (+ any tool messages) to DB after stream completes

**Why 20 messages**: Spec FR-007. Configurable via `MAX_CONTEXT_MESSAGES` env var.

---

### Decision 5: One conversation per user, created lazily

On first `POST /chat`:
- `chat_service` upserts a `Conversation` row (unique on `user_id`)
- All messages for that user are children of this one conversation

On `DELETE /chat/history`:
- Deletes all `Message` rows for the conversation (keeps the `Conversation` row)
- Next message creates new history starting from blank

---

## 3. Data Model Changes

### New table: `conversation`

```sql
CREATE TABLE conversation (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_conversation_user UNIQUE (user_id)
);
```

### New table: `message`

```sql
CREATE TABLE message (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id  UUID NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
    role             VARCHAR(20) NOT NULL,  -- 'user' | 'assistant' | 'tool_call' | 'tool_result'
    content          TEXT NOT NULL,         -- plain text or JSON string for tool messages
    tool_name        VARCHAR(100),          -- NULL unless role is tool_call or tool_result
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_message_conversation_created
    ON message (conversation_id, created_at);
```

### Alembic migration
`backend/migrations/versions/002_create_conversation_message_tables.py`
Generated with `alembic revision --autogenerate -m "create conversation and message tables"`.

---

## 4. Backend Architecture

### File additions / changes

```
backend/app/
├── models/
│   ├── conversation.py     ← NEW: Conversation(SQLModel, table=True)
│   └── message.py          ← NEW: Message(SQLModel, table=True)
├── schemas/
│   └── chat.py             ← NEW: ChatRequest, MessageResponse, HistoryResponse
├── mcp/
│   ├── __init__.py         ← NEW
│   └── task_tools.py       ← NEW: make_task_tools(session, user_id) → list[FunctionTool]
├── services/
│   └── chat_service.py     ← NEW: get_or_create_conversation, load_history,
│                                   run_agent_stream, save_messages, clear_history
└── api/routes/
    └── chat.py             ← NEW: POST /chat (SSE), GET /chat/history, DELETE /chat/history

main.py                     ← UPDATE: include chat router at /api/{user_id}/chat
pyproject.toml              ← UPDATE: add openai-agents, openai
config.py                   ← UPDATE: add OPENAI_API_KEY, MAX_CONTEXT_MESSAGES fields
.env.example                ← UPDATE: add OPENAI_API_KEY
```

### Chat route contract

```python
# POST /api/{user_id}/chat
# Body: {"message": "string"}
# Returns: StreamingResponse(text/event-stream, Vercel AI SDK format)

# GET /api/{user_id}/chat/history
# Returns: HistoryResponse(conversation_id, messages: list[MessageResponse])

# DELETE /api/{user_id}/chat/history
# Returns: 204 No Content
```

### Agent system prompt

```
You are a helpful todo assistant. You help users manage their task list.
Use the available tools to read and modify the user's tasks.
Always confirm after performing an action. Be concise and friendly.
When asked about tasks you cannot find, list the available tasks.
Never reveal internal tool call details or UUIDs to the user unless asked.
```

### Streaming implementation

```python
async def stream_agent_response(message: str, history: list, tools: list):
    """Generator that yields Vercel AI SDK formatted SSE lines."""
    async with Runner.run_streamed(agent, input=message) as stream:
        async for event in stream:
            if event.type == "text_delta":
                yield f'0:{json.dumps(event.delta)}\n'
            elif event.type == "tool_call_start":
                yield f'b:{json.dumps({"toolCallId": event.id, "toolName": event.name})}\n'
            elif event.type == "tool_result":
                yield f'a:{json.dumps({"toolCallId": event.id, "result": event.output})}\n'
        yield f'd:{json.dumps({"finishReason": "stop"})}\n'
```

---

## 5. Frontend Architecture

### File additions / changes

```
frontend/src/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts                    ← NEW: Next.js proxy → FastAPI SSE
│   └── (dashboard)/
│       ├── layout.tsx                      ← UPDATE: add /tasks ↔ /chat nav links
│       └── chat/
│           └── page.tsx                    ← NEW: Chat page (client component)
└── components/
    └── chat/
        ├── ChatWindow.tsx                  ← NEW: root — useChat hook + state
        ├── MessageList.tsx                 ← NEW: scrollable history
        ├── MessageBubble.tsx               ← NEW: user/assistant message
        ├── ToolCallBubble.tsx              ← NEW: "🔧 Checking tasks..." indicator
        └── ChatInput.tsx                   ← NEW: textarea + send (Enter=send, Shift+Enter=newline)
```

### useChat configuration

```ts
// frontend/src/app/(dashboard)/chat/page.tsx
const { messages, input, handleSubmit, isLoading } = useChat({
  api: "/api/chat",           // Next.js proxy route
  body: { userId: user.id },
  initialMessages: chatHistory,  // loaded from GET /chat/history on mount
});
```

### Next.js proxy route

```ts
// frontend/src/app/api/chat/route.ts
export async function POST(req: Request) {
  const { message, userId } = await req.json();
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const backendUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/${userId}/chat`;
  const upstream = await fetch(backendUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.token}`,
    },
    body: JSON.stringify({ message }),
  });

  // Pipe SSE stream directly to browser
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
```

---

## 6. New Environment Variables

| Variable | Where set | Description |
|---|---|---|
| `OPENAI_API_KEY` | `backend/.env` | OpenAI API key — backend only, NEVER `NEXT_PUBLIC_` |
| `MAX_CONTEXT_MESSAGES` | `backend/.env` (optional) | Messages loaded as context; default 20 |

Add to `.env.example`:
```
OPENAI_API_KEY=sk-...
MAX_CONTEXT_MESSAGES=20
```

---

## 7. Security Analysis

| Risk | Mitigation |
|---|---|
| OpenAI API key exposed to browser | `OPENAI_API_KEY` only in backend env; never in `NEXT_PUBLIC_*` |
| AI prompted to access another user's tasks | `user_id` from JWT dep — tools constructed with bound `user_id`; cannot override |
| Bearer token in browser for direct FastAPI call | Next.js proxy handles token attachment server-side |
| Prompt injection in task content | Agent instructed to use tools, not interpret task content as commands |
| Unlimited token spend | `MAX_CONTEXT_MESSAGES=20` caps per-request token usage; `gpt-4o-mini` for cost |

---

## 8. Non-Functional Requirements

| Concern | Target | Approach |
|---|---|---|
| Streaming latency | First token < 1s | `gpt-4o-mini` + streaming; no buffering |
| DB query overhead per request | < 20ms | Single indexed query for last N messages |
| Memory per request | Stateless — no agent state retained | New agent instance per request; history from DB |
| Error visibility | Tool errors shown as assistant messages | `try/except` in each tool; return error string not raise |
| Availability | FastAPI unaffected if OpenAI is down | `/health` still works; chat returns 503 with friendly message |

---

## 9. Operational Readiness

### Observability
- Log each chat request: `user_id`, message length, tool calls made, completion token count
- Log tool errors at WARNING level with tool name and error type (no stack trace in logs)
- `/health` endpoint already in place (Phase II) — no changes needed

### Deployment notes
- Backend: add `OPENAI_API_KEY` to Render/Railway/Fly.io env vars
- Frontend: no new env vars needed (Next.js proxy uses `NEXT_PUBLIC_API_BASE_URL` already set)

---

## 10. Risk Analysis

| Risk | Blast radius | Mitigation |
|---|---|---|
| OpenAI API rate limit or quota exceeded | Chat endpoint down; `/tasks` UI unaffected | Return HTTP 503 with "AI service unavailable" message |
| `openai-agents` SDK breaking change | Agent loop fails | Pin version in `pyproject.toml`; update separately |
| Vercel AI SDK wire format change | Stream format mismatch | Pin `ai` npm package version; integration test the stream |

---

## 11. Definition of Done

- [ ] `GET /api/{user_id}/chat/history` returns persisted messages
- [ ] `POST /api/{user_id}/chat` streams tokens (first token < 2s in dev)
- [ ] All 6 MCP tools verified: create, list, get, update, delete, toggle
- [ ] User A's tasks inaccessible from User B's chat session
- [ ] `DELETE /api/{user_id}/chat/history` returns 204 and clears DB
- [ ] Frontend renders streamed tokens progressively (no wait for full response)
- [ ] Tool call indicator "🔧 Checking tasks…" appears before AI response
- [ ] Alembic migration 002 runs clean on Neon dev branch
- [ ] `/tasks` CRUD page unchanged and fully functional

---

## 12. Implementation Phases (for tasks.md)

```
Phase 1: Data Model + Migration (T001–T006)
  - conversation.py, message.py SQLModel definitions
  - Alembic migration 002 (conversation + message tables)
  - Config + pyproject updates

Phase 2: Backend MCP Tools + Service (T007–T012)
  - make_task_tools() factory (6 tools, user-scoped)
  - chat_service.py (get_or_create_conversation, load_history,
    run_agent_stream, save_messages, clear_history)
  - schemas/chat.py

Phase 3: Backend API Routes (T013–T016)
  - chat.py routes (POST, GET, DELETE)
  - Register in main.py

Phase 4: Frontend Proxy + Base Chat UI (T017–T021)
  - Next.js proxy API route
  - Chat page (layout + useChat setup)
  - ChatWindow, ChatInput components

Phase 5: Frontend Chat Message UI (T022–T026)
  - MessageList, MessageBubble, ToolCallBubble
  - History load on mount (GET /chat/history)
  - Clear history button
  - Nav bar update (/tasks ↔ /chat links)

Phase 6: Polish + Integration (T027–T032)
  - Error states (503, network failure)
  - Loading/thinking indicator
  - Scroll-to-bottom on new message
  - Empty state with welcome message
  - End-to-end smoke test
  - README update + PHR
```
