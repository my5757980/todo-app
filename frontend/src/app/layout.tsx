/**
 * Root layout — wraps every page in the app.
 *
 * Better Auth does not require an explicit SessionProvider wrapper;
 * useSession() manages its own internal cache via the auth client.
 * This layout is a server component — auth state is checked per route
 * group in (auth)/layout.tsx and (dashboard)/layout.tsx.
 *
 * Ref: frontend/CLAUDE.md § App Router Rules
 *      tasks.md T021
 */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Todo App",
  description: "Multi-user todo application — Phase II",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
