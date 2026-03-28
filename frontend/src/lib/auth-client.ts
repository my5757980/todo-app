/**
 * Better Auth browser/React client.
 *
 * Provides: signIn, signUp, signOut, useSession, getSession
 *
 * Use in client components only (files with "use client").
 * Server components should call auth.api.getSession() from @/lib/auth.
 *
 * Ref: frontend/CLAUDE.md § Better Auth Rules
 */
import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000",
  plugins: [
    /**
     * Client-side companion to the server jwt() plugin.
     * Exposes getJwt() to retrieve the signed JWT for API calls.
     */
    jwtClient(),
  ],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
