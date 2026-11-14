import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/current-profile";
import { toKind, toStatus, type PrayerDetail, type PrayerSummary } from "./types";
import { isUuid } from "./validation";

// All reads of prayers go through this file. Every query runs as the signed-in person,
// so row level security decides what comes back: their own prayers and the ones they joined.

type Hours = { mySeconds: number; groupSeconds: number };

async function getHours(ids: string[]): Promise<Map<string, Hours>> {
  const hours = new Map<string, Hours>();
  if (ids.length === 0) return hours;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_prayer_hours", { prayer_ids: ids });
  if (error) throw error;
  for (const row of data ?? []) {
    hours.set(row.prayer_id, { mySeconds: Number(row.my_seconds), groupSeconds: Number(row.group_seconds) });
  }
  return hours;
}

const SUMMARY_COLUMNS = "id, title, kind, status, target_hours, planned_start_date, planned_end_date, owner_id";

/** The signed-in person's prayers and altars, newest first, with hours and point counts. */
export async function listMyPrayers(): Promise<PrayerSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prayers")
    .select(`${SUMMARY_COLUMNS}, prayer_points(count)`)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  const hours = await getHours(rows.map((row) => row.id));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    kind: toKind(row.kind),
    status: toStatus(row.status),
    targetHours: row.target_hours,
    plannedStartDate: row.planned_start_date,
    plannedEndDate: row.planned_end_date,
    pointCount: row.prayer_points[0]?.count ?? 0,
    mySeconds: hours.get(row.id)?.mySeconds ?? 0,
    groupSeconds: hours.get(row.id)?.groupSeconds ?? 0,
  }));
}

/**
 * One prayer with its points and scriptures, or null.
 * Null covers both "does not exist" and "not yours to see": the caller shows the same not-found page.
 */
export async function getPrayer(id: string): Promise<PrayerDetail | null> {
  // Anything that is not an id cannot match a row, and would be a database error if sent.
  if (!isUuid(id)) return null;

  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("prayers")
    .select(`${SUMMARY_COLUMNS}, prayer_points(id, body, position), scriptures(id, reference, verse_text, translation, position)`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const hours = (await getHours([row.id])).get(row.id);
  const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

  return {
    id: row.id,
    title: row.title,
    kind: toKind(row.kind),
    status: toStatus(row.status),
    targetHours: row.target_hours,
    plannedStartDate: row.planned_start_date,
    plannedEndDate: row.planned_end_date,
    pointCount: row.prayer_points.length,
    mySeconds: hours?.mySeconds ?? 0,
    groupSeconds: hours?.groupSeconds ?? 0,
    isOwner: row.owner_id === profile.id,
    points: [...row.prayer_points].sort(byPosition).map((p) => ({ id: p.id, body: p.body })),
    scriptures: [...row.scriptures].sort(byPosition).map((s) => ({
      id: s.id,
      reference: s.reference,
      verseText: s.verse_text ?? "",
      translation: s.translation ?? "",
    })),
  };
}
