/**
 * /signup — new user registration.
 *
 * Client component (form state + Better Auth signUp).
 * On success → redirect to /tasks.
 * Shows inline errors: email taken, password too short.
 *
 * Ref: specs/001-auth-jwt/spec.md FR-001, FR-002
 *      tasks.md T023
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const next: FormErrors = {};
    if (!email.includes("@")) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    const result = await signUp.email({
      email,
      password,
      name: email.split("@")[0],
    });

    setLoading(false);

    if (result.error) {
      const msg = result.error.message ?? "";
      if (msg.toLowerCase().includes("email") || msg.toLowerCase().includes("exist")) {
        setErrors({ email: "This email address is already registered." });
      } else {
        setErrors({ general: msg || "Sign up failed. Please try again." });
      }
      return;
    }

    router.push("/tasks");
  }

  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-gray-900">
        Create an account
      </h2>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoComplete="email"
          required
          disabled={loading}
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="new-password"
          required
          disabled={loading}
        />

        {errors.general && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            {errors.general}
          </p>
        )}

        <Button type="submit" loading={loading} className="mt-2 w-full">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
