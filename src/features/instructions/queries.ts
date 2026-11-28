import "server-only";
import { getCurrentProfile } from "@/features/profile/current-profile";
import { isUuid } from "@/features/prayers/validation";
import { createClient } from "@/lib/supabase/server";
import { toKind, type Instruction } from "./types";

// All reads of instructions and rituals go through this file. Row level security decides what comes back:
// your own, and ones shared with a prayer you are in.

const COLUMNS = "id, prayer_id, kind, body, received_on, done_on, frequency, visibility, author_id, profiles(display_name)";

type Row = {
  id: string;
  prayer_id: string;
  kind: string;
  body: string;
  received_on: string;
  done_on: string | null;
  frequency: string | null;
  visibility: string;
  author_id: string;
  profiles: { display_name: string | null } | null;
};

function toInstruction(row: Row, myId: string): Instruction {
  return {
    id: row.id,
    prayerId: row.prayer_id,
    kind: toKind(row.kind),
    body: row.body,
    receivedOn: row.received_on,
    doneOn: row.done_on,
    frequency: row.frequency,
    shared: row.visibility === "shared",
    isMine: row.author_id === myId,
    authorName: row.profiles?.display_name ?? null,
  };
}

/** The instructions and rituals on a prayer that the signed-in person may see, oldest first. */
export async function listInstructions(prayerId: string): Promise<Instruction[]> {
  if (!isUuid(prayerId)) return [];
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prayer_instructions")
    .select(COLUMNS)
    .eq("prayer_id", prayerId)
    .order("received_on")
    .order("created_at");
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map((row) => toInstruction(row, profile.id));
}

/** One instruction or ritual, or null when it does not exist or is not the person's to see. */
export async function getInstruction(id: string): Promise<Instruction | null> {
  if (!isUuid(id)) return null;
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.from("prayer_instructions").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toInstruction(data as unknown as Row, profile.id) : null;
}
