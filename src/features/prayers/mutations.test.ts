import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrayerDraft } from "./types";

// A stand-in for the Supabase client that records what it was asked to do.
const calls: { table?: string; action?: string; values?: unknown; id?: string; rpc?: string; args?: unknown }[] = [];
let result: { data: unknown; error: unknown } = { data: [{ id: "p1" }], error: null };

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    rpc: (name: string, args: unknown) => {
      calls.push({ rpc: name, args });
      return Promise.resolve(result);
    },
    from: (table: string) => {
      const call: (typeof calls)[number] = { table };
      calls.push(call);
      const chain = {
        update: (values: unknown) => ((call.action = "update"), (call.values = values), chain),
        delete: () => ((call.action = "delete"), chain),
        eq: (_column: string, id: string) => ((call.id = id), chain),
        select: () => Promise.resolve(result),
      };
      return chain;
    },
  }),
}));

import { archivePrayer, deletePrayer, reactivatePrayer, savePrayer, toSavePrayerArgs } from "./mutations";

const draft: PrayerDraft = {
  kind: "altar",
  title: "Morning watch",
  targetHours: "100",
  plannedStartDate: "",
  plannedEndDate: "",
  points: [
    { id: "a", body: "Thank God for today" },
    { id: "b", body: "Pray for the family" },
  ],
  scriptures: [{ id: "s", reference: "Psalm 5:3", verseText: "My voice shalt thou hear in the morning", translation: "KJV" }],
};

beforeEach(() => {
  calls.length = 0;
  result = { data: [{ id: "p1" }], error: null };
});

describe("toSavePrayerArgs", () => {
  it("shapes a draft for the save_prayer function, keeping the order of points", () => {
    expect(toSavePrayerArgs("p1", draft)).toEqual({
      prayer_id: "p1",
      kind: "altar",
      title: "Morning watch",
      target_hours: 100,
      planned_start_date: null,
      planned_end_date: null,
      points: [
        { id: "a", body: "Thank God for today" },
        { id: "b", body: "Pray for the family" },
      ],
      scriptures: [{ id: "s", reference: "Psalm 5:3", verse_text: "My voice shalt thou hear in the morning", translation: "KJV" }],
    });
  });
  it("sends no plan as nulls, and dates as given", () => {
    const args = toSavePrayerArgs("p1", { ...draft, kind: "prayer", targetHours: "", plannedStartDate: "2026-12-01", plannedEndDate: "2026-12-31" });
    expect(args.target_hours).toBeNull();
    expect(args.planned_start_date).toBe("2026-12-01");
    expect(args.planned_end_date).toBe("2026-12-31");
  });
});

describe("savePrayer", () => {
  it("makes one call to save_prayer and returns the id", async () => {
    result = { data: "p1", error: null };
    await expect(savePrayer("p1", draft)).resolves.toBe("p1");
    expect(calls).toHaveLength(1);
    expect(calls[0].rpc).toBe("save_prayer");
  });
  it("passes a database error on", async () => {
    result = { data: null, error: { code: "42501" } };
    await expect(savePrayer("p1", draft)).rejects.toEqual({ code: "42501" });
  });
});

describe("archive, reactivate and delete", () => {
  it("archive sets the status and the archive date on that one prayer", async () => {
    await archivePrayer("p1");
    expect(calls[0]).toMatchObject({ table: "prayers", action: "update", id: "p1" });
    expect(calls[0].values).toMatchObject({ status: "archived", archived_at: expect.any(String) });
  });
  it("reactivate clears the archive and answered dates", async () => {
    await reactivatePrayer("p1");
    expect(calls[0].values).toEqual({ status: "active", archived_at: null, answered_at: null });
  });
  it("delete removes that one prayer", async () => {
    await deletePrayer("p1");
    expect(calls[0]).toMatchObject({ table: "prayers", action: "delete", id: "p1" });
  });
  it("treats zero rows changed as not allowed, rather than as success", async () => {
    result = { data: [], error: null };
    await expect(archivePrayer("p1")).rejects.toEqual({ code: "42501" });
    await expect(reactivatePrayer("p1")).rejects.toEqual({ code: "42501" });
    await expect(deletePrayer("p1")).rejects.toEqual({ code: "42501" });
  });
});
