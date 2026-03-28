from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """Registered user account.

    Ref: specs/001-todo-web-app/data-model.md § User
    - Email must be unique across all accounts
    - id is TEXT (managed by Better Auth — string IDs)
    - Created by Better Auth on frontend; backend only reads this table for FK integrity
    """

    __tablename__ = "user"

    id: str = Field(
        primary_key=True,
        index=True,
        nullable=False,
    )
    email: str = Field(unique=True, index=True, max_length=320, nullable=False)
    hashed_password: Optional[str] = Field(default=None, nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
