/**
 * HTTP client for the FastAPI backend.
 *
 * Responsibilities:
 *  1. Retrieve the signed JWT from Better Auth's jwtClient plugin
 *  2. Attach Authorization: Bearer <jwt> to every request
 *  3. On 401 → sign out + redirect to /login?expired=1
 *
 * Usage:
 *   import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api-client";
 *
 * NEVER call fetch() directly with manual Authorization headers in components.
 * Ref: frontend/CLAUDE.md § API Client Rules
 *      specs/001-tasks-api/spec.md FR-018
 */
"use client";

import { signOut } from "@/lib/auth-client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve the Better Auth session token.
 * Sent as Bearer token; backend verifies against the session table.
 * Returns null if the user has no active session.
 */
async function getJwt(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/get-session", {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.session?.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Handle 401: sign out and redirect to login with `?expired=1` flag.
 * The login page shows "Session expired, please sign in again" when this flag is set.
 */
async function handleUnauthorized(): Promise<never> {
  await signOut();
  window.location.href = "/login?expired=1";
  // Throw so callers that await don't continue
  throw new Error("Session expired — redirecting to login");
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

/**
 * Make an authenticated request to the FastAPI backend.
 *
 * @param path    URL path starting with "/" — appended to NEXT_PUBLIC_API_BASE_URL
 * @param options Standard fetch RequestInit (method, body, headers override, etc.)
 * @returns       Parsed JSON response body, or undefined for 204 No Content
 * @throws        On 401: signs out and redirects (never resolves)
 * @throws        On 4xx/5xx: Error with `detail` from FastAPI error body
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getJwt();

  if (!token) {
    return handleUnauthorized();
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    return handleUnauthorized();
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `Request failed with status ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Typed wrappers
// ---------------------------------------------------------------------------

export const apiGet = <T>(path: string): Promise<T> =>
  apiRequest<T>(path, { method: "GET" });

export const apiPost = <T>(path: string, body: unknown): Promise<T> =>
  apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const apiPut = <T>(path: string, body: unknown): Promise<T> =>
  apiRequest<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });

export const apiPatch = <T>(path: string): Promise<T> =>
  apiRequest<T>(path, { method: "PATCH" });

export const apiDelete = <T>(path: string): Promise<T> =>
  apiRequest<T>(path, { method: "DELETE" });
