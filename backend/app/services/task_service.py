"""Task business logic layer.

ALL database queries for tasks live here — never in route handlers.
Every query includes WHERE user_id = :current_user_id for user isolation.

Ref: backend/CLAUDE.md § Layered Architecture
     specs/001-tasks-crud/spec.md
"""
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.task import Task
from app.schemas.task import StatusFilter, TaskCreateRequest, TaskUpdateRequest


async def create_task(
    session: AsyncSession,
    user_id: str,
    data: TaskCreateRequest,
) -> Task:
    """Create a new task for the authenticated user.

    user_id comes from JWT dep — never from request body.
    Ref: specs/001-tasks-crud/spec.md FR-001, FR-004
    """
    task = Task(
        user_id=user_id,
        title=data.title,
        description=data.description,
        # is_complete defaults to False, created_at/updated_at default to now()
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


async def list_tasks(
    session: AsyncSession,
    user_id: str,
    status_filter: Optional[StatusFilter] = None,
) -> list[Task]:
    """Return all tasks for the given user, optionally filtered by status.

    status_filter="pending"   → only incomplete tasks
    status_filter="completed" → only complete tasks
    status_filter=None        → all tasks

    Results ordered newest-first (created_at DESC).
    Ref: specs/001-tasks-crud/spec.md FR-005, FR-006
         specs/001-tasks-api/spec.md FR-001, FR-002, FR-003
    """
    stmt = select(Task).where(Task.user_id == user_id)

    if status_filter == "pending":
        stmt = stmt.where(Task.is_complete == False)  # noqa: E712
    elif status_filter == "completed":
        stmt = stmt.where(Task.is_complete == True)  # noqa: E712

    stmt = stmt.order_by(Task.created_at.desc())
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_task(
    session: AsyncSession,
    task_id: uuid.UUID,
    user_id: str,
) -> Task:
    """Fetch a single task by ID, scoped to the authenticated user.

    Returns 404 if the task does not exist OR belongs to a different user.
    This uniform response prevents ownership leakage.
    Ref: specs/001-tasks-api/spec.md FR-008
    """
    stmt = select(Task).where(Task.id == task_id, Task.user_id == user_id)
    result = await session.execute(stmt)
    task = result.scalar_one_or_none()

    if task is None:
        logger.warning("Task not found: task_id=%s user_id=%r", task_id, user_id)
        # Try without user_id filter to check if task exists at all
        stmt2 = select(Task).where(Task.id == task_id)
        result2 = await session.execute(stmt2)
        any_task = result2.scalar_one_or_none()
        if any_task:
            logger.warning("Task exists but user_id mismatch: task.user_id=%r vs queried=%r", any_task.user_id, user_id)
        else:
            logger.warning("Task does not exist at all in DB")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return task


async def update_task(
    session: AsyncSession,
    task_id: uuid.UUID,
    user_id: str,
    data: TaskUpdateRequest,
) -> Task:
    """Update title and/or description. Sets updated_at to now.

    Ref: specs/001-tasks-crud/spec.md FR-007, FR-011
    """
    task = await get_task(session, task_id, user_id)

    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description

    task.updated_at = datetime.utcnow()
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


async def toggle_complete(
    session: AsyncSession,
    task_id: uuid.UUID,
    user_id: str,
) -> Task:
    """Atomically flip is_complete status. Updates updated_at.

    No request body needed — state derived from current DB record.
    Ref: specs/001-tasks-api/spec.md FR-014, FR-015
    """
    task = await get_task(session, task_id, user_id)
    task.is_complete = not task.is_complete
    task.updated_at = datetime.utcnow()
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


async def delete_task(
    session: AsyncSession,
    task_id: uuid.UUID,
    user_id: str,
) -> None:
    """Permanently delete a task. Returns None (caller returns 204).

    Ref: specs/001-tasks-crud/spec.md FR-008
         specs/001-tasks-api/spec.md FR-012, FR-013
    """
    task = await get_task(session, task_id, user_id)
    await session.delete(task)
    await session.commit()
