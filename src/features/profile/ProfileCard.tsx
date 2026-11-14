"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormError } from "@/components/FormError";
import { dataErrorMessage } from "@/features/auth/messages";
import { createClient } from "@/lib/supabase/client";
import { DisplayNameForm } from "./DisplayNameForm";
import { useProfile } from "./ProfileContext";

/** The Profile tab: who you are, change your name, sign out, delete your account. */
export function ProfileCard() {
  const profile = useProfile();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [working, setWorking] = useState<"sign-out" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function leave() {
    router.replace("/sign-in");
    router.refresh();
  }

  async function signOut() {
    setWorking("sign-out");
    setError(null);
    // "local" signs out this phone only, and still works with no connection.
    await createClient().auth.signOut({ scope: "local" });
    leave();
  }

  async function deleteAccount() {
    setWorking("delete");
    setError(null);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase.rpc("delete_my_account");
      if (deleteError) throw deleteError;
      // The account is gone, so only this phone's copy of the session is left to clear.
      await supabase.auth.signOut({ scope: "local" });
      leave();
    } catch (cause) {
      setError(dataErrorMessage(cause));
      setWorking(null);
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Your details" className="rounded-card border border-hairline bg-surface p-5">
        {editing ? (
          <DisplayNameForm
            userId={profile.id}
            initialName={profile.displayName}
            submitLabel="Save name"
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <dl className="flex flex-col gap-5">
              <div>
                <dt className="label-mono text-muted">Name</dt>
                <dd className="mt-1 font-serif text-[1.75rem] leading-tight break-words text-ink">
                  {profile.displayName}
                </dd>
              </div>
              <div>
                <dt className="label-mono text-muted">Email</dt>
                <dd className="mt-1 break-all text-ink">{profile.email}</dd>
              </div>
            </dl>
            <Button variant="secondary" className="mt-6" onClick={() => setEditing(true)}>
              Change name
            </Button>
          </>
        )}
      </section>

      <FormError message={error} />

      <div className="flex flex-col gap-2">
        <Button variant="secondary" onClick={signOut} busy={working === "sign-out"} busyLabel="Signing out…">
          Sign out
        </Button>
        <Button variant="quiet-danger" onClick={() => setConfirmingDelete(true)} disabled={working !== null}>
          Delete account
        </Button>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        tone="danger"
        title="Delete your account?"
        description="Your prayers, notes, testimonies and hours will be removed for good. Prayers you own are removed for everyone who joined them. This can't be undone."
        confirmLabel={working === "delete" ? "Deleting…" : "Delete my account"}
        cancelLabel="Keep my account"
        busy={working === "delete"}
        onConfirm={deleteAccount}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
