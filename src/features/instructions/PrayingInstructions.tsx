"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { TextArea } from "@/components/TextArea";
import { dataErrorMessage } from "@/features/auth/messages";
import { useProfile } from "@/features/profile/ProfileContext";
import { today } from "@/features/thanksgiving/format";
import { saveInstruction } from "./mutations";
import { BODY_MAX } from "./validation";

type Item = { id: string; kind: "instruction" | "ritual"; body: string; frequency: string | null };

/**
 * On the praying screen: the rituals and the instructions not yet done, and a button to write one down
 * the moment it comes. Saving never touches the clock.
 */
export function PrayingInstructions({ prayerId, initial }: { prayerId: string; initial: Item[] }) {
  const profile = useProfile();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  // Next keeps this screen alive when you leave it: close the dialog then, so coming back starts fresh.
  useEffect(
    () => () => {
      setOpen(false);
      setBody("");
      setError(null);
      setSaved(false);
    },
    [],
  );

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  async function save() {
    const text = body.trim();
    if (!text) {
      setError("Write down what you were told to do.");
      return;
    }
    if ([...text].length > BODY_MAX) {
      setError(`Use ${BODY_MAX} characters or fewer.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = crypto.randomUUID();
      await saveInstruction(id, prayerId, profile.id, { kind: "instruction", body: text, frequency: "", receivedOn: today(), shared: false });
      setItems((list) => [...list, { id, kind: "instruction", body: text, frequency: null }]);
      setBody("");
      setOpen(false);
      setSaved(true);
    } catch (cause) {
      setError(dataErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Instructions" className="rounded-card border border-hairline bg-surface p-5 shadow-card">
      <p className="eyebrow text-muted">Instructions</p>
      {items.length === 0 ? (
        <p className="mt-2 text-muted">If God tells you to do something, write it down here.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="break-words text-ink">
              {item.body}
              {item.kind === "ritual" && item.frequency ? <span className="text-caption text-muted"> · {item.frequency}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {saved ? (
        <p role="status" className="mt-2 text-caption text-muted">
          Saved to this prayer. Your clock kept running.
        </p>
      ) : null}
      <div className="mt-3">
        <Button variant="secondary" onClick={() => { setSaved(false); setOpen(true); }}>
          Write down an instruction
        </Button>
      </div>

      <dialog
        ref={dialog}
        aria-labelledby="instruction-title"
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        className="m-auto w-[min(92vw,24rem)] rounded-card border border-hairline bg-surface p-6 text-ink shadow-card backdrop:bg-forest/40"
      >
        <h2 id="instruction-title" className="text-heading font-bold text-forest">
          Write down an instruction
        </h2>
        <p className="mt-1 text-caption text-muted">Your clock keeps running.</p>
        <TextArea className="mt-4" label="The instruction" rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={BODY_MAX * 2} />
        <FormError message={error} />
        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={() => void save()} busy={busy} busyLabel="Saving…">
            Save instruction
          </Button>
          <Button variant="quiet" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
        </div>
      </dialog>
    </section>
  );
}
