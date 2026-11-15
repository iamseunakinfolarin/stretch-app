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
import { useHydrated } from "@/lib/use-hydrated";
import { today } from "./format";
import { GLOW_COLORS, GLOW_LABELS } from "./glow";
import { saveThanksgiving } from "./mutations";
import { GLOWS, type Category, type ThanksgivingDraft } from "./types";
import { BODY_MAX, normalizeDraft, TITLE_MAX, validateDraft, type DraftErrors } from "./validation";

function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const blank = (): ThanksgivingDraft => ({
  title: "",
  body: "",
  happenedOn: "",
  prayerId: "",
  categoryId: "",
  newCategoryName: "",
  newCategoryGlow: "gold",
  shared: false,
});

const selectClass = "mt-2 block min-h-field w-full rounded-control border border-hairline bg-surface px-4 py-3 text-ink";

type Props = {
  /** The thanksgiving being edited. Leave out to write a new one. */
  thanksgivingId?: string;
  initial?: ThanksgivingDraft;
  categories: Pick<Category, "id" | "name">[];
  prayers: { id: string; title: string }[];
};

/** The form for writing or editing a thanksgiving. */
export function ThanksgivingForm({ thanksgivingId, initial, categories, prayers }: Props) {
  const router = useRouter();
  const hydrated = useHydrated();
  const profile = useProfile();
  const editing = Boolean(thanksgivingId);
  const start = initial ?? blank();
  const [draft, setDraft] = useState<ThanksgivingDraft>(start);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  // Chosen on the first save and kept, so a retry updates the same thanksgiving instead of making a second.
  const ids = useRef<{ thanksgiving: string; category: string } | null>(thanksgivingId ? { thanksgiving: thanksgivingId, category: newId() } : null);

  const set = (patch: Partial<ThanksgivingDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const backTo = editing ? `/thanksgiving/${thanksgivingId}` : "/thanksgiving";
  const dirty = JSON.stringify(draft) !== JSON.stringify(start);

  // Next keeps the previous screen alive, hidden. Clear a new form when it is hidden so the next visit is blank.
  useEffect(() => {
    if (editing) return;
    return () => {
      setDraft(blank());
      setErrors({});
      setFormError(null);
      setBusy(false);
      ids.current = null;
    };
  }, [editing]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    // Left empty, the day is today (the server does not know the person's day, so it is filled in here).
    const clean = normalizeDraft({ ...draft, happenedOn: draft.happenedOn || today() });
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
      ids.current ??= { thanksgiving: newId(), category: newId() };
      const id = await saveThanksgiving(ids.current, profile.id, clean);
      router.replace(`/thanksgiving/${id}`);
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
    <form onSubmit={onSubmit} method="post" noValidate className="flex flex-col gap-7">
      <TextField
        label="Title"
        name="title"
        value={draft.title}
        onChange={(e) => set({ title: e.target.value })}
        error={errors.title}
        hint={`A few words. Up to ${TITLE_MAX} characters.`}
        maxLength={TITLE_MAX * 2}
        autoComplete="off"
      />
      <TextArea
        label="What God did"
        name="body"
        rows={6}
        value={draft.body}
        onChange={(e) => set({ body: e.target.value })}
        error={errors.body}
        hint="Nothing is too small."
        maxLength={BODY_MAX * 2}
      />
      <TextField
        label="Day it happened"
        name="happened_on"
        type="date"
        value={draft.happenedOn}
        onChange={(e) => set({ happenedOn: e.target.value })}
        error={errors.happenedOn}
        hint={editing ? undefined : "Leave it empty for today."}
      />

      <div>
        <label htmlFor="category" className="eyebrow block text-muted">
          Category
        </label>
        <select id="category" name="category" className={selectClass} value={draft.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="new">New category…</option>
        </select>
        {draft.categoryId === "new" ? (
          <div className="mt-4 flex flex-col gap-4 rounded-card border border-hairline bg-surface p-4">
            <TextField
              label="Category name"
              name="new_category"
              value={draft.newCategoryName}
              onChange={(e) => set({ newCategoryName: e.target.value })}
              error={errors.newCategoryName}
              placeholder="For example Healing, Provision, Family"
              autoComplete="off"
            />
            <fieldset>
              <legend className="eyebrow text-muted">Glow</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {GLOWS.map((glow) => (
                  <label key={glow} className="relative inline-flex size-11 cursor-pointer items-center justify-center">
                    <input
                      type="radio"
                      name="glow"
                      value={glow}
                      checked={draft.newCategoryGlow === glow}
                      onChange={() => set({ newCategoryGlow: glow })}
                      aria-label={GLOW_LABELS[glow]}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      style={{ background: GLOW_COLORS[glow] }}
                      className="size-8 rounded-full border-2 border-white shadow-card peer-checked:ring-2 peer-checked:ring-forest peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}
      </div>

      <div>
        <label htmlFor="prayer" className="eyebrow block text-muted">
          Answer to which prayer? (optional)
        </label>
        <select
          id="prayer"
          name="prayer"
          className={selectClass}
          value={draft.prayerId}
          onChange={(e) => set({ prayerId: e.target.value, shared: e.target.value ? draft.shared : false })}
        >
          <option value="">Not linked to a prayer</option>
          {prayers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        {draft.prayerId ? (
          <label className="mt-4 flex min-h-tap cursor-pointer items-center gap-3 rounded-card border border-hairline bg-surface px-4 py-3">
            <input type="checkbox" name="shared" checked={draft.shared} onChange={(e) => set({ shared: e.target.checked })} className="size-5 accent-[var(--color-forest)]" />
            <span>
              Share with the people in this prayer
              <span className="block text-caption text-muted">Only you see it unless this is on.</span>
            </span>
          </label>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <FormError message={formError} />
        <Button type="submit" disabled={!hydrated} busy={busy} busyLabel="Saving…">
          {editing ? "Save changes" : "Save thanksgiving"}
        </Button>
        <Button variant="quiet" onClick={cancel} disabled={busy}>
          Cancel
        </Button>
      </div>

      <ConfirmDialog
        open={confirmingDiscard}
        title="Leave without saving?"
        description="What you wrote here will be lost."
        confirmLabel="Leave"
        cancelLabel="Keep writing"
        tone="danger"
        onConfirm={() => router.push(backTo)}
        onCancel={() => setConfirmingDiscard(false)}
      />
    </form>
  );
}
