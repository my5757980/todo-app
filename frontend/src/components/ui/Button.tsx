/**
 * Button — reusable button with primary / secondary / danger variants.
 *
 * Ref: frontend/CLAUDE.md § Tailwind Rules
 *      tasks.md T027
 */
"use client";

import { ButtonHTMLAttributes, ReactNode, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
  secondary:
    "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-400",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    loading = false,
    disabled,
    children,
    className = "",
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      {...props}
      disabled={isDisabled}
      className={[
        // Base
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
        // Min touch target
        "min-h-[44px] min-w-[44px]",
        // Focus ring
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        // Disabled / loading
        isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        // Variant
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? (
        <>
          <svg
            className="-ml-1 mr-2 h-4 w-4 animate-spin"
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
          Loading…
        </>
      ) : (
        children
      )}
    </button>
  );
});
