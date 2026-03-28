import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Index
from sqlmodel import Field, SQLModel


class Task(SQLModel, table=True):
    """A todo task owned by one user.

    Ref: specs/001-todo-web-app/data-model.md § Task
    - user_id is ALWAYS injected from JWT — never accepted from request body
    - title: 1–200 chars (enforced in schema layer before DB)
    - description: optional, 0–1000 chars
    - ON DELETE CASCADE: deleting user removes all their tasks
    """

    __tablename__ = "task"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    user_id: str = Field(
        foreign_key="user.id",
        nullable=False,
        index=True,
        # ON DELETE CASCADE defined in Alembic migration
    )
    title: str = Field(max_length=200, nullable=False)
    description: Optional[str] = Field(default=None, max_length=1000, nullable=True)
    is_complete: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # Composite index supports: list by user + filter by status
    __table_args__ = (
        Index("idx_task_user_status", "user_id", "is_complete"),
    )
