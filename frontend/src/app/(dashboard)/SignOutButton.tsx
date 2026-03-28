/**
 * SignOutButton — client component used by the dashboard layout.
 *
 * Calls signOut() then redirects to /login.
 * Kept separate so the parent layout stays a server component.
 */
"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <Button variant="secondary" onClick={handleSignOut}>
      Sign out
    </Button>
  );
}
