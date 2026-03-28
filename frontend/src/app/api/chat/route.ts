/**
 * Next.js proxy — /api/chat
 *
 * Bridges useChat (Vercel AI SDK) on the frontend with FastAPI's streaming
 * chat endpoint. Responsibilities:
 *  1. Validate the session server-side (auth.api.getSession via cookies)
 *  2. Extract the last user message from useChat's messages array
 *  3. Forward to FastAPI POST /api/{userId}/chat with Authorization header
 *  4. Pipe the Vercel AI SDK data stream back to the browser
 *
 * Security:
 *  - userId comes from the server-side session, NOT from the request body
 *  - Authorization header (JWT) is forwarded as-is from the client
 *    (the JWT was issued by Better Auth and verified by FastAPI's dep)
 *  - No OPENAI/GROK keys exist in this file — all AI logic is in FastAPI
 *
 * Ref: specs/003-ai-todo-chatbot/plan.md § Decision 2, § Next.js Proxy Route
 *      frontend/CLAUDE.md § API Client Rules
 */
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function POST(req: Request): Promise<Response> {
  // ── 1. Validate session server-side ──────────────────────────────────────
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // ── 2. Extract JWT from the incoming Authorization header ─────────────────
  // The client (ChatWindow) sets this from authClient.jwt.getToken()
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized: missing bearer token", { status: 401 });
  }

  // ── 3. Parse useChat request body ─────────────────────────────────────────
  // useChat sends: { messages: Message[], ...body (userId etc.) }
  let body: { messages?: { role: string; content: string }[]; userId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request: invalid JSON", { status: 400 });
  }

  const messages = body.messages ?? [];
  // Find the last user message (useChat appends it before sending)
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMsg?.content?.trim()) {
    return new Response("Bad Request: no user message found", { status: 400 });
  }

  // userId ALWAYS from session — never trust the request body
  const userId = session.user.id;

  // ── 4. Forward to FastAPI streaming endpoint ──────────────────────────────
  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/api/${userId}/chat/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader, // JWT originally issued by Better Auth
      },
      body: JSON.stringify({ message: lastUserMsg.content }),
    });
  } catch (err) {
    console.error("[/api/chat proxy] FastAPI unreachable:", err);
    return new Response("Service unavailable", { status: 503 });
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return new Response(text || "Upstream error", { status: upstream.status });
  }

  // ── 5. Pipe SSE stream back with correct Vercel AI SDK headers ────────────
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Vercel-AI-Data-Stream": "v1",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
