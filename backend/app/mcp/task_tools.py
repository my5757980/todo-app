"""MCP-style tool definitions for the AI chatbot.

These 6 tools are thin wrappers over task_service.py — zero duplicate DB logic.
Each tool closes over `session` and `user_id` (bound at request time from JWT).
The AI cannot override user_id via prompt injection.

Returns:
    make_task_tools(session, user_id) -> (tool_schemas, tool_executors)
      - tool_schemas: list[dict] — OpenAI-compatible function tool schemas
      - tool_executors: dict[str, Callable] — tool_name -> async fn(args) -> str

Ref: specs/003-ai-todo-chatbot/spec.md § MCP Tool Contracts
     specs/003-ai-todo-chatbot/plan.md § Decision 3
"""
import json
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.task import TaskCreateRequest, TaskUpdateRequest
from app.services import task_service

# ---------------------------------------------------------------------------
# OpenAI-compatible function tool schemas (passed to the Grok API `tools` param)
# ---------------------------------------------------------------------------

TOOL_SCHEMAS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "list_tasks",
            "description": (
                "List all tasks for the current user. "
                "Optionally filter by status ('pending' for incomplete, "
                "'completed' for done tasks). Omit status to get all tasks."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["pending", "completed"],
                        "description": "Filter tasks by completion status. Omit for all tasks.",
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": (
                "Create a new task for the current user. "
                "Title is required. Description is optional."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Task title (required, 1–200 characters)",
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional task description (max 1000 characters)",
                    },
                },
                "required": ["title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_task",
            "description": "Get a specific task by its ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "The task UUID",
                    }
                },
                "required": ["task_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_task",
            "description": (
                "Update a task's title and/or description. "
                "At least one of title or description must be provided."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "The task UUID to update",
                    },
                    "title": {
                        "type": "string",
                        "description": "New title (1–200 characters)",
                    },
                    "description": {
                        "type": "string",
                        "description": "New description (max 1000 characters)",
                    },
                },
                "required": ["task_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_task",
            "description": "Permanently delete a task by its ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "The task UUID to delete",
                    }
                },
                "required": ["task_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "toggle_task_complete",
            "description": (
                "Toggle the completion status of a task. "
                "If complete → marks incomplete. If incomplete → marks complete."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "The task UUID to toggle",
                    }
                },
                "required": ["task_id"],
            },
        },
    },
]


# ---------------------------------------------------------------------------
# Tool executor factory
# ---------------------------------------------------------------------------

def make_task_tools(
    session: AsyncSession,
    user_id: str,
) -> tuple[list[dict], dict[str, Any]]:
    """Create tool schemas + executor functions scoped to the authenticated user.

    user_id is closed over at construction time — the AI cannot override it.
    Each executor wraps a task_service call in try/except (FR-008: errors are
    returned as JSON strings, never raised to crash the agent loop).

    Returns:
        (tool_schemas, tool_executors)
        - tool_schemas: pass to client.chat.completions.create(tools=...)
        - tool_executors: dict tool_name -> async fn(args: dict) -> str (JSON)
    """

    def _task_to_dict(task) -> dict:
        return {
            "id": str(task.id),
            "title": task.title,
            "description": task.description,
            "is_complete": task.is_complete,
            "created_at": task.created_at.isoformat(),
            "updated_at": task.updated_at.isoformat(),
        }

    def _parse_task_id(args: dict, key: str = "task_id") -> uuid.UUID:
        raw = args.get(key, "")
        return uuid.UUID(str(raw))

    async def _list_tasks(args: dict) -> str:
        try:
            status = args.get("status")  # None | "pending" | "completed"
            tasks = await task_service.list_tasks(session, user_id, status_filter=status)
            return json.dumps({
                "tasks": [_task_to_dict(t) for t in tasks],
                "total": len(tasks),
            })
        except Exception as exc:  # noqa: BLE001
            return json.dumps({"error": str(exc)})

    async def _create_task(args: dict) -> str:
        try:
            data = TaskCreateRequest(
                title=args.get("title", ""),
                description=args.get("description"),
            )
            task = await task_service.create_task(session, user_id, data)
            return json.dumps({"task": _task_to_dict(task), "created": True})
        except Exception as exc:  # noqa: BLE001
            return json.dumps({"error": str(exc)})

    async def _get_task(args: dict) -> str:
        try:
            task_id = _parse_task_id(args)
            task = await task_service.get_task(session, task_id, user_id)
            return json.dumps({"task": _task_to_dict(task)})
        except Exception as exc:  # noqa: BLE001
            return json.dumps({"error": str(exc)})

    async def _update_task(args: dict) -> str:
        try:
            task_id = _parse_task_id(args)
            data = TaskUpdateRequest(
                title=args.get("title"),
                description=args.get("description"),
            )
            task = await task_service.update_task(session, task_id, user_id, data)
            return json.dumps({"task": _task_to_dict(task), "updated": True})
        except Exception as exc:  # noqa: BLE001
            return json.dumps({"error": str(exc)})

    async def _delete_task(args: dict) -> str:
        try:
            task_id = _parse_task_id(args)
            await task_service.delete_task(session, task_id, user_id)
            return json.dumps({"deleted": True, "task_id": str(task_id)})
        except Exception as exc:  # noqa: BLE001
            return json.dumps({"error": str(exc)})

    async def _toggle_task_complete(args: dict) -> str:
        try:
            task_id = _parse_task_id(args)
            task = await task_service.toggle_complete(session, task_id, user_id)
            return json.dumps({
                "task": _task_to_dict(task),
                "is_complete": task.is_complete,
            })
        except Exception as exc:  # noqa: BLE001
            return json.dumps({"error": str(exc)})

    executors: dict[str, Any] = {
        "list_tasks": _list_tasks,
        "create_task": _create_task,
        "get_task": _get_task,
        "update_task": _update_task,
        "delete_task": _delete_task,
        "toggle_task_complete": _toggle_task_complete,
    }

    return TOOL_SCHEMAS, executors
