"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormError } from "@/components/FormError";
import { TextArea } from "@/components/TextArea";
import { TextField } from "@/components/TextField";
import { dataErrorMessage } from "@/features/auth/messages";
import { useProfile } from "@/features/profile/ProfileContext";
import { today } from "@/features/thanksgiving/format";
import { useHydrated } from "@/lib/use-hydrated";
import { deleteInstruction, saveInstruction } from "./mutations";
import type { InstructionDraft, InstructionKind } from "./types";
import { BODY_MAX, normalizeDraft, validateDraft, type DraftErrors } from "./validation";

const OFTEN = ["Daily", "Every morning", "Every Sunday", "Weekly"];

type Props = {
  prayerId: string;
  /** The one being edited. Leave out to write a new one. */
  instructionId?: string;
  initial: InstructionDraft;
  doneOn?: string | null;
};

/** Write down or edit an instruction or ritual. Editing an instruction offers "Make this a ritual". */
export function InstructionForm({ prayerId, instructionId, initial, doneOn = null }: Props) {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useProfile();
  const editing = Boolean(instructionId);
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const id = useRef<string | null>(instructionId ?? null);
  const set = (patch: Partial<InstructionDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const back = `/prayers/${prayerId}`;

  // Next keeps this screen alive when you leave it; clear a new form so the next visit starts blank.
  useEffect(() => {
    if (editing) return;
    return () => {
      setDraft(initial);
      setErrors({});
      setFormError(null);
      setBusy(false);
      id.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const clean = normalizeDraft({ ...draft, receivedOn: draft.receivedOn || today() });
    const check = validateDraft(clean);
    setDraft(clean);
    setErrors(check.errors);
    if (!check.ok) {
      setFormError("Some things need a look before this can be saved. They are marked above.");
      return;
    }
    setFormError(null);
    setBusy(true);
    try {
      id.current ??= crypto.randomUUID();
      await saveInstruction(id.current, prayerId, profile.id, clean, doneOn);
      router.replace(back);
      router.refresh();
    } catch (cause) {
      setFormError(dataErrorMessage(cause));
      setBusy(false);
    }
  }

  async function remove() {
    if (!instructionId) return;
    setBusy(true);
    try {
      await deleteInstruction(instructionId);
      router.replace(back);
      router.refresh();
    } catch (cause) {
      setFormError(dataErrorMessage(cause));
      setConfirmDelete(false);
      setBusy(false);
    }
  }

  const kinds: { value: InstructionKind; label: string; hint: string }[] = [
    { value: "instruction", label: "Instruction", hint: "Something to do once." },
    { value: "ritual", label: "Ritual", hint: "Something to keep doing." },
  ];

  return (
    <form onSubmit={onSubmit} method="post" noValidate className="flex flex-col gap-7">
      <fieldset>
        <legend className="eyebrow text-muted">Type</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {kinds.map((kind) => {
            const checked = draft.kind === kind.value;
            return (
              <label
                key={kind.value}
                className={`flex min-h-tap cursor-pointer flex-col rounded-card border p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary ${
                  checked ? "border-forest bg-surface shadow-card" : "border-hairline bg-surface/60"
                }`}
              >
                <input type="radio" name="kind" value={kind.value} checked={checked} onChange={() => set({ kind: kind.value })} className="sr-only" />
                <span className="font-bold text-forest">{kind.label}</span>
                <span className="mt-1 text-caption text-muted">{kind.hint}</span>
              </label>
            );
          })}
        </div>
        {editing && initial.kind === "instruction" && draft.kind === "instruction" ? (
          <button type="button" onClick={() => set({ kind: "ritual" })} className="mt-3 inline-flex min-h-tap items-center font-semibold text-primary">
            Make this a ritual
          </button>
        ) : null}
      </fieldset>

      <TextArea
        label={draft.kind === "ritual" ? "The ritual" : "The instruction"}
        name="body"
        rows={4}
        value={draft.body}
        onChange={(e) => set({ body: e.target.value })}
        error={errors.body}
        hint="In your own words."
        maxLength={BODY_MAX * 2}
      />

      {draft.kind === "ritual" ? (
        <div>
          <TextField
            label="How often"
            name="frequency"
            value={draft.frequency}
            onChange={(e) => set({ frequency: e.target.value })}
            error={errors.frequency}
            placeholder="For example Every Wednesday"
            autoComplete="off"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {OFTEN.map((often) => (
              <button
                key={often}
                type="button"
                onClick={() => set({ frequency: often })}
                className="inline-flex min-h-tap items-center rounded-full border border-hairline bg-surface px-4 text-caption font-semibold text-primary"
              >
                {often}
              </button>
            ))}
          </div>
          <p className="mt-2 text-caption text-muted">A ritual lasts as long as this prayer or altar does.</p>
        </div>
      ) : null}

      <TextField
        label="Day you received it"
        name="received_on"
        type="date"
        value={draft.receivedOn}
        onChange={(e) => set({ receivedOn: e.target.value })}
        error={errors.receivedOn}
        hint={editing ? undefined : "Leave it empty for today."}
      />

      <label className="flex min-h-tap cursor-pointer items-center gap-3 rounded-card border border-hairline bg-surface px-4 py-3">
        <input type="checkbox" name="shared" checked={draft.shared} onChange={(e) => set({ shared: e.target.checked })} className="size-5 accent-[var(--color-forest)]" />
        <span>
          Share with the people in this prayer
          <span className="block text-caption text-muted">Only you see it unless this is on.</span>
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <FormError message={formError} />
        <Button type="submit" disabled={!hydrated} busy={busy} busyLabel="Saving…">
          {editing ? "Save changes" : draft.kind === "ritual" ? "Save ritual" : "Save instruction"}
        </Button>
        <Button variant="quiet" onClick={() => router.push(back)} disabled={busy}>
          Cancel
        </Button>
        {editing ? (
          <Button variant="quiet-danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
            Delete
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        tone="danger"
        title={initial.kind === "ritual" ? "Delete this ritual?" : "Delete this instruction?"}
        description="It will be removed for good."
        confirmLabel={busy ? "Deleting…" : "Delete"}
        cancelLabel="Keep it"
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}
