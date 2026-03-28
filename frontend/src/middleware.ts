/**
 * Next.js middleware — route protection.
 *
 * Runs on the Edge runtime (before page render) on every matched request.
 * Uses a lightweight cookie-presence check (edge-compatible; no DB call).
 * The (dashboard)/layout.tsx does a secondary server-side auth validation
 * via auth.api.getSession() as a proper security backstop.
 *
 * Rules:
 *  - /tasks/* without session cookie → redirect to /login
 *  - /login or /signup with session cookie → redirect to /tasks
 *
 * Better Auth sets "better-auth.session_token" (http) or
 * "__Secure-better-auth.session_token" (https) on sign-in.
 *
 * Ref: frontend/CLAUDE.md § App Router Rules
 *      specs/001-auth-jwt/spec.md FR-003 (protected routes)
 *      tasks.md T025
 */
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = ["/tasks", "/chat"];
const AUTH_PATHS = ["/login", "/signup"];

/** Better Auth session cookie names (http dev + https prod) */
function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token")
  );
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const authenticated = hasSessionCookie(request);

  // Dashboard routes: require session
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (isProtected && !authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Auth pages: redirect already-authenticated users to dashboard
  const isAuthPage = AUTH_PATHS.some((p) => pathname === p);
  if (isAuthPage && authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/tasks";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Match all paths EXCEPT:
   *  - /api/* (Better Auth handler + other API routes)
   *  - /_next/* (Next.js internals)
   *  - /favicon.ico, /robots.txt, /sitemap.xml, static assets
   */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};
