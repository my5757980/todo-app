"""Chat request/response schemas for Phase III AI chatbot.

Ref: specs/003-ai-todo-chatbot/spec.md § API Contracts
     specs/003-ai-todo-chatbot/plan.md § Phase 2
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Body for POST /api/{user_id}/chat."""

    message: str = Field(
        min_length=1,
        max_length=4000,
        strip_whitespace=True,
        description="The user's chat message",
    )


class MessageResponse(BaseModel):
    """A single message in the conversation history."""

    id: uuid.UUID
    role: str  # 'user' | 'assistant' | 'tool_call' | 'tool_result'
    content: str
    tool_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class HistoryResponse(BaseModel):
    """Response for GET /api/{user_id}/chat/history."""

    conversation_id: uuid.UUID
    messages: list[MessageResponse]
