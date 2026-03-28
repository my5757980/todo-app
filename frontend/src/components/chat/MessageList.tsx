/**
 * MessageList — scrollable container for chat messages.
 *
 * Behaviours:
 *  - Auto-scrolls to the bottom whenever messages change
 *  - Shows ToolCallBubble("Thinking…") while isLoading and last msg is user
 *  - Shows empty state when messages array is empty
 *
 * Ref: specs/003-ai-todo-chatbot/tasks.md T020, T025
 *      specs/003-ai-todo-chatbot/spec.md FR-002
 */
"use client";

import { useEffect, useRef } from "react";
import type { Message } from "ai";
import { MessageBubble } from "./MessageBubble";
import { ToolCallBubble } from "./ToolCallBubble";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on every new message or loading state change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Show thinking indicator when loading and last message is from user
  const lastMsg = messages[messages.length - 1];
  const showThinking = isLoading && lastMsg?.role === "user";

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="rounded-full bg-blue-50 p-4">
          <svg
            className="h-8 w-8 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">
            No messages yet
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Ask me about your tasks — I can create, update, and manage them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-1 py-2">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* "AI is thinking…" indicator (T025) */}
      {showThinking && <ToolCallBubble toolName="Thinking…" />}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
