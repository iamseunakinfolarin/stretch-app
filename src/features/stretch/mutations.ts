import { createClient } from "@/lib/supabase/client";
import type { FinishedStretch } from "./clock";
import { addPending, loadPending, removePending } from "./storage";

// All saving of stretches goes through this file.

/** The arguments for the complete_session database function. */
export function toCompleteSessionArgs(finished: FinishedStretch) {
  return {
    id: finished.id,
    prayer_id: finished.prayerId,
    started_at: new Date(finished.startedAt).toISOString(),
    ended_at: new Date(finished.endedAt).toISOString(),
    credited_seconds: finished.creditedSeconds,
    check_ins_shown: finished.checkInsShown,
    check_ins_confirmed: finished.checkInsConfirmed,
  };
}

/** Whether trying again later could work. A refusal from the database never will. */
export function isRetryable(error: unknown): boolean {
  if (!error || typeof error !== "object") return true;
  const e = error as { code?: string | null; message?: string | null; status?: number | null };
  if (e.code) return false;
  const message = (e.message ?? "").toLowerCase();
  return e.status === 0 || e.status === undefined || message.includes("fetch") || message.includes("network") || message.includes("load failed");
}

export type SaveResult = "saved" | "waiting" | "refused";

/**
 * Saves a finished stretch. It is written to the phone first, so a dropped connection,
 * a closed tab or a crash cannot lose it, and it stays there until the database has it.
 * The id was chosen when the stretch began, so saving twice changes nothing.
 */
export async function saveFinishedStretch(finished: FinishedStretch): Promise<SaveResult> {
  addPending(finished);
  return sendPending(finished);
}

async function sendPending(finished: FinishedStretch): Promise<SaveResult> {
  try {
    const { error } = await createClient().rpc("complete_session", toCompleteSessionArgs(finished));
    if (!error) {
      removePending(finished.id);
      return "saved";
    }
    if (isRetryable(error)) return "waiting";
    removePending(finished.id);
    return "refused";
  } catch {
    return "waiting";
  }
}

let flushing: Promise<number> | null = null;

/** Tries to save every stretch still waiting. Returns how many reached the database. */
export function flushPendingStretches(): Promise<number> {
  if (flushing) return flushing;
  flushing = (async () => {
    let saved = 0;
    for (const finished of loadPending()) {
      if ((await sendPending(finished)) === "saved") saved += 1;
    }
    return saved;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
