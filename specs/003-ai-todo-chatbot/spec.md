# Feature Specification: Todo App Phase III — AI-Powered Todo Chatbot

**Feature Branch**: `003-ai-todo-chatbot`
**Created**: 2026-03-26
**Status**: Draft
**Phase**: III — builds on top of Phase II (full-stack web app, auth, 6 REST endpoints)

**Input**: Add a conversational AI chatbot to the existing Phase II web app. Users can manage their todos via natural language. Chat history persists in the database. Frontend uses Vercel AI SDK + custom shadcn-style UI. Backend uses FastAPI + OpenAI Agents SDK + embedded MCP server. New `/chat` route under the `(dashboard)` route group.

---

## Constraints & Non-Goals

**In Scope**:
- All 6 task CRUD operations accessible via natural language
- Persistent chat history per user (stored in Neon DB)
- Streaming AI responses to the browser (SSE)
- MCP tools embedded inside existing FastAPI backend (no new container)
- `/chat` page under the existing `(dashboard)` group (JWT-protected)
- Nav bar updated with `/tasks` ↔ `/chat` links
- Clear conversation history action

**Out of Scope** (Phase IV+):
- Multiple named conversations per user
- File/image attachments in chat
- Voice input/output
- Proactive notifications or reminders
- AI-generated task suggestions unprompted
- Multi-model switching in UI
- LLM fine-tuning or RAG over task history

**Invariants**:
- `user_id` is ALWAYS from JWT — chatbot can only read/write the authenticated user's tasks
- All 6 task operations in the chatbot go through the existing `task_service.py` — no duplicate DB logic
- Chat API endpoint requires same JWT auth as task endpoints
- OpenAI API key is server-side only — NEVER exposed to the browser
- Phase II features (`/tasks` CRUD UI) remain fully functional and unchanged

---

## User Stories

### US1 — Open Chat Interface (Priority: P1) 🎯 MVP

An authenticated user navigates to `/chat` from the top nav bar and sees a clean chat interface. If they have previous messages, they are loaded. If not, they see a welcome message.

**Why this priority**: The chat UI must exist before any chatbot interaction is possible.

**Independent Test**: Navigate to `/chat` → see chat interface → navigate away → return → same state preserved.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they click "Chat" in the nav, **Then** they land on `/chat` and see the chat input and message history (or empty state with welcome message).
2. **Given** a user with previous chat messages, **When** they return to `/chat`, **Then** they see their previous conversation restored from the database.
3. **Given** an unauthenticated user, **When** they try to access `/chat` directly, **Then** they are redirected to `/login` (middleware protection — same as `/tasks`).
4. **Given** a user on `/chat`, **When** they click "Tasks" in the nav, **Then** they navigate to `/tasks` and vice versa.

---

### US2 — Create Task via Natural Language (Priority: P1) 🎯 MVP

An authenticated user types a natural language instruction to create a todo. The AI interprets the intent, calls the `create_task` tool, and responds with a confirmation.

**Independent Test**: Type "Add buy groceries to my list" → task appears in DB → AI confirms → navigate to `/tasks` → task visible.

**Acceptance Scenarios**:

1. **Given** a user on `/chat`, **When** they type "Add buy groceries to my list", **Then** the AI creates the task and responds "Done! I've added 'Buy groceries' to your tasks."
2. **Given** a user, **When** they type "Create a task: Call the dentist, remind me to schedule a cleaning", **Then** the AI creates a task with title "Call the dentist" and description "Remind me to schedule a cleaning."
3. **Given** a user, **When** they ask to create a task with a blank or whitespace-only title, **Then** the AI responds with an error message from the tool (does not create the task).
4. **Given** a user, **When** the AI creates a task, **Then** the created task is visible in the `/tasks` page without a page refresh.

---

### US3 — View Tasks via Natural Language (Priority: P1) 🎯 MVP

An authenticated user asks the chatbot to show their tasks. The AI calls `list_tasks` and presents the results in a readable format.

**Independent Test**: Create 3 tasks via `/tasks` UI → go to `/chat` → type "What are my todos?" → AI lists all 3.

**Acceptance Scenarios**:

1. **Given** a user with 3 tasks, **When** they type "What are my todos?", **Then** the AI lists all tasks with their titles and completion status.
2. **Given** a user, **When** they type "Show my pending tasks", **Then** the AI calls `list_tasks(status="pending")` and lists only incomplete tasks.
3. **Given** a user with no tasks, **When** they ask for their task list, **Then** the AI responds "You have no tasks yet. Would you like to create one?"
4. **Given** a user, **When** they type "How many tasks do I have?", **Then** the AI responds with the correct count.

---

### US4 — Toggle Task Complete via Natural Language (Priority: P2)

An authenticated user tells the AI to mark a task as done or incomplete. The AI identifies the task by title match, calls `toggle_task_complete`, and confirms.

**Independent Test**: Create "Walk dog" → type "Mark walk dog as done" → is_complete flips to true → visible in `/tasks` with strikethrough.

**Acceptance Scenarios**:

1. **Given** a user with an incomplete task "Walk dog", **When** they type "Mark walk dog as done", **Then** the AI toggles it and confirms "Done! 'Walk dog' is now marked as complete."
2. **Given** a user with a complete task, **When** they type "Mark it as incomplete again", **Then** the AI toggles it back and confirms.
3. **Given** ambiguous input (e.g., "Mark the task as done" with multiple tasks), **Then** the AI asks for clarification before acting.
4. **Given** a task name that doesn't match any existing task, **Then** the AI responds "I couldn't find a task matching that name. Here are your current tasks: ..."

---

### US5 — Delete Task via Natural Language (Priority: P2)

An authenticated user asks the AI to delete a task. The AI confirms which task to delete before executing.

**Independent Test**: Create "Test task" → type "Delete test task" → AI confirms → task deleted → no longer on `/tasks`.

**Acceptance Scenarios**:

1. **Given** a user with task "Test task", **When** they type "Delete test task", **Then** the AI deletes it and confirms "Done! 'Test task' has been deleted."
2. **Given** ambiguous delete intent, **Then** the AI asks "Which task would you like to delete?" and lists options.
3. **Given** a delete of a non-existent task, **Then** the AI responds with a helpful "I couldn't find that task" message.

---

### US6 — Update Task via Natural Language (Priority: P2)

An authenticated user asks the AI to rename or update a task's description.

**Independent Test**: Create "Buy milk" → type "Change buy milk to buy oat milk" → title updates in DB → visible in `/tasks`.

**Acceptance Scenarios**:

1. **Given** task "Buy milk", **When** user types "Change buy milk to buy oat milk", **Then** the AI calls `update_task` and confirms "Updated! 'Buy milk' is now 'Buy oat milk'."
2. **Given** task "Call dentist", **When** user adds a description "Schedule for next Tuesday", **Then** the AI updates the description.
3. **Given** ambiguous update, **Then** the AI asks for clarification.

---

### US7 — Filter and Summarize via Natural Language (Priority: P3)

An authenticated user asks the AI for filtered views or summaries of their task list.

**Independent Test**: Create 3 incomplete + 2 complete tasks → type "Show completed tasks" → AI lists only 2 → type "How many pending tasks?" → AI answers correctly.

**Acceptance Scenarios**:

1. **Given** mixed tasks, **When** user types "Show only completed tasks", **Then** the AI calls `list_tasks(status="completed")` and lists them.
2. **Given** a user, **When** they type "Give me a summary of my tasks", **Then** the AI responds with counts: "You have 5 tasks: 3 pending, 2 completed."
3. **Given** no completed tasks, **When** user asks for completed, **Then** the AI responds "You have no completed tasks yet."

---

### US8 — Clear Chat History (Priority: P3)

An authenticated user can clear their chat history via a button or a chat command.

**Independent Test**: Chat with AI → click "Clear chat" → conversation cleared from DB → empty state shown.

**Acceptance Scenarios**:

1. **Given** a user with message history, **When** they click the "Clear chat" button, **Then** all messages are deleted from DB and the UI shows the empty/welcome state.
2. **Given** a user, **When** they type "/clear" or "clear chat", **Then** the AI clears the conversation and responds "Conversation cleared. How can I help you with your tasks?"
3. **Given** a user who clears and then sends a new message, **Then** the AI has no memory of the cleared conversation.

---

## Functional Requirements

### FR-001: Chat Streaming
The backend must stream AI responses token-by-token using SSE. The frontend renders tokens as they arrive (no waiting for full response). Protocol: Vercel AI SDK data stream format.

### FR-002: Tool Call Visibility
When the AI calls an MCP tool, the frontend shows a visual indicator ("Checking your tasks…", "Creating task…") before the final response appears.

### FR-003: JWT Auth on Chat Endpoint
`POST /api/{user_id}/chat` requires the same Bearer JWT as the task endpoints. `user_id` in the URL is validated against the JWT `sub` claim. The AI agent receives `user_id` from the verified JWT — never from the chat message content.

### FR-004: Stateless Agent, Stateful DB
Each chat request to FastAPI is stateless. The backend loads the last N messages from the DB to provide the agent's conversation context, runs the agent, streams the response, and persists the new messages.

### FR-005: MCP Tools Scoped to user_id
All MCP tools have `user_id` bound at request time from the JWT dep. The AI cannot be prompted to access another user's tasks.

### FR-006: One Conversation Per User
One active conversation per user (Phase III). `conversation_id` is created on first chat and reused. Clearing history deletes messages but keeps the conversation record.

### FR-007: Context Window Management
The backend sends the last **20 messages** to the agent (configurable). Older messages remain in DB but are not included in the LLM context.

### FR-008: Error Handling
- Tool errors (task not found, validation failure) are caught and returned as assistant messages, not unhandled exceptions.
- If the OpenAI API is unavailable, return HTTP 503 with a user-friendly message.
- Never expose raw stack traces or internal error details to the chat response.

---

## Data Model

### New Table: `conversation`

```
conversation
  id:          UUID     PK  default gen
  user_id:     UUID     FK → user.id  ON DELETE CASCADE  unique (one per user, Phase III)
  created_at:  datetime default utcnow
  updated_at:  datetime default utcnow  (updated on each new message)
```

**Index**: `UNIQUE (user_id)` — enforces one conversation per user.

### New Table: `message`

```
message
  id:               UUID     PK  default gen
  conversation_id:  UUID     FK → conversation.id  ON DELETE CASCADE
  role:             str      — 'user' | 'assistant' | 'tool_call' | 'tool_result'
  content:          text     — plain text (user/assistant) or JSON (tool calls/results)
  tool_name:        str?     — null unless role = 'tool_call' or 'tool_result'
  created_at:       datetime default utcnow
```

**Index**: `(conversation_id, created_at)` — for loading history in order.

---

## MCP Tool Contracts

The MCP server is embedded in FastAPI. All tools are bound to the authenticated `user_id` at request time.

| Tool | Input | Output | Maps to |
|---|---|---|---|
| `list_tasks` | `status?: "pending"\|"completed"` | `TaskListResponse` | `task_service.list_tasks()` |
| `create_task` | `title: str`, `description?: str` | `TaskResponse` | `task_service.create_task()` |
| `get_task` | `task_id: str` | `TaskResponse` | `task_service.get_task()` |
| `update_task` | `task_id: str`, `title?: str`, `description?: str` | `TaskResponse` | `task_service.update_task()` |
| `delete_task` | `task_id: str` | `{"deleted": true}` | `task_service.delete_task()` |
| `toggle_task_complete` | `task_id: str` | `TaskResponse` | `task_service.toggle_complete()` |

**Contract**: Each tool calls the corresponding `task_service` function with the `user_id` already injected. The MCP tools add **no new DB logic** — they are thin wrappers.

---

## API Contracts

### `POST /api/{user_id}/chat`

Send a message and stream the AI response.

```
Authorization: Bearer <jwt>
Content-Type: application/json

Body:
{
  "message": "Add buy groceries to my list"
}

Response: text/event-stream
  (Vercel AI SDK data stream protocol)
  Streams text deltas + tool call events
```

**Auth**: `user_id` in path validated against JWT sub. 401 if invalid, 403 if mismatch.

### `GET /api/{user_id}/chat/history`

Load conversation history for initial page render.

```
Authorization: Bearer <jwt>

Response 200:
{
  "conversation_id": "uuid",
  "messages": [
    {
      "id": "uuid",
      "role": "user" | "assistant" | "tool_call" | "tool_result",
      "content": "string",
      "tool_name": "string | null",
      "created_at": "iso8601"
    }
  ]
}
```

### `DELETE /api/{user_id}/chat/history`

Clear all messages for the user's conversation (keeps conversation record).

```
Authorization: Bearer <jwt>
Response: 204 No Content
```

---

## Frontend Structure

```
frontend/src/
├── app/
│   └── (dashboard)/
│       ├── layout.tsx          ← UPDATE: add nav links for /tasks and /chat
│       └── chat/
│           └── page.tsx        ← NEW: Chat page (client component)
└── components/
    └── chat/                   ← NEW: all chat UI components
        ├── ChatWindow.tsx      # Root chat component — useChat() hook
        ├── MessageList.tsx     # Scrollable message history
        ├── MessageBubble.tsx   # Single message (user/assistant variants)
        ├── ToolCallBubble.tsx  # "🔧 Checking your tasks..." indicator
        └── ChatInput.tsx       # Textarea + send button (Enter=send, Shift+Enter=newline)
```

---

## Backend Structure

```
backend/app/
├── models/
│   ├── conversation.py         ← NEW
│   └── message.py             ← NEW
├── schemas/
│   └── chat.py                ← NEW: ChatRequest, MessageResponse, HistoryResponse
├── mcp/
│   └── task_tools.py          ← NEW: MCP tool definitions (6 tools, bound to user_id)
├── services/
│   └── chat_service.py        ← NEW: agent orchestration, history loading, message persistence
└── api/routes/
    └── chat.py                ← NEW: POST /chat + GET /chat/history + DELETE /chat/history

migrations/versions/
  002_create_conversation_message_tables.py  ← NEW Alembic migration
```

**New Python packages**:
- `openai-agents` — OpenAI Agents SDK (agent loop + tool calling)
- `mcp` — Official MCP Python SDK (tool definitions)
- `openai` — OpenAI API client (underlying model calls)

**New Frontend packages**:
- `ai` — Vercel AI SDK (`useChat` hook + streaming)

---

## Security Constraints

- `OPENAI_API_KEY` is a backend-only env var — NEVER set `NEXT_PUBLIC_OPENAI_API_KEY`
- All tool calls include `user_id` from the verified JWT dep — the AI prompt never receives `user_id` as a hint from the user's message
- Message content is stored as-is; no PII scrubbing is in scope for Phase III
- Rate limiting is out of scope for Phase III (add in Phase IV)

---

## Success Criteria

| Criterion | Test |
|---|---|
| `/chat` is protected | Unauthenticated visit → redirect to `/login` |
| Natural language create | "Add buy milk" → task in DB |
| Natural language list | "What are my todos?" → correct list |
| Natural language toggle | "Mark X as done" → is_complete flips |
| Natural language delete | "Delete X" → removed from DB |
| Natural language update | "Rename X to Y" → title updated in DB |
| Streaming works | Tokens appear progressively, no full-response wait |
| Tool calls visible | "🔧 Creating task..." shown before confirmation |
| History persists | Leave /chat, return → same messages visible |
| User isolation | User B cannot access User A's tasks via chat |
| Clear history | "Clear chat" → messages gone from DB and UI |
