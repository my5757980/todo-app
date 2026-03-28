/**
 * Better Auth API route handler.
 *
 * Handles all auth endpoints:
 *   GET  /api/auth/session      — return current session
 *   POST /api/auth/sign-in/email
 *   POST /api/auth/sign-up/email
 *   POST /api/auth/sign-out
 *   ...all other Better Auth endpoints
 *
 * The catch-all [...all] segment means Next.js routes every
 * /api/auth/* request here.
 *
 * Ref: frontend/CLAUDE.md § Better Auth Rules
 *      specs/001-auth-jwt/spec.md
 */
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
