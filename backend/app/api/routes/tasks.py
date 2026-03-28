"""All 6 task REST endpoints.

Route prefix: /api/{user_id}/tasks  (mounted in main.py)

Every endpoint:
  1. Validates JWT via get_current_user_id dep (401 / 403 on failure)
  2. Delegates business logic to task_service (no DB queries here)
  3. Returns typed Pydantic response

Ref: specs/001-todo-web-app/contracts/openapi.yaml
     specs/001-tasks-api/spec.md
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.database import get_session
from app.schemas.task import (
    StatusFilter,
    TaskCreateRequest,
    TaskListResponse,
    TaskResponse,
    TaskUpdateRequest,
)
from app.services import task_service

router = APIRouter()


# ---------------------------------------------------------------------------
# GET /api/{user_id}/tasks
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=TaskListResponse,
    summary="List all tasks for the authenticated user",
    description=(
        "Returns all tasks owned by the authenticated user. "
        "Optional `?status=pending` or `?status=completed` filter. "
        "Results ordered newest-first."
    ),
)
async def list_tasks(
    user_id: str,
    status: Optional[StatusFilter] = None,
    current_user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> TaskListResponse:
    tasks = await task_service.list_tasks(session, current_user_id, status)
    return TaskListResponse(
        tasks=[TaskResponse.model_validate(t) for t in tasks],
        total=len(tasks),
    )


# ---------------------------------------------------------------------------
# POST /api/{user_id}/tasks
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new task",
)
async def create_task(
    user_id: str,
    body: TaskCreateRequest,
    current_user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> TaskResponse:
    task = await task_service.create_task(session, current_user_id, body)
    return TaskResponse.model_validate(task)


# ---------------------------------------------------------------------------
# GET /api/{user_id}/tasks/{task_id}
# ---------------------------------------------------------------------------
@router.get(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Get a single task by ID",
)
async def get_task(
    user_id: str,
    task_id: uuid.UUID,
    current_user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> TaskResponse:
    task = await task_service.get_task(session, task_id, current_user_id)
    return TaskResponse.model_validate(task)


# ---------------------------------------------------------------------------
# PUT /api/{user_id}/tasks/{task_id}
# ---------------------------------------------------------------------------
@router.put(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Update a task's title and/or description",
)
async def update_task(
    user_id: str,
    task_id: uuid.UUID,
    body: TaskUpdateRequest,
    current_user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> TaskResponse:
    task = await task_service.update_task(session, task_id, current_user_id, body)
    return TaskResponse.model_validate(task)


# ---------------------------------------------------------------------------
# DELETE /api/{user_id}/tasks/{task_id}
# ---------------------------------------------------------------------------
@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently delete a task",
)
async def delete_task(
    user_id: str,
    task_id: uuid.UUID,
    current_user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> Response:
    await task_service.delete_task(session, task_id, current_user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# PATCH /api/{user_id}/tasks/{task_id}/complete
# ---------------------------------------------------------------------------
@router.patch(
    "/{task_id}/complete",
    response_model=TaskResponse,
    summary="Toggle task completion status (no request body)",
)
async def toggle_complete(
    user_id: str,
    task_id: uuid.UUID,
    current_user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> TaskResponse:
    task = await task_service.toggle_complete(session, task_id, current_user_id)
    return TaskResponse.model_validate(task)
