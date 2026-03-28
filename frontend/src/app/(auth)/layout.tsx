/**
 * (auth) route group layout — public pages: /login, /signup
 *
 * Server component. If the user already has a valid session,
 * redirects to /tasks (secondary guard after middleware).
 * Renders a centered card layout for auth forms.
 *
 * Ref: frontend/CLAUDE.md § App Router Rules
 *      tasks.md T022
 */
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    redirect("/tasks");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* App branding */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Todo App</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your tasks, privately.
          </p>
        </div>

        {/* Auth card */}
        <div className="rounded-xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
          {children}
        </div>
      </div>
    </main>
  );
}
