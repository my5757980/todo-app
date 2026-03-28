/**
 * TaskCard — displays a single task with full action support.
 *
 * Features:
 *  - Completion toggle (checkbox) with strikethrough title when complete
 *  - Inline edit form (TaskForm edit mode) toggled by pencil icon
 *  - Delete confirmation modal (DeleteConfirm)
 *
 * Action callbacks come from the parent (tasks page) via useTasks.
 *
 * Ref: specs/001-tasks-crud/spec.md
 *      frontend/CLAUDE.md § Component Rules, Tailwind Rules
 *      tasks.md T034, T042, T047, T060
 */
"use client";

import { useState } from "react";
import type { TaskResponse, TaskUpdatePayload } from "@/types/task";
import { TaskForm } from "./TaskForm";
import { DeleteConfirm } from "./DeleteConfirm";

// ─── Icons ─────────────────────────────────────────────────────────────────
// Inline SVG — no icon library dependency

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: TaskResponse;
  onToggle: (taskId: string) => Promise<void>;
  onUpdate: (taskId: string, data: TaskUpdatePayload) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function TaskCard({ task, onToggle, onUpdate, onDelete }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  async function handleToggle() {
    setIsToggling(true);
    try {
      await onToggle(task.id);
    } finally {
      setIsToggling(false);
    }
  }

  async function handleDelete() {
    await onDelete(task.id);
    setIsConfirmingDelete(false);
  }

  // ── Edit mode ────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
        <TaskForm
          mode="edit"
          task={task}
          onUpdate={onUpdate}
          onSuccess={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  // ── Display mode ─────────────────────────────────────────────────────────
  return (
    <>
      <div className="group flex gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
        {/* Toggle checkbox */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={isToggling}
          aria-label={task.is_complete ? "Mark incomplete" : "Mark complete"}
          className={[
            "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            "min-h-[20px] min-w-[20px]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
            isToggling ? "opacity-50" : "",
            task.is_complete
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-gray-300 hover:border-blue-400",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {task.is_complete && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3 w-3"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p
            className={[
              "text-sm font-medium leading-snug",
              task.is_complete ? "text-gray-400 line-through" : "text-gray-900",
            ].join(" ")}
          >
            {task.title}
          </p>

          {task.description && (
            <p
              className={[
                "mt-1 text-xs leading-relaxed",
                task.is_complete ? "text-gray-300" : "text-gray-500",
              ].join(" ")}
            >
              {task.description}
            </p>
          )}
        </div>

        {/* Action buttons — visible on hover / focus-within */}
        <div
          className={[
            "flex flex-shrink-0 items-start gap-1",
            "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
          ].join(" ")}
        >
          {/* Edit */}
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label="Edit task"
            className={[
              "rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600",
              "min-h-[32px] min-w-[32px] flex items-center justify-center",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            ].join(" ")}
          >
            <PencilIcon />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            aria-label="Delete task"
            className={[
              "rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600",
              "min-h-[32px] min-w-[32px] flex items-center justify-center",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500",
            ].join(" ")}
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <DeleteConfirm
        isOpen={isConfirmingDelete}
        taskTitle={task.title}
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmingDelete(false)}
      />
    </>
  );
}
