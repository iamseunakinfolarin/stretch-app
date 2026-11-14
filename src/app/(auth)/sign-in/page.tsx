import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <h1 className="font-serif text-title text-ink">Welcome back</h1>
      <p className="mt-3 mb-8 text-muted">Sign in to pick up where you left off.</p>
      <AuthForm mode="sign-in" />
    </>
  );
}
