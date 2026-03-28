/**
 * TaskList — renders the list of TaskCards or appropriate empty/loading states.
 *
 * States:
 *  - isLoading: shows 3 skeleton placeholder cards
 *  - error:     shows error banner with retry button
 *  - empty:     shows "No todos yet" message (context-aware for active filter)
 *  - default:   maps tasks → TaskCard
 *
 * Ref: frontend/CLAUDE.md § Component Rules
 *      tasks.md T035, T062 (loading + error states)
 */
"use client";

import type { TaskResponse, TaskUpdatePayload, FilterValue } from "@/types/task";
import { TaskCard } from "./TaskCard";

// ─── Skeleton loader ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm animate-pulse">
      <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-gray-200" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/4 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-100" />
      </div>
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface TaskListProps {
  tasks: TaskResponse[];
  isLoading: boolean;
  error: string | null;
  filter: FilterValue;
  onRetry: () => void;
  onToggle: (taskId: string) => Promise<void>;
  onUpdate: (taskId: string, data: TaskUpdatePayload) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

// ─── Empty state messages ────────────────────────────────────────────────────

function emptyMessage(filter: FilterValue): string {
  if (filter === "active") return "No active tasks — everything is done!";
  if (filter === "completed") return "No completed tasks yet.";
  return "No todos yet — add your first one above!";
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TaskList({
  tasks,
  isLoading,
  error,
  filter,
  onRetry,
  onToggle,
  onUpdate,
  onDelete,
}: TaskListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading tasks">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="mb-3 text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-red-700 underline hover:text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          Try again
        </button>
      </div>
    );
  }

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center">
        <p className="text-sm text-gray-400">{emptyMessage(filter)}</p>
      </div>
    );
  }

  // Task list
  return (
    <div className="flex flex-col gap-3" role="list" aria-label="Task list">
      {tasks.map((task) => (
        <div key={task.id} role="listitem">
          <TaskCard
            task={task}
            onToggle={onToggle}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  );
}
