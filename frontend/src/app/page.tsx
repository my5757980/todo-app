/**
 * Root page — immediately redirects.
 * Authenticated users → /tasks (via middleware in T025)
 * Unauthenticated users → /login
 *
 * Phase 3 middleware (T025) handles this redirect properly.
 * This is a static fallback so the dev server has a root route.
 */
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
