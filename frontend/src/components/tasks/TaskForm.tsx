/**
 * TaskForm — handles both create and edit modes.
 *
 * Create mode (no `task` prop):
 *  - Empty form, "Add task" button, calls createTask() on submit, resets on success
 *
 * Edit mode (`task` prop provided):
 *  - Pre-filled title + description, "Save" button
 *  - Calls updateTask() on submit, calls onSuccess(updated) / onCancel() callbacks
 *
 * Client-side validation:
 *  - title: required, 1–200 chars (whitespace-only rejected)
 *  - description: optional, max 1000 chars
 *
 * Ref: specs/001-tasks-crud/spec.md FR-001, FR-006
 *      frontend/CLAUDE.md § Component Rules
 *      tasks.md T036, T058
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import type { TaskResponse, TaskCreatePayload, TaskUpdatePayload } from "@/types/task";

// ─── Props ─────────────────────────────────────────────────────────────────

interface CreateModeProps {
  mode?: "create";
  task?: undefined;
  onCreate: (data: TaskCreatePayload) => Promise<void>;
  onUpdate?: undefined;
  onSuccess?: undefined;
  onCancel?: undefined;
}

interface EditModeProps {
  mode: "edit";
  task: TaskResponse;
  onCreate?: undefined;
  onUpdate: (taskId: string, data: TaskUpdatePayload) => Promise<void>;
  onSuccess?: () => void;
  onCancel: () => void;
}

type TaskFormProps = CreateModeProps | EditModeProps;

// ─── Component ─────────────────────────────────────────────────────────────

export function TaskForm(props: TaskFormProps) {
  const isEdit = props.mode === "edit";

  const [title, setTitle] = useState(isEdit ? props.task.title : "");
  const [description, setDescription] = useState(
    isEdit ? (props.task.description ?? "") : ""
  );
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descError, setDescError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    let valid = true;
    setTitleError(null);
    setDescError(null);

    if (title.trim().length === 0) {
      setTitleError("Title is required.");
      valid = false;
    } else if (title.trim().length > 200) {
      setTitleError("Title must be 200 characters or fewer.");
      valid = false;
    }

    if (description.length > 1000) {
      setDescError("Description must be 1000 characters or fewer.");
      valid = false;
    }

    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setGeneralError(null);

    try {
      if (isEdit) {
        await props.onUpdate(props.task.id, {
          title: title.trim(),
          description: description.trim() || undefined,
        });
        props.onSuccess?.();
      } else {
        await props.onCreate({
          title: title.trim(),
          description: description.trim() || undefined,
        });
        // Reset form on successful create
        setTitle("");
        setDescription("");
      }
    } catch (err) {
      setGeneralError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <Input
        label={isEdit ? "Title" : "New task title"}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={titleError ?? undefined}
        maxLength={200}
        required
        disabled={loading}
        placeholder="What needs to be done?"
      />

      <Textarea
        label="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={descError ?? undefined}
        maxLength={1000}
        disabled={loading}
        placeholder="Add more detail…"
      />

      {generalError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {generalError}
        </p>
      )}

      <div className="flex gap-2">
        {isEdit && (
          <Button
            type="button"
            variant="secondary"
            onClick={props.onCancel}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          loading={loading}
          className={isEdit ? "flex-1" : "w-full"}
        >
          {isEdit ? "Save changes" : "Add task"}
        </Button>
      </div>
    </form>
  );
}
