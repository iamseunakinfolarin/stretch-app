import { createClient } from "@/lib/supabase/client";
import type { InstructionDraft } from "./types";

// All writes to instructions and rituals go through this file. Row level security has the final say.

export function toRow(id: string, prayerId: string, authorId: string, d: InstructionDraft, doneOn: string | null = null) {
  return {
    id,
    prayer_id: prayerId,
    author_id: authorId,
    kind: d.kind,
    body: d.body,
    received_on: d.receivedOn,
    frequency: d.kind === "ritual" ? d.frequency : null,
    // A ritual is never "done"; making an instruction into a ritual clears it.
    done_on: d.kind === "ritual" ? null : doneOn,
    visibility: d.shared ? "shared" : "personal",
  };
}

/** Saves an instruction or ritual. The id is chosen by the caller, so saving twice changes nothing. */
export async function saveInstruction(id: string, prayerId: string, authorId: string, d: InstructionDraft, doneOn: string | null = null) {
  const { error } = await createClient().from("prayer_instructions").upsert(toRow(id, prayerId, authorId, d, doneOn));
  if (error) throw error;
}

async function changeOne(change: PromiseLike<{ data: { id: string }[] | null; error: unknown }>) {
  const { data, error } = await change;
  if (error) throw error;
  if (!data || data.length === 0) throw { code: "42501" };
}

/** Marks an instruction done on a day, or not done (null). */
export function setDone(id: string, doneOn: string | null) {
  return changeOne(createClient().from("prayer_instructions").update({ done_on: doneOn }).eq("id", id).select("id"));
}

export function deleteInstruction(id: string) {
  return changeOne(createClient().from("prayer_instructions").delete().eq("id", id).select("id"));
}
