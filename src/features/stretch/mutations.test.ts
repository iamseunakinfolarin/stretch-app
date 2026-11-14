import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FinishedStretch } from "./clock";

const calls: { name: string; args: unknown }[] = [];
let result: { error: unknown } = { error: null };
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    rpc: (name: string, args: unknown) => {
      calls.push({ name, args });
      return Promise.resolve(result);
    },
  }),
}));

import { flushPendingStretches, isRetryable, saveFinishedStretch, toCompleteSessionArgs } from "./mutations";
import { loadPending } from "./storage";

const finished: FinishedStretch = {
  id: "4f1c8f0e-0000-4000-8000-000000000001",
  prayerId: "4f1c8f0e-0000-4000-8000-000000000002",
  startedAt: Date.UTC(2026, 10, 14, 6, 0, 0),
  endedAt: Date.UTC(2026, 10, 14, 6, 20, 0),
  creditedSeconds: 1100,
  checkInsShown: 3,
  checkInsConfirmed: 2,
};

beforeEach(() => {
  calls.length = 0;
  result = { error: null };
  window.localStorage.clear();
});

describe("saving a stretch", () => {
  it("sends the times, credit and check-ins to complete_session", () => {
    expect(toCompleteSessionArgs(finished)).toEqual({
      id: finished.id,
      prayer_id: finished.prayerId,
      started_at: "2026-11-14T06:00:00.000Z",
      ended_at: "2026-11-14T06:20:00.000Z",
      credited_seconds: 1100,
      check_ins_shown: 3,
      check_ins_confirmed: 2,
    });
  });

  it("clears the waiting copy once the database has it", async () => {
    expect(await saveFinishedStretch(finished)).toBe("saved");
    expect(calls).toHaveLength(1);
    expect(loadPending()).toEqual([]);
  });

  it("keeps it waiting when the connection is down, then saves it later with the same id", async () => {
    result = { error: { message: "Failed to fetch", status: 0 } };
    expect(await saveFinishedStretch(finished)).toBe("waiting");
    expect(loadPending()).toHaveLength(1);

    result = { error: null };
    expect(await flushPendingStretches()).toBe(1);
    expect(loadPending()).toEqual([]);
    expect((calls[1].args as { id: string }).id).toBe(finished.id);
  });

  it("drops a stretch the database refuses, instead of retrying for ever", async () => {
    result = { error: { code: "42501", message: "no" } };
    expect(await saveFinishedStretch(finished)).toBe("refused");
    expect(loadPending()).toEqual([]);
  });

  it("tells retryable errors from refusals", () => {
    expect(isRetryable({ message: "Failed to fetch" })).toBe(true);
    expect(isRetryable({ code: "23514" })).toBe(false);
    expect(isRetryable(null)).toBe(true);
  });
});
