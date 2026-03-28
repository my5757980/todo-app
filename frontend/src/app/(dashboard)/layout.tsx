/**
 * (dashboard) route group layout — protected pages: /tasks, /chat
 *
 * Server component. Secondary auth guard (middleware is first).
 * Fetches session server-side via auth.api.getSession() — if no
 * valid session exists, redirects to /login.
 *
 * Renders:
 *  - Top nav bar: app title, /tasks ↔ /chat nav links, user email, Sign Out
 *  - Responsive max-width content container
 *
 * NavLink is a client component so it can read the current pathname
 * for active-state styling.
 * SignOutButton is a client component (needs onClick + useRouter).
 *
 * Ref: frontend/CLAUDE.md § App Router Rules, Better Auth Rules
 *      specs/003-ai-todo-chatbot/tasks.md T022
 *      tasks.md T026
 */
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { SignOutButton } from "./SignOutButton";
import { NavLink } from "./NavLink";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Nav bar ── */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Left: brand + nav links */}
          <div className="flex items-center gap-5">
            <h1 className="text-lg font-semibold text-gray-900">My Todos</h1>

            <nav className="flex items-center gap-1" aria-label="Main navigation">
              <NavLink href="/tasks">Tasks</NavLink>
              <NavLink href="/chat">AI Chat</NavLink>
            </nav>
          </div>

          {/* Right: email + sign out */}
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:block">
              {session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
