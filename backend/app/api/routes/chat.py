"""Chat API routes — Phase III AI chatbot.

Endpoints (mounted at /api/{user_id}/chat by main.py):
  POST   /          — stream a chat turn (Vercel AI SDK data stream format)
  GET    /history   — load full conversation history
  DELETE /history   — clear all messages (keeps conversation record)

Auth: every route requires a valid JWT via get_current_user_id dep.
      path user_id is validated against JWT sub → 401/403 on mismatch.

Streaming design:
  The POST route opens its OWN database session inside the generator function.
  This is intentional: FastAPI closes Depends() sessions when the route handler
  RETURNS (i.e. when it returns StreamingResponse), which is BEFORE the stream
  body is consumed. Opening AsyncSessionLocal() inside generate() keeps the
  session alive for the full duration of streaming + final DB save.

Wire format (text/plain; charset=utf-8 + X-Vercel-AI-Data-Stream: v1):
  9:{...}  tool call event
  a:{...}  tool result event
  0:{...}  text delta
  d:{...}  finish
  3:{...}  error

Ref: specs/003-ai-todo-chatbot/spec.md § API Contracts, FR-001–FR-008
     specs/003-ai-todo-chatbot/plan.md § Decision 2, § Backend Architecture
     backend/CLAUDE.md § JWT / Auth Rules
"""
import json
import logging
import uuid
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, Response
from fastapi.responses import StreamingResponse

from app.api.deps import get_current_user_id
from app.config import Settings, get_settings
from app.database import AsyncSessionLocal
from app.mcp.task_tools import make_task_tools
from app.schemas.chat import ChatRequest, HistoryResponse, MessageResponse
from app.services.chat_service import (
    clear_history,
    get_or_create_conversation,
    load_history,
    save_messages,
    stream_chat,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# POST / — stream a chat turn
# ---------------------------------------------------------------------------


@router.post(
    "/",
    summary="Send a chat message and stream the AI response",
    response_class=StreamingResponse,
)
async def post_chat(
    user_id: str,
    body: ChatRequest,
    current_user_id: str = Depends(get_current_user_id),
    settings: Settings = Depends(get_settings),
) -> StreamingResponse:
    """Stream an AI response to the user's message.

    Opens its own DB session inside generate() so the session survives
    for the full duration of streaming (see module docstring for rationale).

    Returns Vercel AI SDK data stream (text/plain + X-Vercel-AI-Data-Stream: v1).
    """

    async def generate() -> AsyncGenerator[bytes, None]:
        async with AsyncSessionLocal() as session:
            try:
                conv = await get_or_create_conversation(session, current_user_id)
                history = await load_history(
                    session, conv.id, limit=settings.MAX_CONTEXT_MESSAGES
                )
                tool_schemas, tool_executors = make_task_tools(session, current_user_id)
                collected: list[dict] = []

                async for chunk in stream_chat(
                    new_message=body.message,
                    history=history,
                    tool_schemas=tool_schemas,
                    tool_executors=tool_executors,
                    settings=settings,
                    collected_messages=collected,
                ):
                    yield chunk.encode("utf-8")

                # Persist all messages after the stream completes (FR-004)
                if collected:
                    await save_messages(session, conv.id, collected)

            except Exception as exc:  # noqa: BLE001
                logger.error("Chat generate() error: %s", exc)
                error_line = (
                    f'3:{json.dumps({"error": "Service error. Please try again."})}\n'
                )
                yield error_line.encode("utf-8")

    return StreamingResponse(
        generate(),
        media_type="text/plain; charset=utf-8",
        headers={
            # Tells Vercel AI SDK useChat how to parse the stream
            "X-Vercel-AI-Data-Stream": "v1",
            # Prevent proxy / CDN buffering — critical for streaming UX
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# GET /history — load conversation history
# ---------------------------------------------------------------------------


@router.get(
    "/history",
    summary="Load conversation history",
    response_model=HistoryResponse,
)
async def get_history(
    user_id: str,
    current_user_id: str = Depends(get_current_user_id),
    settings: Settings = Depends(get_settings),
) -> HistoryResponse:
    """Return up to 100 messages from the user's conversation.

    Creates an empty conversation record if this is the user's first visit.
    Used by the frontend to hydrate initialMessages on page load.
    """
    async with AsyncSessionLocal() as session:
        conv = await get_or_create_conversation(session, current_user_id)
        messages = await load_history(session, conv.id, limit=100)

    return HistoryResponse(
        conversation_id=conv.id,
        messages=[MessageResponse.model_validate(m) for m in messages],
    )


# ---------------------------------------------------------------------------
# DELETE /history — clear conversation messages
# ---------------------------------------------------------------------------


@router.delete(
    "/history",
    summary="Clear all chat messages",
    status_code=204,
)
async def delete_history(
    user_id: str,
    current_user_id: str = Depends(get_current_user_id),
) -> Response:
    """Delete all messages for the user's conversation (US8).

    The Conversation record is kept so subsequent messages work without
    creating a new conversation. Returns 204 No Content.
    """
    async with AsyncSessionLocal() as session:
        conv = await get_or_create_conversation(session, current_user_id)
        await clear_history(session, conv.id)

    return Response(status_code=204)
