import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";
import type { PrayerDraft } from "./types";

// All writes to prayers go through this file. Each runs as the signed-in person,
// so row level security has the final say on what is allowed.

/** The arguments for the save_prayer database function. `draft` must already be normalized and valid. */
export function toSavePrayerArgs(id: string, draft: PrayerDraft) {
  return {
    prayer_id: id,
    kind: draft.kind,
    title: draft.title,
    // The generated types mark these as required, but the function accepts null for "no plan".
    target_hours: (draft.targetHours ? Number(draft.targetHours) : null) as number,
    planned_start_date: (draft.plannedStartDate || null) as string,
    planned_end_date: (draft.plannedEndDate || null) as string,
    points: draft.points.map((point) => ({ id: point.id, body: point.body })) as Json,
    scriptures: draft.scriptures.map((s) => ({
      id: s.id,
      reference: s.reference,
      verse_text: s.verseText,
      translation: s.translation,
    })) as Json,
  };
}

/**
 * Creates or updates a prayer with its points and scriptures in one all-or-nothing step.
 * The id is chosen by the caller, so a retry after a dropped connection changes nothing.
 */
export async function savePrayer(id: string, draft: PrayerDraft): Promise<string> {
  const { data, error } = await createClient().rpc("save_prayer", toSavePrayerArgs(id, draft));
  if (error) throw error;
  return data;
}

/** A change that must touch exactly one row. Zero rows means it was not the caller's to change. */
async function changeOne(change: PromiseLike<{ data: { id: string }[] | null; error: unknown }>) {
  const { data, error } = await change;
  if (error) throw error;
  if (!data || data.length !== 1) throw { code: "42501" };
}

/** Sets a prayer aside. It leaves the active lists but keeps everything it has. */
export async function archivePrayer(id: string): Promise<void> {
  await changeOne(
    createClient()
      .from("prayers")
      .update({ status: "archived", archived_at: new Date().toISOString() })
      .eq("id", id)
      .select("id"),
  );
}

export async function reactivatePrayer(id: string): Promise<void> {
  await changeOne(
    // answered_at only makes sense on an archived prayer, so it is cleared with the archive date.
    createClient().from("prayers").update({ status: "active", archived_at: null, answered_at: null }).eq("id", id).select("id"),
  );
}

/** Deletes a prayer and everything under it: points, scriptures, members, notes and stretches. */
export async function deletePrayer(id: string): Promise<void> {
  await changeOne(createClient().from("prayers").delete().eq("id", id).select("id"));
}
