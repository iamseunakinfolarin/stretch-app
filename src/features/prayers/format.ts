// Turns stored values into the words shown on screen.

import type { PrayerKind } from "./types";

/** "0h", "25m", "1h 30m", "12h". Time prayed is shown without seconds. */
export function formatHours(seconds: number): string {
  const totalMinutes = Math.floor(Math.max(0, seconds) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return minutes === 0 ? "0h" : `${minutes}m`;
  return minutes === 0 ? `${hours.toLocaleString("en")}h` : `${hours.toLocaleString("en")}h ${minutes}m`;
}

/** "1 Dec 2026". Dates are calendar days, so they are read as UTC to avoid shifting by a day. */
export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export type Plan = { targetHours: number | null; plannedStartDate: string | null; plannedEndDate: string | null };

/** "40h target · 1 Dec 2026 to 31 Dec 2026", or null when there is no plan. */
export function formatPlan(plan: Plan): string | null {
  const parts: string[] = [];
  if (plan.targetHours) parts.push(`${plan.targetHours.toLocaleString("en")}h target`);
  if (plan.plannedStartDate && plan.plannedEndDate) {
    parts.push(`${formatDate(plan.plannedStartDate)} to ${formatDate(plan.plannedEndDate)}`);
  } else if (plan.plannedStartDate) {
    parts.push(`from ${formatDate(plan.plannedStartDate)}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** How far along a target is, from 0 to 100. Null when there is no target. */
export function targetProgress(seconds: number, targetHours: number | null): number | null {
  if (!targetHours) return null;
  return Math.min(100, Math.round((Math.max(0, seconds) / (targetHours * 3600)) * 100));
}

export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function kindLabel(kind: PrayerKind): string {
  return kind === "altar" ? "Altar" : "Prayer";
}
