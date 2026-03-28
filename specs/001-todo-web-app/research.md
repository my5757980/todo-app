# Phase 0 Research: Todo App Phase II — Multi-User Web Application

**Branch**: `001-todo-web-app` | **Date**: 2026-03-26
**Research Scope**: 8 architectural decisions required before Phase 1 design

---

## Decision 1: Authentication Library

**Decision**: Better Auth (as specified by project owner)

**Rationale**:
- Project owner has explicitly specified Better Auth with a shared `BETTER_AUTH_SECRET` between frontend and backend — this is the authoritative decision.
- Better Auth is TypeScript-first and designed for modern Next.js App Router with full SSR/RSC support, session cookies, and JWT issuance.
- The shared-secret model is straightforward: Better Auth issues signed JWTs, FastAPI validates them using the same `BETTER_AUTH_SECRET` — no inter-service token validation call is needed.

**Alternatives considered**:
- **Auth.js / NextAuth v5**: Deeper Next.js community adoption, more tutorials. Rejected: project owner specified Better Auth.
- **Clerk**: Hosted, excellent DX, built-in UI. Rejected: external dependency, no self-hosted JWT control.
- **Custom JWT**: Maximum control. Rejected: manual CSRF protection, higher security risk, unnecessary for a defined hackathon scope.

---

## Decision 2: Database Service

**Decision**: Neon Serverless PostgreSQL

**Rationale**:
- Fully managed PostgreSQL with zero-config serverless scaling; no local container required in development.
- Branch-per-feature workflow allows disposable dev/test schemas without state pollution.
- Free tier covers 100 compute-hours/month — sufficient for a 2-week hackathon sprint.
- Pure PostgreSQL: SQLModel/SQLAlchemy drivers work without any adapter shim.

**Alternatives considered**:
- **Supabase**: PostgreSQL + Auth + Realtime bundled. Rejected: bundled auth competes with Better Auth; over-provisioned for this scope.
- **PlanetScale (MySQL)**: Serverless, Vitess-backed. Rejected: MySQL dialect incompatibilities with some SQLAlchemy patterns; fewer Dapr connectors for Phase IV.
- **Local PostgreSQL container**: True offline dev. Rejected: added compose complexity; Neon cloud DB provides better CI/prod parity.

---

## Decision 3: Python Backend ORM

**Decision**: SQLModel (wraps SQLAlchemy 2.x + Pydantic v2)

**Rationale**:
- SQLModel unifies the database model and the API response schema in a single class — eliminates parallel `models.py` and `schemas.py` files.
- Full type safety end-to-end: IDE autocomplete works from DB row through Pydantic serialization to JSON response.
- Direct upgrade path to raw SQLAlchemy 2.x if needed — no lock-in.

**Alternatives considered**:
- **Pure SQLAlchemy 2.x**: Maximum flexibility. Rejected: requires separate Pydantic schemas, doubles model boilerplate; too verbose for 5 CRUD endpoints.
- **Tortoise ORM**: Async-first Django-like syntax. Rejected: smaller ecosystem; aerich migrations are less mature; weaker FastAPI documentation.
- **Peewee**: Simple, lightweight. Rejected: no Pydantic integration; sync-only.

---

## Decision 4: JWT Session Strategy

**Decision**: Shared-secret JWT validation — Better Auth issues tokens, FastAPI verifies via `BETTER_AUTH_SECRET`

**Rationale**:
- Better Auth on the Next.js side issues a signed JWT on successful sign-in. The token contains `user_id` (sub claim).
- FastAPI middleware reads the `Authorization: Bearer <token>` header, verifies the signature using the same `BETTER_AUTH_SECRET`, and extracts `user_id` from the payload.
- No inter-service token validation call is needed — fully stateless.
- Token expiry is configured in Better Auth; FastAPI respects the `exp` claim.

**Alternatives considered**:
- **Opaque / reference tokens**: FastAPI calls back to Next.js to validate. Rejected: N+1 latency per request; couples services together.
- **Separate FastAPI auth**: FastAPI manages its own user store and signs its own tokens. Rejected: duplicates auth logic; splits user identity across two stores.

**Risk**: `BETTER_AUTH_SECRET` rotation invalidates all active sessions — plan a maintenance window when rotating. Use environment config only; never hardcode.

---

## Decision 5: Monorepo Layout

**Decision**: Single repository — `/frontend` (Next.js) + `/backend` (FastAPI) + `/specs` (SDD artifacts)

**Rationale**:
- Atomic commits for API contract changes (spec + backend + frontend updated together).
- Shared `/specs/` directory serves as the single source of truth for contracts consumed by both services.
- One `docker-compose.yml` at root brings both services up together.
- Simpler CI/CD: one pipeline, one set of secrets, one deploy trigger.

**Alternatives considered**:
- **Separate repos**: Better for large teams with independent release cadences. Rejected: two-repo PR coordination is too slow for a hackathon.
- **Turborepo / Nx monorepo tooling**: Better for 5+ packages. Rejected: configuration overhead not justified for 2 services.

---

## Decision 6: Next.js Router Strategy

**Decision**: App Router (Next.js 16+ mandatory)

**Rationale**:
- App Router is the only actively maintained routing strategy in Next.js 15/16. Pages Router receives security patches only.
- Server Components allow session validation at the layout level — `(authenticated)/layout.tsx` checks the Better Auth session cookie and redirects to `/login` if absent.
- Middleware (`middleware.ts`) provides a single chokepoint for route protection before any server component renders.

**Alternatives considered**:
- **Pages Router**: Legacy. Rejected: no Server Components, no built-in middleware, scheduled deprecation.

---

## Decision 7: Local Development Stack

**Decision**: Docker Compose for frontend + backend services; Neon cloud as database (no local DB container)

**Rationale**:
- Two containers vs. four — dramatically less local memory and startup friction.
- Neon dev branch used for local development; feature branches get a Neon branch per sprint.
- CI and local dev use the same database engine (real PostgreSQL), not a Docker simulation.

**Alternatives considered**:
- **Full local stack + PostgreSQL container**: True offline. Rejected: adds DB container startup time, local state management, and port conflicts; Neon eliminates these.
- **No Docker, direct `npm run dev` + `uvicorn`**: Simplest. Rejected: environment differences across machines; no consistent port binding.

---

## Decision 8: URL Path Authorization Strategy

**Decision**: Keep `{user_id}` in URL path with mandatory JWT-match validation per project spec (`/api/{user_id}/tasks`)

**Rationale**:
- Project owner has explicitly specified the URL pattern `GET /api/{user_id}/tasks` in `specs/001-tasks-api/spec.md`.
- This is kept as specified; FR-018 in the tasks-api spec requires that `{user_id}` in the URL is validated against the JWT-extracted identity on every request.
- FastAPI dependency validates: `if path_user_id != jwt_user_id: raise HTTPException(403)`.

**Security note**: The `{user_id}` path parameter is treated as a routing hint only, never as the authoritative identity. The JWT is always authoritative. A mismatch results in a 403, not a bypass.

**Alternative considered**:
- **JWT-only, no user_id in URL** (`/api/tasks`): Simpler, no mismatch risk. Noted as preferred by architectural analysis, but project spec takes precedence. Can be refactored in a future phase if desired.

---

## Resolved Clarifications Summary

| Item | Resolution |
|------|-----------|
| Auth library | Better Auth (project owner specified) |
| Database | Neon Serverless PostgreSQL |
| ORM | SQLModel + SQLAlchemy 2.x |
| JWT strategy | Shared BETTER_AUTH_SECRET; Better Auth issues, FastAPI verifies |
| Repo structure | Monorepo: /frontend + /backend |
| Next.js routing | App Router only |
| Local DB | Neon cloud (no local container) |
| URL auth pattern | `{user_id}` in path + JWT-match validation (per spec) |

**All NEEDS CLARIFICATION items resolved. Phase 1 design can proceed.**
