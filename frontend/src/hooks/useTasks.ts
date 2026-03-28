/**
 * useTasks — all task data and mutations.
 *
 * Responsibilities:
 *  - Fetch the task list (with optional status filter)
 *  - Optimistically update local state on mutations
 *  - Expose: tasks, isLoading, error, filter, setFilter,
 *            createTask, updateTask, deleteTask, toggleTask, refetch
 *
 * userId is always sourced from the Better Auth session (session.user.id).
 * All API calls go through @/lib/api-client — never raw fetch.
 *
 * Ref: frontend/CLAUDE.md § API Client Rules
 *      tasks.md T037, T041, T046, T051, T059
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api-client";
import type {
  FilterValue,
  TaskCreatePayload,
  TaskListResponse,
  TaskResponse,
  TaskUpdatePayload,
} from "@/types/task";

// ─── Public interface ──────────────────────────────────────────────────────

export interface UseTasksReturn {
  tasks: TaskResponse[];
  isLoading: boolean;
  error: string | null;
  filter: FilterValue;
  setFilter: (f: FilterValue) => void;
  createTask: (data: TaskCreatePayload) => Promise<void>;
  updateTask: (taskId: string, data: TaskUpdatePayload) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

// ─── Helper: map UI filter → backend ?status param ─────────────────────────

function toStatusParam(f: FilterValue): string {
  if (f === "active") return "?status=pending";
  if (f === "completed") return "?status=completed";
  return "";
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useTasks(): UseTasksReturn {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchTasks = useCallback(
    async (currentFilter: FilterValue = filter) => {
      if (!userId) return;
      setIsLoading(true);
      setError(null);
      try {
        const statusParam = toStatusParam(currentFilter);
        const data = await apiGet<TaskListResponse>(
          `/api/${userId}/tasks${statusParam}`
        );
        setTasks(data.tasks);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tasks.");
      } finally {
        setIsLoading(false);
      }
    },
    [userId, filter]
  );

  // Re-fetch when userId or filter changes
  useEffect(() => {
    if (userId) {
      fetchTasks(filter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, filter]);

  // ── Filter change ────────────────────────────────────────────────────────

  function handleSetFilter(f: FilterValue) {
    setFilter(f);
    // fetchTasks triggered by useEffect above
  }

  // ── Create ───────────────────────────────────────────────────────────────

  async function createTask(data: TaskCreatePayload): Promise<void> {
    if (!userId) return;
    const newTask = await apiPost<TaskResponse>(`/api/${userId}/tasks`, data);
    // Prepend (newest-first ordering matches backend)
    setTasks((prev) => [newTask, ...prev]);
  }

  // ── Update ───────────────────────────────────────────────────────────────

  async function updateTask(
    taskId: string,
    data: TaskUpdatePayload
  ): Promise<void> {
    if (!userId) return;
    const updated = await apiPut<TaskResponse>(
      `/api/${userId}/tasks/${taskId}`,
      data
    );
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? updated : t))
    );
  }

  // ── Toggle complete ──────────────────────────────────────────────────────

  async function toggleTask(taskId: string): Promise<void> {
    if (!userId) return;
    const updated = await apiPatch<TaskResponse>(
      `/api/${userId}/tasks/${taskId}/complete`
    );
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? updated : t))
    );
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  async function deleteTask(taskId: string): Promise<void> {
    if (!userId) return;
    await apiDelete<void>(`/api/${userId}/tasks/${taskId}`);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  return {
    tasks,
    isLoading,
    error,
    filter,
    setFilter: handleSetFilter,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    refetch: () => fetchTasks(filter),
  };
}
