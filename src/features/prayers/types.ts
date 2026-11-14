import type { Database } from "@/types/database";

type PrayerRow = Database["public"]["Tables"]["prayers"]["Row"];

/** The database stores these as text with a check constraint; here they are exact. */
export type PrayerKind = "prayer" | "altar";
export type PrayerStatus = "planned" | "active" | "archived";

export type PrayerPoint = { id: string; body: string };

export type Scripture = { id: string; reference: string; verseText: string; translation: string };

/** What the lists and tiles show. */
export type PrayerSummary = {
  id: PrayerRow["id"];
  title: string;
  kind: PrayerKind;
  status: PrayerStatus;
  targetHours: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  pointCount: number;
  /** Seconds the signed-in person has prayed for this prayer. */
  mySeconds: number;
  /** Seconds everyone in the prayer has prayed. */
  groupSeconds: number;
};

/** Everything the detail and edit screens need. */
export type PrayerDetail = PrayerSummary & {
  isOwner: boolean;
  points: PrayerPoint[];
  scriptures: Scripture[];
};

/** What the form edits and what gets saved. Text fields stay as typed until saving. */
export type PrayerDraft = {
  kind: PrayerKind;
  title: string;
  targetHours: string;
  plannedStartDate: string;
  plannedEndDate: string;
  points: PrayerPoint[];
  scriptures: Scripture[];
};

export function toKind(value: string): PrayerKind {
  return value === "altar" ? "altar" : "prayer";
}

export function toStatus(value: string): PrayerStatus {
  return value === "archived" || value === "planned" ? value : "active";
}

export function isArchived(prayer: { status: PrayerStatus }): boolean {
  return prayer.status === "archived";
}
