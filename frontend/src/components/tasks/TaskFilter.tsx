/**
 * TaskFilter — three-button toggle group: All | Active | Completed
 *
 * "Active" = incomplete tasks (?status=pending on backend)
 * "Completed" = complete tasks (?status=completed on backend)
 *
 * Props:
 *  - value:    current filter
 *  - onChange: called when user selects a different filter
 *
 * Ref: specs/001-tasks-api/spec.md (status filter)
 *      frontend/CLAUDE.md § Tailwind Rules
 *      tasks.md T050
 */
"use client";

import type { FilterValue } from "@/types/task";

interface TaskFilterProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}

const OPTIONS: { label: string; value: FilterValue }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
];

export function TaskFilter({ value, onChange }: TaskFilterProps) {
  return (
    <div
      className="flex w-full rounded-lg border border-gray-200 bg-gray-100 p-1"
      role="group"
      aria-label="Filter tasks"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={[
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            "min-h-[36px]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
            value === opt.value
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
