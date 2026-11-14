import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <h1 className="text-title font-bold text-forest">Welcome back</h1>
      <p className="mt-3 mb-8 text-muted">Sign in to pick up where you left off.</p>
      <AuthForm mode="sign-in" />
    </>
  );
}
