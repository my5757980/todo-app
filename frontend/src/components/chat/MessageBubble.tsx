/**
 * MessageBubble — renders a single chat message.
 *
 * Variants:
 *  - user     : right-aligned, blue background
 *  - assistant: left-aligned, gray background; may include tool invocations
 *
 * For assistant messages with toolInvocations (from useChat streaming),
 * renders a ToolCallBubble per invocation before the text content.
 *
 * Ref: specs/003-ai-todo-chatbot/tasks.md T018
 *      frontend/CLAUDE.md § Tailwind Rules
 */
"use client";

import type { Message } from "ai";
import { ToolCallBubble } from "./ToolCallBubble";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex w-full flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
    >
      {/* Tool invocation indicators (assistant only, during/after streaming) */}
      {!isUser &&
        message.toolInvocations?.map((inv) => (
          <ToolCallBubble key={inv.toolCallId} toolName={inv.toolName} />
        ))}

      {/* Message bubble (only shown if there is text content) */}
      {message.content && (
        <div
          className={[
            "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-br-sm bg-blue-600 text-white"
              : "rounded-bl-sm bg-white border border-gray-200 text-gray-800 shadow-sm",
          ].join(" ")}
        >
          {/* Preserve newlines */}
          {message.content.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i < message.content.split("\n").length - 1 && <br />}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
