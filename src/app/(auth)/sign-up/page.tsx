import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="font-serif text-title text-ink">Begin here</h1>
      <p className="mt-3 mb-8 text-muted">Create an account to keep your prayers and your hours.</p>
      <AuthForm mode="sign-up" />
    </>
  );
}
