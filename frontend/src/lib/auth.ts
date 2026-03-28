/**
 * Better Auth server instance.
 *
 * Imported by:
 *   - src/app/api/auth/[...all]/route.ts  (handler)
 *   - Server components / middleware needing getSession()
 *
 * NEVER import from better-auth directly in components — import from this file.
 * Ref: frontend/CLAUDE.md § Better Auth Rules
 */
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";

export const auth = betterAuth({
  /**
   * Shared secret with FastAPI backend.
   * Must match BETTER_AUTH_SECRET in backend/.env
   */
  secret: process.env.BETTER_AUTH_SECRET!,

  /**
   * Base URL for Better Auth callbacks (sign-in, sign-out, etc.)
   * In dev: http://localhost:3000
   */
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

  /**
   * PostgreSQL via Neon.
   * Better Auth manages its own session/account/user tables.
   */
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }),

  /**
   * Email + password authentication only.
   * Social providers are out of scope for Phase II.
   */
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  plugins: [
    /**
     * Issues a signed JWT on sign-in.
     * FastAPI's get_current_user_id() dep verifies this JWT with BETTER_AUTH_SECRET.
     * Algorithm: HS256 (default) — matches python-jose decode in deps.py
     */
    jwt(),

    /**
     * Required for Next.js App Router: handles cookies via the `headers` API.
     * Must be the last plugin.
     */
    nextCookies(),
  ],
});
