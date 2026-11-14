// Input checks for prayers, altars, prayer points and key scriptures.
// The database enforces the same rules (or wider ones); these give a clear message first.

import type { PrayerDraft, PrayerPoint, Scripture } from "./types";

export const TITLE_MAX = 80;
export const POINT_MAX = 300;
export const POINTS_LIMIT = 20;
export const REFERENCE_MAX = 60;
export const VERSE_MAX = 1000;
export const TRANSLATION_MAX = 20;
export const SCRIPTURES_LIMIT = 10;
export const TARGET_HOURS_MAX = 10000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

const length = (value: string) => [...value].length;

export function validateTitle(value: string): string | null {
  const title = value.trim();
  if (!title) return "Give it a title.";
  if (length(title) > TITLE_MAX) return `Use ${TITLE_MAX} characters or fewer.`;
  return null;
}

/** An empty target is fine: the plan is optional. */
export function validateTargetHours(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d+$/.test(text)) return "Enter a whole number of hours.";
  const hours = Number(text);
  if (hours < 1) return "Enter at least 1 hour.";
  if (hours > TARGET_HOURS_MAX) return `Enter ${TARGET_HOURS_MAX.toLocaleString("en")} hours or fewer.`;
  return null;
}

function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Dates are optional, but an end date needs a start date and cannot come before it. */
export function validateDates(start: string, end: string): string | null {
  if (start && !isRealDate(start)) return "Enter a real start date.";
  if (end && !isRealDate(end)) return "Enter a real end date.";
  if (end && !start) return "Add a start date, or clear the end date.";
  if (start && end && end < start) return "The end date can't be before the start date.";
  return null;
}

export function validatePoint(body: string): string | null {
  const text = body.trim();
  if (!text) return "Write the prayer point, or remove it.";
  if (length(text) > POINT_MAX) return `Use ${POINT_MAX} characters or fewer.`;
  return null;
}

export type ScriptureErrors = { reference?: string; verseText?: string; translation?: string };

export function validateScripture(scripture: Scripture): ScriptureErrors {
  const errors: ScriptureErrors = {};
  const reference = scripture.reference.trim();
  if (!reference) errors.reference = "Add the reference, for example Isaiah 41:10.";
  else if (length(reference) > REFERENCE_MAX) errors.reference = `Use ${REFERENCE_MAX} characters or fewer.`;
  if (length(scripture.verseText.trim()) > VERSE_MAX) errors.verseText = `Use ${VERSE_MAX.toLocaleString("en")} characters or fewer.`;
  if (length(scripture.translation.trim()) > TRANSLATION_MAX) errors.translation = `Use ${TRANSLATION_MAX} characters or fewer.`;
  return errors;
}

const isBlankPoint = (point: PrayerPoint) => !point.body.trim();
const isBlankScripture = (s: Scripture) => !s.reference.trim() && !s.verseText.trim() && !s.translation.trim();

/**
 * Tidies a draft before checking and saving it: trims text, drops rows left completely empty,
 * and removes dates from an altar, which has no end.
 */
export function normalizeDraft(draft: PrayerDraft): PrayerDraft {
  const isAltar = draft.kind === "altar";
  return {
    kind: draft.kind,
    title: draft.title.trim().replace(/\s+/g, " "),
    targetHours: draft.targetHours.trim(),
    plannedStartDate: isAltar ? "" : draft.plannedStartDate,
    plannedEndDate: isAltar ? "" : draft.plannedEndDate,
    points: draft.points.filter((p) => !isBlankPoint(p)).map((p) => ({ id: p.id, body: p.body.trim() })),
    scriptures: draft.scriptures
      .filter((s) => !isBlankScripture(s))
      .map((s) => ({ id: s.id, reference: s.reference.trim(), verseText: s.verseText.trim(), translation: s.translation.trim() })),
  };
}

export type DraftErrors = {
  title?: string;
  targetHours?: string;
  dates?: string;
  /** Too many points or scriptures. */
  points?: string;
  scriptures?: string;
  pointById: Record<string, string>;
  scriptureById: Record<string, ScriptureErrors>;
};

/** Checks a normalized draft. `ok` is true when there is nothing to fix. */
export function validateDraft(draft: PrayerDraft): { ok: boolean; errors: DraftErrors } {
  const errors: DraftErrors = { pointById: {}, scriptureById: {} };

  const title = validateTitle(draft.title);
  if (title) errors.title = title;
  const target = validateTargetHours(draft.targetHours);
  if (target) errors.targetHours = target;
  const dates = validateDates(draft.plannedStartDate, draft.plannedEndDate);
  if (dates) errors.dates = dates;

  if (draft.points.length > POINTS_LIMIT) errors.points = `A prayer can have up to ${POINTS_LIMIT} prayer points.`;
  for (const point of draft.points) {
    const error = validatePoint(point.body);
    if (error) errors.pointById[point.id] = error;
  }

  if (draft.scriptures.length > SCRIPTURES_LIMIT) errors.scriptures = `A prayer can have up to ${SCRIPTURES_LIMIT} key scriptures.`;
  for (const scripture of draft.scriptures) {
    const error = validateScripture(scripture);
    if (Object.keys(error).length > 0) errors.scriptureById[scripture.id] = error;
  }

  const ok =
    !errors.title &&
    !errors.targetHours &&
    !errors.dates &&
    !errors.points &&
    !errors.scriptures &&
    Object.keys(errors.pointById).length === 0 &&
    Object.keys(errors.scriptureById).length === 0;
  return { ok, errors };
}

/** Moves one item up (-1) or down (+1). Returns the same list when the move is not possible. */
export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
