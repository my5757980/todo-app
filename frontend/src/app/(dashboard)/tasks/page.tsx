/**
 * /tasks — main task dashboard page.
 *
 * Client component: uses useTasks() hook for data + mutations.
 *
 * Layout (top → bottom):
 *  1. TaskForm (create new task)
 *  2. TaskFilter (All / Active / Completed)
 *  3. Task count summary
 *  4. TaskList (cards or empty/loading/error state)
 *
 * Ref: specs/001-tasks-crud/spec.md
 *      frontend/CLAUDE.md
 *      tasks.md T038, T052
 */
"use client";

import { useTasks } from "@/hooks/useTasks";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskFilter } from "@/components/tasks/TaskFilter";
import { TaskList } from "@/components/tasks/TaskList";

export default function TasksPage() {
  const {
    tasks,
    isLoading,
    error,
    filter,
    setFilter,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    refetch,
  } = useTasks();

  const pendingCount = tasks.filter((t) => !t.is_complete).length;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Create form ── */}
      <section aria-label="Add a new task">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            New Task
          </h2>
          <TaskForm mode="create" onCreate={createTask} />
        </div>
      </section>

      {/* ── Filter + list ── */}
      <section aria-label="Task list">
        {/* Filter toggle */}
        <TaskFilter value={filter} onChange={setFilter} />

        {/* Count summary */}
        {!isLoading && !error && (
          <p className="mt-3 mb-2 text-xs text-gray-400">
            {filter === "all"
              ? `${tasks.length} task${tasks.length !== 1 ? "s" : ""} · ${pendingCount} remaining`
              : `${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
          </p>
        )}

        {/* Task cards */}
        <div className="mt-1">
          <TaskList
            tasks={tasks}
            isLoading={isLoading}
            error={error}
            filter={filter}
            onRetry={refetch}
            onToggle={toggleTask}
            onUpdate={updateTask}
            onDelete={deleteTask}
          />
        </div>
      </section>
    </div>
  );
}
