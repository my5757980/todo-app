"""Chat service: conversation management + Grok (xAI) agent orchestration.

Architecture:
  - get_or_create_conversation : upsert one Conversation row per user
  - load_history               : fetch last N messages (chronological)
  - save_messages              : bulk-insert Message rows after a chat turn
  - clear_history              : delete all messages, keep Conversation row
  - build_agent_messages       : map DB rows → OpenAI message format
  - stream_chat                : async generator; runs agentic tool loop then
                                 streams final response in Vercel AI SDK format

Streaming wire format (Vercel AI SDK v3 data stream protocol):
  9:<json>\n  — tool call (toolCallId, toolName, args)
  a:<json>\n  — tool result (toolCallId, result)
  0:<json>\n  — text delta
  d:<json>\n  — finish marker
  3:<json>\n  — error (non-200 or exception)

Ref: specs/003-ai-todo-chatbot/spec.md FR-001–FR-008
     specs/003-ai-todo-chatbot/plan.md § Decision 4, § Streaming implementation
"""
import asyncio
import json
import logging
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Any, Optional

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import delete, select

from app.config import Settings
from app.models.conversation import Conversation
from app.models.message import Message

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System prompt — injected at the start of every agent call
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are a helpful todo assistant. You help users manage their task list.\n"
    "Always confirm after performing an action with a short, friendly message.\n"
    "Be concise.\n"
    "\n"
    "The user's CURRENT TASK LIST is injected at the end of this system message before every request.\n"
    "Each task has an 'id' (UUID string) and a 'title'. Use those IDs directly.\n"
    "\n"
    "RULES:\n"
    "1. To delete a task: call delete_task with the task's exact UUID 'id'.\n"
    "2. To update a task: call update_task with the task's exact UUID 'id'.\n"
    "3. To toggle complete: call toggle_task_complete with the task's exact UUID 'id'.\n"
    "4. To create a new task: call create_task.\n"
    "5. NEVER pass a number (1, 2, 3...) as task_id — only the UUID string.\n"
    "6. NEVER call create_task when the user wants to edit an existing task.\n"
    "7. After performing any action, send a short confirmation. Do NOT call any tool to verify.\n"
    "8. Never reveal raw UUID values unless explicitly asked.\n"
)


# ---------------------------------------------------------------------------
# Conversation helpers
# ---------------------------------------------------------------------------


async def get_or_create_conversation(
    session: AsyncSession,
    user_id: str,
) -> Conversation:
    """Return the existing conversation for this user or create a new one.

    Enforces the one-conversation-per-user invariant (FR-006).
    """
    stmt = select(Conversation).where(Conversation.user_id == user_id)
    result = await session.execute(stmt)
    conv = result.scalar_one_or_none()

    if conv is None:
        conv = Conversation(user_id=user_id)
        session.add(conv)
        await session.commit()
        await session.refresh(conv)

    return conv


async def load_history(
    session: AsyncSession,
    conversation_id: uuid.UUID,
    limit: int = 20,
) -> list[Message]:
    """Return the last `limit` messages in chronological order (FR-007).

    Fetches newest-first then reverses so the agent sees the correct
    temporal order: oldest message first, newest last.
    """
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    result = await session.execute(stmt)
    messages = list(result.scalars().all())
    messages.reverse()  # chronological order for agent context
    return messages


async def save_messages(
    session: AsyncSession,
    conversation_id: uuid.UUID,
    messages: list[dict],
) -> None:
    """Bulk-insert Message rows and touch conversation.updated_at.

    Each dict must have: role, content. Optionally: tool_name.
    """
    for msg in messages:
        db_msg = Message(
            conversation_id=conversation_id,
            role=msg["role"],
            content=msg["content"],
            tool_name=msg.get("tool_name"),
        )
        session.add(db_msg)

    # Touch conversation.updated_at
    stmt = select(Conversation).where(Conversation.id == conversation_id)
    result = await session.execute(stmt)
    conv = result.scalar_one_or_none()
    if conv:
        conv.updated_at = datetime.utcnow()
        session.add(conv)

    await session.commit()


async def clear_history(
    session: AsyncSession,
    conversation_id: uuid.UUID,
) -> None:
    """Delete all messages for this conversation (US8).

    The Conversation row is kept so the user can send new messages
    immediately after clearing without creating a new conversation.
    """
    await session.execute(
        delete(Message).where(Message.conversation_id == conversation_id)
    )

    stmt = select(Conversation).where(Conversation.id == conversation_id)
    result = await session.execute(stmt)
    conv = result.scalar_one_or_none()
    if conv:
        conv.updated_at = datetime.utcnow()
        session.add(conv)

    await session.commit()


# ---------------------------------------------------------------------------
# Agent message builder
# ---------------------------------------------------------------------------


def build_agent_messages(
    history: list[Message],
    new_message: str,
) -> list[dict]:
    """Convert DB message rows to OpenAI message format.

    Only 'user' and 'assistant' rows are included in the context window —
    tool_call/tool_result rows are stored for display only (plan § Decision 4).
    """
    msgs: list[dict] = []
    for m in history:
        if m.role in ("user", "assistant"):
            msgs.append({"role": m.role, "content": m.content})
    msgs.append({"role": "user", "content": new_message})
    return msgs


# ---------------------------------------------------------------------------
# Grok client factory
# ---------------------------------------------------------------------------


def _make_grok_client(settings: Settings) -> AsyncOpenAI:
    """Return an AsyncOpenAI client pointed at xAI's OpenAI-compatible endpoint."""
    return AsyncOpenAI(
        api_key=settings.GROK_API_KEY,
        base_url="https://api.groq.com/openai/v1",
    )


# ---------------------------------------------------------------------------
# Streaming agent loop
# ---------------------------------------------------------------------------


async def stream_chat(
    new_message: str,
    history: list[Message],
    tool_schemas: list[dict],
    tool_executors: dict[str, Any],
    settings: Settings,
    collected_messages: list[dict],
) -> AsyncGenerator[str, None]:
    """Agentic tool loop followed by a streamed final response.

    Phase 1 — Tool loop (non-streaming):
      Calls Grok with tool_choice="auto". If the model requests tool calls,
      executes them via tool_executors, emits 9: + a: SSE events, then loops.

    Phase 2 — Streaming response:
      Once the model produces no tool calls, the final response is streamed
      token-by-token, emitting 0: SSE lines.

    Side-effect: appends all new messages (user, tool_call, tool_result,
    assistant) to `collected_messages` so the caller can persist them.

    Wire format lines (newline-terminated, no "data:" prefix):
      9:{...}  tool call
      a:{...}  tool result
      0:{...}  text delta
      d:{...}  finish
      3:{...}  error

    Ref: specs/003-ai-todo-chatbot/plan.md § Streaming implementation
    """
    client = _make_grok_client(settings)

    # Pre-load the task list and inject it into the system prompt so the model
    # can call delete_task/update_task/toggle directly without a list_tasks
    # round-trip, cutting Groq API calls from 4 to 2 per message.
    task_list_context = ""
    list_executor = tool_executors.get("list_tasks")
    if list_executor:
        try:
            task_list_raw = await list_executor({})
            task_data = json.loads(task_list_raw)
            tasks = task_data.get("tasks", [])
            if tasks:
                lines = [f"  - id={t['id']} | title={t['title']} | done={t['is_complete']}" for t in tasks]
                task_list_context = "\n\nCURRENT TASKS:\n" + "\n".join(lines)
            else:
                task_list_context = "\n\nCURRENT TASKS: (none)"
        except Exception:
            pass  # if pre-load fails, model falls back to calling list_tasks

    system = [{"role": "system", "content": SYSTEM_PROMPT + task_list_context}]
    messages = build_agent_messages(history, new_message)

    # Track the user's new message for persistence
    collected_messages.append({"role": "user", "content": new_message})

    # -----------------------------------------------------------------------
    # Phase 1: tool call loop (non-streaming for reliable tool_call parsing)
    # -----------------------------------------------------------------------
    max_iterations = 8  # guard against infinite tool loops
    # list_tasks is still available as a fallback but model should not need it.
    # Remove it after first use to prevent loops.
    active_schemas = list(tool_schemas) if tool_schemas else []
    for _ in range(max_iterations):
        try:
            response = await client.chat.completions.create(
                model=settings.GROK_MODEL,
                messages=system + messages,
                tools=active_schemas if active_schemas else None,
                tool_choice="auto" if active_schemas else "none",
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("Grok API error in tool loop: %s", exc)
            yield f'3:{json.dumps({"error": "AI service unavailable. Please try again."})}\n'
            return

        choice = response.choices[0]
        msg = choice.message

        if not msg.tool_calls:
            # No tool calls — proceed to streaming phase
            break

        # Add the assistant's tool-call message to the context
        assistant_ctx: dict = {
            "role": "assistant",
            "content": msg.content or "",
            "tool_calls": [tc.model_dump() for tc in msg.tool_calls],
        }
        messages.append(assistant_ctx)

        for tc in msg.tool_calls:
            tool_name = tc.function.name
            tool_call_id = tc.id

            # Parse arguments safely
            try:
                args: dict = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}

            # Emit tool-call start event (frontend shows ToolCallBubble)
            yield (
                f'9:{json.dumps({"toolCallId": tool_call_id, "toolName": tool_name, "args": args})}\n'
            )
            collected_messages.append({
                "role": "tool_call",
                "content": json.dumps(args),
                "tool_name": tool_name,
            })

            # After list_tasks runs once, drop it from active_schemas so the
            # model cannot call it again this turn and must use existing results.
            if tool_name == "list_tasks":
                active_schemas = [s for s in active_schemas if s["function"]["name"] != "list_tasks"]

            # Execute the tool (errors returned as JSON, never raised — FR-008)
            executor = tool_executors.get(tool_name)
            if executor:
                try:
                    result_str: str = await executor(args)
                except Exception as exc:  # noqa: BLE001
                    result_str = json.dumps({"error": str(exc)})
            else:
                result_str = json.dumps({"error": f"Unknown tool: {tool_name}"})

            # Parse result for the SSE event (keep as string for DB)
            try:
                result_obj: Any = json.loads(result_str)
            except json.JSONDecodeError:
                result_obj = result_str

            # Emit tool-result event
            yield f'a:{json.dumps({"toolCallId": tool_call_id, "result": result_obj})}\n'
            collected_messages.append({
                "role": "tool_result",
                "content": result_str,
                "tool_name": tool_name,
            })

            # Add tool result to context for next model call
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call_id,
                "content": result_str,
            })

    # -----------------------------------------------------------------------
    # Phase 2: stream the final text response
    # -----------------------------------------------------------------------
    try:
        stream = await client.chat.completions.create(
            model=settings.GROK_MODEL,
            messages=system + messages,
            stream=True,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Grok API error starting stream: %s", exc)
        yield f'3:{json.dumps({"error": "AI service unavailable. Please try again."})}\n'
        return

    final_parts: list[str] = []
    try:
        async with asyncio.timeout(30):
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta_content: Optional[str] = chunk.choices[0].delta.content
                if delta_content:
                    final_parts.append(delta_content)
                    yield f'0:{json.dumps(delta_content)}\n'
    except asyncio.TimeoutError:
        logger.warning("Grok streaming timed out after 30s")
        if not final_parts:
            yield f'3:{json.dumps({"error": "Response timed out. Please try again."})}\n'
            return
    except Exception as exc:  # noqa: BLE001
        logger.error("Grok streaming error: %s", exc)
        yield f'3:{json.dumps({"error": "Stream interrupted. Please try again."})}\n'
        return

    final_text = "".join(final_parts)
    collected_messages.append({"role": "assistant", "content": final_text})

    # Emit finish marker
    yield f'd:{json.dumps({"finishReason": "stop"})}\n'
