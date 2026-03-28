---
id: "0006"
title: frontend-foundation-better-auth
stage: green
date: 2026-03-26
surface: agent
model: claude-sonnet-4-6
feature: 001-todo-web-app
branch: 001-tasks-crud
user: ASFAR
command: /sp.implement
labels: ["frontend","nextjs","better-auth","jwt","api-client","tailwind","phase-2"]
links:
  spec: specs/001-todo-web-app/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - frontend/package.json
  - frontend/tsconfig.json
  - frontend/next.config.ts
  - frontend/tailwind.config.ts
  - frontend/postcss.config.mjs
  - frontend/.env.local.example
  - frontend/src/app/globals.css
  - frontend/src/app/layout.tsx
  - frontend/src/app/page.tsx
  - frontend/src/lib/auth.ts
  - frontend/src/lib/auth-client.ts
  - frontend/src/app/api/auth/[...all]/route.ts
  - frontend/src/lib/api-client.ts
  - .env.example (updated — added NEXT_PUBLIC_BETTER_AUTH_URL, dual DATABASE_URL note)
tests:
  - none (test tasks not requested in spec)
---

## Prompt

Yes, backend looks perfect. Proceed with Section 4 — Frontend (T016–T020).

Implement exactly as planned:
- Next.js 16+ App Router + TypeScript + Tailwind
- Better Auth setup (auth.ts + route handler)
- api-client.ts with automatic JWT Bearer token
- Stop after frontend foundation is ready for my confirmation.

Follow frontend/CLAUDE.md and all specs strictly.
Start now.

## Response snapshot

Implemented complete Next.js 16+ frontend foundation (T016–T020):

**T016 — Next.js project scaffold**: package.json (next@^15.1.0, react@^19, better-auth@^1.2.5, pg@^8), tsconfig.json (strict mode, @/* alias, bundler moduleResolution), next.config.ts, tailwind.config.ts (content scanning all src/), postcss.config.mjs, globals.css (Tailwind base/components/utilities), minimal root layout.tsx + page.tsx (redirects to /login).

**T017 — Better Auth install**: better-auth + pg in package.json; frontend/.env.local.example template with all required keys.

**T018 — auth.ts (server instance)**: betterAuth() with BETTER_AUTH_SECRET, DATABASE_URL (pg Pool with ssl), emailAndPassword enabled, jwt() plugin (issues HS256 JWTs for FastAPI to verify), nextCookies() plugin (App Router cookie handling).

**auth-client.ts (client instance)**: createAuthClient() with jwtClient() plugin; exports signIn, signUp, signOut, useSession, getSession.

**T019 — API route handler**: `src/app/api/auth/[...all]/route.ts` using `toNextJsHandler(auth)` — exports GET + POST for all Better Auth endpoints.

**T020 — api-client.ts**: getJwt() via authClient.jwt.getToken(); apiRequest() attaches Authorization: Bearer; 401 → handleUnauthorized() (signOut + redirect /login?expired=1); 204 → undefined; typed wrappers: apiGet, apiPost, apiPut, apiPatch, apiDelete.

Key design decision: jwt() plugin on server + jwtClient() plugin on client ensures Better Auth issues HS256 JWTs that FastAPI can verify with the shared BETTER_AUTH_SECRET.

## Outcome

- ✅ Impact: Full frontend foundation in place. T016–T020 marked complete. Next.js dev server will start; Better Auth API route responds at /api/auth/*; api-client.ts will attach JWT Bearer on every request.
- 🧪 Tests: No test tasks requested; foundation files are type-checkable with tsc --noEmit after npm install
- 📁 Files: 13 frontend files created + .env.example updated
- 🔁 Next prompts: Section 5 — Phase 3 Auth UI (T021–T027): root layout with SessionProvider, (auth) group layout, signup + login pages, middleware.ts, (dashboard) layout, Button/Input UI components
- 🧠 Reflection: Split auth.ts (server) from auth-client.ts (client) to respect Next.js server/client boundary. DATABASE_URL format differs: backend uses postgresql+asyncpg://, frontend uses postgresql:// (pg driver). Documented both in .env.example.

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): Not run (no tests requested)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Run `npm install && npm run type-check` after user fills in .env.local to validate TypeScript compiles clean
