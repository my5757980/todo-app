import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class Conversation(SQLModel, table=True):
    """One conversation per user (enforced via UNIQUE constraint on user_id).

    Created lazily on first POST /chat request.
    Clearing history deletes Message rows but keeps this record.

    Ref: specs/003-ai-todo-chatbot/spec.md § Data Model
         specs/003-ai-todo-chatbot/plan.md § Decision 5
    """

    __tablename__ = "conversation"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    user_id: str = Field(
        foreign_key="user.id",
        nullable=False,
        # UNIQUE constraint + ON DELETE CASCADE defined in migration 002
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
