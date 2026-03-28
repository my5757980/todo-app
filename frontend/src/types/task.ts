/**
 * TypeScript types mirroring the FastAPI Pydantic schemas.
 * Must stay in sync with backend/app/schemas/task.py
 *
 * Ref: specs/001-tasks-api/spec.md
 *      backend/app/schemas/task.py
 */

export interface TaskResponse {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskListResponse {
  tasks: TaskResponse[];
  total: number;
}

export interface TaskCreatePayload {
  title: string;
  description?: string;
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string;
}

/** Maps to backend StatusFilter Literal["pending", "completed"] */
export type StatusFilter = "pending" | "completed";

/** UI-level filter state — "all" means no ?status query param */
export type FilterValue = "all" | "active" | "completed";
