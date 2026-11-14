"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { TextField } from "@/components/TextField";
import { dataErrorMessage } from "@/features/auth/messages";
import { cleanDisplayName, DISPLAY_NAME_MAX, validateDisplayName } from "@/features/auth/validation";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/use-hydrated";

type Props = {
  userId: string;
  initialName?: string;
  submitLabel: string;
  /** Where to go after saving. Stays on the page and refreshes when not given. */
  redirectTo?: string;
  onSaved?: () => void;
  onCancel?: () => void;
};

/** Saves the person's display name to their profile. Used by onboarding and by Profile. */
export function DisplayNameForm({ userId, initialName = "", submitLabel, redirectTo, onSaved, onCancel }: Props) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [name, setName] = useState(initialName);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const error = validateDisplayName(name);
    setFieldError(error);
    setFormError(null);
    if (error) return;

    setBusy(true);
    try {
      const { data, error: saveError } = await createClient()
        .from("profiles")
        .update({ display_name: cleanDisplayName(name) })
        .eq("id", userId)
        .select("id");
      if (saveError) throw saveError;
      // No row back means the session no longer matches this profile.
      if (!data || data.length === 0) throw { code: "42501" };

      onSaved?.();
      if (redirectTo) router.replace(redirectTo);
      router.refresh();
      if (!redirectTo) setBusy(false);
    } catch (error) {
      setFormError(dataErrorMessage(error));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} method="post" noValidate className="flex flex-col gap-5">
      <TextField
        label="Your name"
        name="display_name"
        autoComplete="given-name"
        autoCapitalize="words"
        maxLength={DISPLAY_NAME_MAX * 2}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldError}
        hint="This is how people you pray with will see you."
      />
      <FormError message={formError} />
      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={!hydrated} busy={busy} busyLabel="Saving…">
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
