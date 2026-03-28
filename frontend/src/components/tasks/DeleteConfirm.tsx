/**
 * DeleteConfirm — modal dialog asking user to confirm task deletion.
 *
 * Props:
 *  - isOpen:     controls visibility
 *  - taskTitle:  shown in the confirmation message
 *  - onConfirm:  called when user clicks "Delete"
 *  - onCancel:   called when user clicks "Cancel" or presses Escape
 *
 * Traps focus inside the modal and closes on Escape.
 *
 * Ref: frontend/CLAUDE.md § Tailwind Rules
 *      tasks.md T045
 */
"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";

interface DeleteConfirmProps {
  isOpen: boolean;
  taskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirm({
  isOpen,
  taskTitle,
  onConfirm,
  onCancel,
}: DeleteConfirmProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus Cancel button when modal opens
  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      {/* Dialog panel */}
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3
          id="delete-dialog-title"
          className="mb-2 text-base font-semibold text-gray-900"
        >
          Delete task?
        </h3>

        <p className="mb-6 text-sm text-gray-600">
          &ldquo;{taskTitle}&rdquo; will be permanently deleted. This cannot be
          undone.
        </p>

        <div className="flex gap-3">
          <Button
            ref={cancelRef}
            variant="secondary"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1">
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
