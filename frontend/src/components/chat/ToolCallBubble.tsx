/**
 * ToolCallBubble — visual indicator for AI tool calls.
 *
 * Shown when the AI is executing a task tool (FR-002).
 * Renders a subtle gray pill: "🔧 tool_name…"
 *
 * Used in:
 *  - MessageList: for in-progress tool calls during streaming
 *  - MessageList: for "AI is thinking…" while isLoading
 *
 * Ref: specs/003-ai-todo-chatbot/spec.md FR-002
 *      specs/003-ai-todo-chatbot/tasks.md T019
 */
"use client";

interface ToolCallBubbleProps {
  toolName: string;
}

const TOOL_LABELS: Record<string, string> = {
  list_tasks: "Listing your tasks",
  create_task: "Creating task",
  get_task: "Looking up task",
  update_task: "Updating task",
  delete_task: "Deleting task",
  toggle_task_complete: "Updating task status",
  "Thinking…": "Thinking",
};

export function ToolCallBubble({ toolName }: ToolCallBubbleProps) {
  const label = TOOL_LABELS[toolName] ?? toolName;

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
        {/* Animated spinner dot */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gray-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-gray-400" />
        </span>
        <span>🔧 {label}…</span>
      </div>
    </div>
  );
}
