/**
 * /chat — AI assistant page.
 *
 * Client component. On mount:
 *  1. Gets JWT from authClient.jwt.getToken() (needed for useChat headers)
 *  2. Loads conversation history from GET /api/{userId}/chat/history
 *  3. Renders ChatWindow once both are ready
 *
 * Protected by:
 *  - middleware.ts (cookie check)
 *  - (dashboard)/layout.tsx (session check)
 *
 * Ref: specs/003-ai-todo-chatbot/spec.md US1
 *      specs/003-ai-todo-chatbot/tasks.md T017, T024
 */
"use client";

import { useEffect, useState } from "react";
import type { Message } from "ai";
import { useSession } from "@/lib/auth-client";
import { apiGet } from "@/lib/api-client";
import { ChatWindow } from "@/components/chat/ChatWindow";

interface HistoryResponse {
  conversation_id: string;
  messages: {
    id: string;
    role: string;
    content: string;
    tool_name: string | null;
    created_at: string;
  }[];
}

type PageState = "loading" | "ready" | "error";

export default function ChatPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [jwt, setJwt] = useState<string>("");
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!userId) return;

    async function init() {
      setPageState("loading");
      try {
        // Get session token + history in parallel
        const [sessionRes, history] = await Promise.all([
          fetch("/api/auth/get-session", { credentials: "include" }),
          apiGet<HistoryResponse>(`/api/${userId}/chat/history`),
        ]);

        const sessionData = await sessionRes.json();
        const token = sessionData?.session?.token ?? "";
        if (!token) throw new Error("Could not retrieve authentication token");

        // Map DB messages → Vercel AI SDK Message format
        // Only user/assistant roles — tool_call/tool_result are display-only
        const msgs: Message[] = history.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
          }));

        setJwt(token);
        setInitialMessages(msgs);
        setPageState("ready");
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "Failed to load chat"
        );
        setPageState("error");
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Loading state ──
  if (pageState === "loading" || !userId) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <svg
            className="h-6 w-6 animate-spin"
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
          <p className="text-sm">Loading chat…</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (pageState === "error") {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-center">
          <p className="text-sm font-medium text-red-700">
            Failed to load chat
          </p>
          <p className="mt-1 text-xs text-red-500">{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-xs text-red-600 underline hover:text-red-800"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }

  // ── Ready ──
  return (
    <div className="h-[calc(100vh-120px)]">
      <ChatWindow
        userId={userId}
        jwt={jwt}
        initialMessages={initialMessages}
      />
    </div>
  );
}
