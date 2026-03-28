/**
 * ChatWindow — root chat component.
 *
 * Owns the useChat hook. Assembles:
 *  - Top bar: "AI Assistant" title + "Clear chat" button
 *  - MessageList (flex-grow, scrollable)
 *  - ChatInput (pinned at bottom)
 *
 * Receives `jwt` as a prop (obtained async in the page before mounting).
 * This ensures the Authorization header is available when useChat initialises.
 *
 * Clear chat flow:
 *  1. DELETE /api/{userId}/chat/history via apiDelete
 *  2. setMessages([]) to reset useChat's local state
 *
 * Ref: specs/003-ai-todo-chatbot/tasks.md T021, T023
 *      specs/003-ai-todo-chatbot/spec.md US8, FR-003
 */
"use client";

import { useState } from "react";
import { useChat } from "ai/react";
import type { Message } from "ai";
import { apiDelete } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

interface ChatWindowProps {
  userId: string;
  jwt: string;
  initialMessages: Message[];
}

export function ChatWindow({ userId, jwt, initialMessages }: ChatWindowProps) {
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
    error,
  } = useChat({
    api: "/api/chat",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: { userId },
    initialMessages,
  });

  async function handleClearChat() {
    setIsClearing(true);
    setClearError(null);
    try {
      await apiDelete(`/api/${userId}/chat/history`);
      setMessages([]);
    } catch (err) {
      setClearError(
        err instanceof Error ? err.message : "Failed to clear chat"
      );
    } finally {
      setIsClearing(false);
    }
  }

  // Wrap handleInputChange to match ChatInput's (value: string) signature
  function onInputChange(value: string) {
    handleInputChange({
      target: { value },
    } as React.ChangeEvent<HTMLTextAreaElement>);
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-gray-50 shadow-sm overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-gray-900">
            AI Assistant
          </span>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Grok
          </span>
        </div>

        <Button
          variant="secondary"
          onClick={handleClearChat}
          loading={isClearing}
          disabled={isLoading || messages.length === 0}
          className="text-xs px-3 py-1.5 min-h-[32px]"
        >
          Clear chat
        </Button>
      </div>

      {/* ── Error banners ── */}
      {clearError && (
        <div className="mx-4 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {clearError}
        </div>
      )}
      {error && (
        <div className="mx-4 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          AI service unavailable. Please try again.
        </div>
      )}

      {/* ── Message list ── */}
      <div className="flex flex-1 flex-col overflow-hidden px-4 pt-4">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      {/* ── Input ── */}
      <ChatInput
        value={input}
        onChange={onInputChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
