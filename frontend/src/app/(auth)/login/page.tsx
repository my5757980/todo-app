/**
 * /login — returning user sign-in.
 *
 * Client component (form state + Better Auth signIn).
 * On success → redirect to /tasks.
 * Shows "Invalid credentials" on auth failure.
 * Shows "Session expired" banner when ?expired=1 is in URL.
 *
 * Ref: specs/001-auth-jwt/spec.md FR-004, FR-005
 *      tasks.md T024
 */
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("expired") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn.email({ email, password });
    setLoading(false);

    if (result.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }

    router.push("/tasks");
  }

  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-gray-900">
        Sign in to your account
      </h2>

      {/* Session-expired banner (from api-client.ts 401 handler) */}
      {sessionExpired && (
        <div className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700" role="alert">
          Your session expired. Please sign in again.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          disabled={loading}
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          disabled={loading}
        />

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="mt-2 w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-blue-600 hover:underline">
          Create one
        </Link>
      </p>
    </>
  );
}
