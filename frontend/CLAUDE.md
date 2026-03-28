# Frontend Guidelines — Todo App Phase II

## Tech Stack
- **Framework**: Next.js 16+ with App Router (NOT Pages Router)
- **Language**: TypeScript 5.x — strict mode enabled
- **Styling**: Tailwind CSS — utility-first, no custom CSS unless unavoidable
- **Auth**: Better Auth — `@/lib/auth.ts` is the single source of auth config
- **HTTP**: `@/lib/api-client.ts` — ALWAYS use this; never raw `fetch()` with manual headers

## Project Structure
```
frontend/src/
├── app/
│   ├── layout.tsx              # Root layout — SessionProvider wraps all children
│   ├── (auth)/                 # Public routes — redirect to /tasks if session exists
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/            # Protected routes — session required
│   │   ├── layout.tsx          # Nav bar + logout button
│   │   └── tasks/page.tsx      # Main task dashboard
│   └── api/
│       └── auth/[...all]/      # Better Auth handler
│           └── route.ts
├── components/
│   ├── tasks/                  # Task-specific components
│   │   ├── TaskCard.tsx
│   │   ├── TaskList.tsx
│   │   ├── TaskForm.tsx        # Handles create + edit modes
│   │   ├── TaskFilter.tsx
│   │   └── DeleteConfirm.tsx
│   └── ui/                     # Reusable primitives
│       ├── Button.tsx
│       └── Input.tsx
├── lib/
│   ├── auth.ts                 # Better Auth client config
│   └── api-client.ts           # HTTP client — attaches Bearer JWT
└── hooks/
    └── useTasks.ts             # All task data + mutations
```

## App Router Rules
- **Server Components** by default — only add `"use client"` when needed (event handlers, hooks, browser APIs)
- **Route Groups**: `(auth)` = public pages, `(dashboard)` = protected pages
- **Layouts**: Use layouts for shared UI (nav, auth check) not individual pages
- **Middleware** (`frontend/middleware.ts`): single chokepoint for route protection

## Better Auth Rules
- Import auth helpers from `@/lib/auth.ts` only — never import from `better-auth` directly in components
- Use `useSession()` in client components, `getSession()` in server components
- On sign-out: call `signOut()` then `router.push('/login')`
- JWT is embedded in the Better Auth session — `api-client.ts` extracts it automatically

## API Client Rules
- ALL API calls go through `@/lib/api-client.ts` — this attaches `Authorization: Bearer <token>`
- `userId` for URL construction comes from `session.user.id` — never hardcoded or guessed
- On 401 response: `api-client.ts` handles sign-out + redirect automatically — components do NOT handle 401

## Tailwind Rules
- Use Tailwind utility classes only — no inline styles, no custom CSS files
- Responsive: mobile-first (`base` → `sm:` → `md:` → `lg:`)
- Min touch target: `min-h-[44px] min-w-[44px]` for all interactive elements
- Color conventions: primary=blue-600, danger=red-600, neutral=gray-*

## TypeScript Rules
- Strict mode: no `any`, no implicit `any`
- Define types for all props and API responses — import `TaskResponse` from shared types
- `async/await` only — no `.then()` chains
- Handle loading and error states in every data-fetching component

## Component Rules
- One component per file
- Props interfaces defined at top of file
- Default exports for page components, named exports for reusable components
- No business logic in components — delegate to hooks (`useTasks`) and `api-client`
