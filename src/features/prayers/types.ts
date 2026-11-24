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
  /** Prayers only: hours to pray in total. Altars have a weekly commitment instead. */
  targetHours: number | null;
  /** Hours to pray each week, or null. */
  commitmentHours: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  pointCount: number;
  /** True when the signed-in person made it; false when they joined someone else's. */
  isOwner: boolean;
  /** Seconds the signed-in person has prayed for this prayer. */
  mySeconds: number;
  /** Seconds everyone in the prayer has prayed. */
  groupSeconds: number;
};

/** Everything the detail and edit screens need. */
export type PrayerDetail = PrayerSummary & {
  /** How many people are in this prayer, the owner included. */
  memberCount: number;
  points: PrayerPoint[];
  scriptures: Scripture[];
};

/** What the form edits and what gets saved. Text fields stay as typed until saving. */
export type PrayerDraft = {
  kind: PrayerKind;
  title: string;
  targetHours: string;
  commitmentHours: string;
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

/** How the signed-in person is doing against the weekly commitment. */
export type CommitmentStatus = {
  commitmentHours: number;
  completedWeeks: number;
  thisWeekSeconds: number;
  /** Seconds short of the commitment over finished weeks. Zero once they have caught up. */
  shortfallSeconds: number;
};

/** Someone in a prayer. */
export type Member = { userId: string; name: string; isOwner: boolean; isMe: boolean };

/** What an invite link shows before joining. */
export type InvitePreview = { title: string; kind: PrayerKind; ownerFirstName: string | null; archived: boolean; alreadyMember: boolean };
