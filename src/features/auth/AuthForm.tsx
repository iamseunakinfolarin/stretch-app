"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { TextField } from "@/components/TextField";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/use-hydrated";
import { authErrorMessage } from "./messages";
import { cleanEmail, validateEmail, validateNewPassword, validatePassword } from "./validation";

type Mode = "sign-in" | "sign-up";

const COPY = {
  "sign-in": {
    submit: "Sign in",
    busy: "Signing in…",
    switchPrompt: "New to Stretch?",
    switchLabel: "Create an account",
    switchHref: "/sign-up",
  },
  "sign-up": {
    submit: "Create account",
    busy: "Creating your account…",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/sign-in",
  },
} as const;

/**
 * Email and password form, used for both signing in and signing up.
 * To move to one-time codes later, this is the one component to replace.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const copy = COPY[mode];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const emailError = validateEmail(email);
    const passwordError = mode === "sign-up" ? validateNewPassword(password) : validatePassword(password);
    setErrors({ email: emailError, password: passwordError });
    setFormError(null);
    if (emailError || passwordError) return;

    setBusy(true);
    try {
      const supabase = createClient();
      const credentials = { email: cleanEmail(email), password };

      if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp(credentials);
        if (error) throw error;
        if (!data.session) {
          // The project still requires email confirmation, and no email service is set up.
          throw { code: "email_not_confirmed" };
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword(credentials);
        if (error) throw error;
      }

      // The server decides where a signed-in person belongs: onboarding or the app.
      router.replace("/");
      router.refresh();
    } catch (error) {
      setFormError(authErrorMessage(error));
      setBusy(false);
    }
  }

  return (
    // The submit button stays disabled until the page is ready, so the form is never submitted natively.
    // method="post" is a second guard: even then the password could not end up in the address.
    <form onSubmit={onSubmit} method="post" noValidate className="flex flex-col gap-5">
      <TextField
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <TextField
        label="Password"
        type="password"
        name="password"
        autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        hint={mode === "sign-up" ? "At least 8 characters." : undefined}
      />
      <FormError message={formError} />
      <Button type="submit" disabled={!hydrated} busy={busy} busyLabel={copy.busy} className="mt-1">
        {copy.submit}
      </Button>

      <p className="text-center text-muted">
        {copy.switchPrompt}{" "}
        <Link href={copy.switchHref} className="inline-flex min-h-tap items-center font-semibold text-primary">
          {copy.switchLabel}
        </Link>
      </p>
      {mode === "sign-in" ? (
        <p className="text-center text-caption text-muted">
          Forgot your password? Ask the person who invited you.
        </p>
      ) : null}
    </form>
  );
}
