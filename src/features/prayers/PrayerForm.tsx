"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormError } from "@/components/FormError";
import { TextArea } from "@/components/TextArea";
import { TextField } from "@/components/TextField";
import { dataErrorMessage } from "@/features/auth/messages";
import { useHydrated } from "@/lib/use-hydrated";
import { savePrayer } from "./mutations";
import type { PrayerDraft, PrayerKind } from "./types";
import {
  moveItem,
  normalizeDraft,
  POINT_MAX,
  POINTS_LIMIT,
  SCRIPTURES_LIMIT,
  TITLE_MAX,
  validateDraft,
  type DraftErrors,
} from "./validation";

/** A new id, made on the phone so that saving twice by accident changes nothing. */
function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // randomUUID needs a secure page; this covers plain http on a local network.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const EMPTY_DRAFT: PrayerDraft = {
  kind: "prayer",
  title: "",
  targetHours: "",
  plannedStartDate: "",
  plannedEndDate: "",
  points: [],
  scriptures: [],
};

const KINDS: { value: PrayerKind; label: string; hint: string }[] = [
  { value: "prayer", label: "Prayer", hint: "Something specific you are asking for." },
  { value: "altar", label: "Altar", hint: "A long-term prayer you keep returning to." },
];

const NO_ERRORS: DraftErrors = { pointById: {}, scriptureById: {} };

/** Up, down and remove for one row of a list. Plain buttons, so nothing depends on swiping or dragging. */
function RowControls({ name, index, count, onMove, onRemove }: { name: string; index: number; count: number; onMove: (d: -1 | 1) => void; onRemove: () => void }) {
  const icon = "inline-flex size-11 items-center justify-center rounded-full text-primary active:bg-wash disabled:text-hairline";
  const svg = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
  return (
    <div className="flex items-center justify-end">
      <button type="button" className={icon} aria-label={`Move ${name} up`} disabled={index === 0} onClick={() => onMove(-1)}>
        <svg {...svg}><path d="M6 15l6-6 6 6" /></svg>
      </button>
      <button type="button" className={icon} aria-label={`Move ${name} down`} disabled={index === count - 1} onClick={() => onMove(1)}>
        <svg {...svg}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <button type="button" className={`${icon} text-danger`} aria-label={`Remove ${name}`} onClick={onRemove}>
        <svg {...svg}><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
}

type Props = {
  /** The prayer being edited. Leave out to create a new one. */
  prayerId?: string;
  initial?: PrayerDraft;
};

/** The form for creating or editing a prayer or altar, with its prayer points and key scriptures. */
export function PrayerForm({ prayerId, initial = EMPTY_DRAFT }: Props) {
  const router = useRouter();
  const hydrated = useHydrated();
  const editing = Boolean(prayerId);
  const [draft, setDraft] = useState<PrayerDraft>(initial);
  const [errors, setErrors] = useState<DraftErrors>(NO_ERRORS);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  // Chosen on the first save and kept, so a retry updates the same prayer instead of making a second.
  const savedId = useRef<string | undefined>(prayerId);

  const backTo = editing ? `/prayers/${prayerId}` : "/prayers";
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const noun = draft.kind === "altar" ? "altar" : "prayer";
  const set = (patch: Partial<PrayerDraft>) => setDraft((d) => ({ ...d, ...patch }));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const clean = normalizeDraft(draft);
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
      savedId.current ??= newId();
      const id = await savePrayer(savedId.current, clean);
      router.replace(`/prayers/${id}`);
      router.refresh();
    } catch (error) {
      setFormError(dataErrorMessage(error));
      setBusy(false);
    }
  }

  function cancel() {
    if (dirty) setConfirmingDiscard(true);
    else router.push(backTo);
  }

  return (
    <form onSubmit={onSubmit} method="post" noValidate className="flex flex-col gap-8">
      <TextField
        label="Title"
        name="title"
        value={draft.title}
        onChange={(e) => set({ title: e.target.value })}
        error={errors.title}
        hint={`What are you praying for? Up to ${TITLE_MAX} characters.`}
        maxLength={TITLE_MAX * 2}
        autoComplete="off"
      />

      <fieldset>
        <legend className="eyebrow text-muted">Type</legend>
        {editing ? (
          <p className="mt-2 text-ink">
            {draft.kind === "altar" ? "Altar" : "Prayer"}
            <span className="text-muted"> · The type is chosen once, when it is created.</span>
          </p>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-3">
            {KINDS.map((kind) => {
              const checked = draft.kind === kind.value;
              return (
                <label
                  key={kind.value}
                  className={`flex min-h-tap cursor-pointer flex-col rounded-card border p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary ${
                    checked ? "border-forest bg-surface shadow-card" : "border-hairline bg-surface/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="kind"
                    value={kind.value}
                    checked={checked}
                    onChange={() => set({ kind: kind.value })}
                    className="sr-only"
                  />
                  <span className="font-bold text-forest">{kind.label}</span>
                  <span className="mt-1 text-caption text-muted">{kind.hint}</span>
                </label>
              );
            })}
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend className="text-heading font-bold text-forest">Plan</legend>
        <p className="mt-1 text-caption text-muted">Optional. Set a target to pray towards, or leave it open.</p>
        <div className="mt-4 flex flex-col gap-5">
          <TextField
            label="Target hours"
            name="target_hours"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft.targetHours}
            onChange={(e) => set({ targetHours: e.target.value })}
            error={errors.targetHours}
            placeholder="For example 40"
            autoComplete="off"
          />
          {draft.kind === "prayer" ? (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Start date" name="planned_start_date" type="date" value={draft.plannedStartDate} onChange={(e) => set({ plannedStartDate: e.target.value })} />
                <TextField label="End date" name="planned_end_date" type="date" value={draft.plannedEndDate} onChange={(e) => set({ plannedEndDate: e.target.value })} />
              </div>
              {errors.dates ? (
                <p role="alert" className="mt-2 text-caption text-danger">
                  {errors.dates}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-caption text-muted">An altar has no end date. You return to it for as long as you need.</p>
          )}
        </div>
      </fieldset>

      <section aria-labelledby="points-heading">
        <h2 id="points-heading" className="text-heading font-bold text-forest">
          Prayer points
        </h2>
        <p className="mt-1 text-caption text-muted">
          What you will pray through, in order. Up to {POINTS_LIMIT}.
        </p>
        <ol className="mt-4 flex flex-col gap-3">
          {draft.points.map((point, index) => {
            const name = `prayer point ${index + 1}`;
            return (
              <li key={point.id} className="rounded-card border border-hairline bg-surface p-3">
                <TextArea
                  label={`Prayer point ${index + 1}`}
                  hideLabel
                  value={point.body}
                  onChange={(e) => set({ points: draft.points.map((p) => (p.id === point.id ? { ...p, body: e.target.value } : p)) })}
                  error={errors.pointById[point.id]}
                  placeholder="For example: Peace in our home"
                  maxLength={POINT_MAX * 2}
                  autoFocus={point.body === ""}
                />
                <RowControls
                  name={name}
                  index={index}
                  count={draft.points.length}
                  onMove={(d) => set({ points: moveItem(draft.points, index, d) })}
                  onRemove={() => set({ points: draft.points.filter((p) => p.id !== point.id) })}
                />
              </li>
            );
          })}
        </ol>
        {errors.points ? (
          <p role="alert" className="mt-2 text-caption text-danger">
            {errors.points}
          </p>
        ) : null}
        <Button
          variant="secondary"
          className="mt-3"
          disabled={!hydrated || draft.points.length >= POINTS_LIMIT}
          onClick={() => set({ points: [...draft.points, { id: newId(), body: "" }] })}
        >
          Add a prayer point
        </Button>
      </section>

      <section aria-labelledby="scriptures-heading">
        <h2 id="scriptures-heading" className="text-heading font-bold text-forest">
          Key scriptures
        </h2>
        <p className="mt-1 text-caption text-muted">
          The verses you are standing on. Up to {SCRIPTURES_LIMIT}.
        </p>
        <ol className="mt-4 flex flex-col gap-3">
          {draft.scriptures.map((scripture, index) => {
            const name = `scripture ${index + 1}`;
            const fieldErrors = errors.scriptureById[scripture.id] ?? {};
            const change = (patch: Partial<typeof scripture>) =>
              set({ scriptures: draft.scriptures.map((s) => (s.id === scripture.id ? { ...s, ...patch } : s)) });
            return (
              <li key={scripture.id} className="rounded-card border border-hairline bg-surface p-3">
                <fieldset className="flex flex-col gap-3">
                  <legend className="sr-only">Scripture {index + 1}</legend>
                  <div className="grid grid-cols-[1fr_6.5rem] gap-3">
                    <TextField
                      label="Reference"
                      value={scripture.reference}
                      onChange={(e) => change({ reference: e.target.value })}
                      error={fieldErrors.reference}
                      placeholder="Isaiah 41:10"
                      autoComplete="off"
                      autoFocus={scripture.reference === "" && scripture.verseText === ""}
                    />
                    <TextField
                      label="Version"
                      value={scripture.translation}
                      onChange={(e) => change({ translation: e.target.value })}
                      error={fieldErrors.translation}
                      placeholder="KJV"
                      autoComplete="off"
                    />
                  </div>
                  <TextArea
                    label="Verse text (optional)"
                    rows={3}
                    value={scripture.verseText}
                    onChange={(e) => change({ verseText: e.target.value })}
                    error={fieldErrors.verseText}
                  />
                </fieldset>
                <RowControls
                  name={name}
                  index={index}
                  count={draft.scriptures.length}
                  onMove={(d) => set({ scriptures: moveItem(draft.scriptures, index, d) })}
                  onRemove={() => set({ scriptures: draft.scriptures.filter((s) => s.id !== scripture.id) })}
                />
              </li>
            );
          })}
        </ol>
        {errors.scriptures ? (
          <p role="alert" className="mt-2 text-caption text-danger">
            {errors.scriptures}
          </p>
        ) : null}
        <Button
          variant="secondary"
          className="mt-3"
          disabled={!hydrated || draft.scriptures.length >= SCRIPTURES_LIMIT}
          onClick={() => set({ scriptures: [...draft.scriptures, { id: newId(), reference: "", verseText: "", translation: "" }] })}
        >
          Add a scripture
        </Button>
      </section>

      <div className="flex flex-col gap-2">
        <FormError message={formError} />
        <Button type="submit" disabled={!hydrated} busy={busy} busyLabel="Saving…">
          {editing ? "Save changes" : `Create ${noun}`}
        </Button>
        <Button variant="secondary" onClick={cancel} disabled={busy}>
          Cancel
        </Button>
      </div>

      <ConfirmDialog
        open={confirmingDiscard}
        title="Leave without saving?"
        description="What you have written here will be lost."
        confirmLabel="Leave"
        cancelLabel="Keep writing"
        tone="danger"
        onConfirm={() => router.push(backTo)}
        onCancel={() => setConfirmingDiscard(false)}
      />
    </form>
  );
}
