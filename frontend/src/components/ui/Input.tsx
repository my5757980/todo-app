/**
 * Input — labeled text input with inline error message support.
 *
 * Ref: frontend/CLAUDE.md § Tailwind Rules
 *      tasks.md T027
 */
"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

// ─── Text input ────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, className = "", ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <input
        id={inputId}
        {...props}
        className={[
          "rounded-md border px-3 py-2 text-sm shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60",
          error ? "border-red-500" : "border-gray-300",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Textarea ──────────────────────────────────────────────────────────────

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  id,
  className = "",
  ...props
}: TextareaProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <textarea
        id={inputId}
        rows={3}
        {...props}
        className={[
          "rounded-md border px-3 py-2 text-sm shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60",
          "resize-y",
          error ? "border-red-500" : "border-gray-300",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
