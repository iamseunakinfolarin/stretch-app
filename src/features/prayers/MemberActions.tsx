"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormError } from "@/components/FormError";
import { dataErrorMessage } from "@/features/auth/messages";
import { removeMember } from "./mutations";

/** "Remove" for the owner, beside a member's name, or "Leave this prayer" for a member. Both ask first. */
export function MemberAction({ prayerId, userId, name, mode, noun }: { prayerId: string; userId: string; name: string; mode: "remove" | "leave"; noun: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const leaving = mode === "leave";

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await removeMember(prayerId, userId);
      setOpen(false);
      if (leaving) router.replace("/prayers");
      router.refresh();
    } catch (cause) {
      setError(dataErrorMessage(cause));
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={leaving ? "flex flex-col gap-2" : undefined}>
      <FormError message={error} />
      {leaving ? (
        <Button variant="quiet-danger" onClick={() => setOpen(true)} disabled={busy}>
          Leave this {noun}
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={busy}
          aria-label={`Remove ${name}`}
          className="inline-flex min-h-tap items-center px-2 text-caption font-semibold text-danger"
        >
          Remove
        </button>
      )}
      <ConfirmDialog
        open={open}
        tone="danger"
        title={leaving ? `Leave this ${noun}?` : `Remove ${name}?`}
        description={
          leaving
            ? "It will leave your lists. The hours you prayed stay yours. You can join again with an invite link."
            : `${name} will no longer see this ${noun}. The hours they prayed stay theirs.`
        }
        confirmLabel={busy ? "Working…" : leaving ? "Leave" : "Remove"}
        cancelLabel="Cancel"
        busy={busy}
        onConfirm={() => void run()}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
