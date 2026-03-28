import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


class TaskCreateRequest(BaseModel):
    """Request body for POST /api/{user_id}/tasks.

    Validation:
    - title: required, 1–200 chars, whitespace stripped (whitespace-only rejected)
    - description: optional, max 1000 chars

    Ref: specs/001-tasks-crud/spec.md FR-001, FR-002, FR-003
    """

    title: str = Field(
        min_length=1,
        max_length=200,
        strip_whitespace=True,
        description="Task title — required, 1–200 characters",
    )
    description: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Optional description — up to 1000 characters",
    )


class TaskUpdateRequest(BaseModel):
    """Request body for PUT /api/{user_id}/tasks/{task_id}.

    At least one field must be provided.
    Same validation rules as create.

    Ref: specs/001-tasks-crud/spec.md FR-007, FR-011
    """

    title: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=200,
        strip_whitespace=True,
        description="Updated title — 1–200 characters",
    )
    description: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Updated description — up to 1000 characters",
    )

    @model_validator(mode="after")
    def at_least_one_field_required(self) -> "TaskUpdateRequest":
        if self.title is None and self.description is None:
            raise ValueError("At least one of 'title' or 'description' must be provided")
        return self


class TaskResponse(BaseModel):
    """Response shape for a single task.

    Returned by: create, get, update, toggle endpoints.
    Ref: specs/001-todo-web-app/data-model.md § TaskResponse
    """

    id: uuid.UUID
    user_id: str
    title: str
    description: Optional[str]
    is_complete: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    """Response shape for the task list endpoint.

    Includes total count to support future pagination without breaking changes.
    Ref: specs/001-todo-web-app/data-model.md § TaskListResponse
    """

    tasks: list[TaskResponse]
    total: int


StatusFilter = Literal["pending", "completed"]
