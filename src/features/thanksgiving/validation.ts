// Input checks for thanksgivings and their categories. The database enforces the same limits;
// these give a clear message first.

import { GLOWS, type ThanksgivingDraft } from "./types";

export const TITLE_MAX = 80;
export const BODY_MAX = 5000;
export const CATEGORY_MAX = 40;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const length = (value: string) => [...value].length;

export function validateTitle(value: string): string | null {
  const title = value.trim();
  if (!title) return "Give it a short title.";
  if (length(title) > TITLE_MAX) return `Use ${TITLE_MAX} characters or fewer.`;
  return null;
}

export function validateBody(value: string): string | null {
  const body = value.trim();
  if (!body) return "Write what God did, even a line.";
  if (length(body) > BODY_MAX) return `Use ${BODY_MAX.toLocaleString("en")} characters or fewer.`;
  return null;
}

export function validateCategoryName(value: string): string | null {
  const name = value.trim();
  if (!name) return "Name the category.";
  if (length(name) > CATEGORY_MAX) return `Use ${CATEGORY_MAX} characters or fewer.`;
  return null;
}

export function validateDay(value: string): string | null {
  if (!ISO_DATE.test(value)) return "Choose the day it happened.";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "Enter a real date.";
  return null;
}

export function normalizeDraft(draft: ThanksgivingDraft): ThanksgivingDraft {
  const linked = Boolean(draft.prayerId);
  return {
    ...draft,
    title: draft.title.trim().replace(/\s+/g, " "),
    body: draft.body.trim(),
    newCategoryName: draft.newCategoryName.trim().replace(/\s+/g, " "),
    // Only something linked to a prayer can be shared with the people in it.
    shared: linked && draft.shared,
  };
}

export type DraftErrors = { title?: string; body?: string; happenedOn?: string; newCategoryName?: string };

export function validateDraft(draft: ThanksgivingDraft): { ok: boolean; errors: DraftErrors } {
  const errors: DraftErrors = {};
  const title = validateTitle(draft.title);
  if (title) errors.title = title;
  const body = validateBody(draft.body);
  if (body) errors.body = body;
  const day = validateDay(draft.happenedOn);
  if (day) errors.happenedOn = day;
  if (draft.categoryId === "new") {
    const name = validateCategoryName(draft.newCategoryName);
    if (name) errors.newCategoryName = name;
    if (!GLOWS.includes(draft.newCategoryGlow)) errors.newCategoryName = "Choose a glow.";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
