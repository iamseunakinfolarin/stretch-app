"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormError } from "@/components/FormError";
import { dataErrorMessage } from "@/features/auth/messages";
import { useProfile } from "@/features/profile/ProfileContext";
import { inviteHeadline, inviteMessage } from "./invite-words";
import { createOrResetInvite } from "./mutations";

const noSubscribe = () => () => {};

/** For the owner: make an invite link, copy or share it, or replace it so the old one stops working. */
export function InvitePanel({ prayerId, title, noun, initialCode }: { prayerId: string; title: string; noun: string; initialCode: string | null }) {
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  // The address of this site, known only in the browser.
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const canShare = useSyncExternalStore(noSubscribe, () => typeof navigator.share === "function", () => false);
  const link = code && origin ? `${origin}/join/${code}` : "";
  const firstName = useProfile().displayName.trim().split(/\s+/)[0] || null;
  const message = link ? inviteMessage(firstName, title, link) : "";

  async function make() {
    setBusy(true);
    setError(null);
    try {
      setCode(await createOrResetInvite(prayerId));
      setCopied(false);
    } catch (cause) {
      setError(dataErrorMessage(cause));
    } finally {
      setBusy(false);
      setConfirmingReset(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setError("Couldn't copy here. Press and hold the message to copy it instead.");
    }
  }

  async function share() {
    try {
      await navigator.share({ title: inviteHeadline(firstName), text: `${inviteHeadline(firstName)} on "${title}".`, url: link });
    } catch {
      // Closing the share sheet is not a problem.
    }
  }

  if (!code) {
    return (
      <div className="flex flex-col gap-2">
        <FormError message={error} />
        <Button onClick={() => void make()} busy={busy} busyLabel="Making a link…">
          Invite friends
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4">
      <p className="eyebrow text-muted">Invite message</p>
      <p aria-label="Invite message" className="rounded-control bg-wash px-3 py-3 break-words text-ink select-all">
        {message || `…/join/${code}`}
      </p>
      <p className="text-caption text-muted">Anyone with this link can join this {noun} and pray with you.</p>
      <FormError message={error} />
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => void copy()} disabled={!link}>
          {copied ? "Copied" : "Copy invite"}
        </Button>
        {canShare ? (
          <Button onClick={() => void share()} disabled={!link}>
            Share
          </Button>
        ) : null}
      </div>
      <Button variant="quiet" onClick={() => setConfirmingReset(true)} disabled={busy}>
        Make a new link
      </Button>
      <ConfirmDialog
        open={confirmingReset}
        title="Make a new link?"
        description="The old link will stop working. People who already joined stay in."
        confirmLabel={busy ? "Making…" : "Make a new link"}
        cancelLabel="Keep this link"
        busy={busy}
        onConfirm={() => void make()}
        onCancel={() => setConfirmingReset(false)}
      />
    </div>
  );
}
