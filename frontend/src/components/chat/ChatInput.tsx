/**
 * ChatInput — textarea + send button for the chat interface.
 *
 * Behaviours:
 *  - Enter key submits the message
 *  - Shift+Enter inserts a newline
 *  - Auto-grows up to 4 lines (max-h-[96px])
 *  - Disabled with spinner while isLoading
 *  - Clears automatically after submit via controlled value
 *
 * Ref: specs/003-ai-todo-chatbot/tasks.md T016
 *      frontend/CLAUDE.md § Tailwind Rules (min touch target 44px)
 */
"use client";

import { FormEvent, KeyboardEvent, useRef } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  disabled = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!value.trim() || isLoading || disabled) return;
      // Trigger the wrapping form's submit handler
      const form = textareaRef.current?.closest("form");
      form?.requestSubmit();
    }
  }

  const isDisabled = isLoading || disabled;

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-end gap-2 border-t border-gray-200 bg-white px-3 py-3"
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        placeholder={isLoading ? "AI is responding…" : "Ask about your tasks…"}
        className={[
          // Layout
          "flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2.5",
          // Typography
          "text-sm text-gray-900 placeholder:text-gray-400",
          // Max-height ~4 lines
          "max-h-[96px] overflow-y-auto",
          // Focus
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          // Disabled
          isDisabled ? "cursor-not-allowed bg-gray-50 opacity-60" : "bg-white",
        ].join(" ")}
        aria-label="Chat message input"
      />

      {/* Send button */}
      <button
        type="submit"
        disabled={isDisabled || !value.trim()}
        className={[
          // Size + shape
          "flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl",
          // Color
          "bg-blue-600 text-white",
          // Focus
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          // Disabled
          isDisabled || !value.trim()
            ? "cursor-not-allowed opacity-40"
            : "hover:bg-blue-700 cursor-pointer",
        ].join(" ")}
        aria-label="Send message"
      >
        {isLoading ? (
          // Spinner
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          // Send arrow
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        )}
      </button>
    </form>
  );
}
