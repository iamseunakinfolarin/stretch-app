import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ThanksgivingDraft } from "./types";

const calls: { table: string; action: string; values?: unknown; id?: string }[] = [];
let result: { data: unknown; error: unknown } = { data: [{ id: "x" }], error: null };

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => {
      const call = { table, action: "" } as (typeof calls)[number];
      calls.push(call);
      const chain = {
        upsert: (values: unknown) => ((call.action = "upsert"), (call.values = values), Promise.resolve(result)),
        delete: () => ((call.action = "delete"), chain),
        eq: (_c: string, id: string) => ((call.id = id), chain),
        select: () => Promise.resolve(result),
      };
      return chain;
    },
  }),
}));

import { deleteCategory, deleteThanksgiving, saveThanksgiving, toRow } from "./mutations";

const draft: ThanksgivingDraft = {
  title: "The rent was paid",
  body: "An envelope arrived.",
  happenedOn: "2026-11-14",
  prayerId: "prayer-1",
  categoryId: "new",
  newCategoryName: "Provision",
  newCategoryGlow: "amber",
  shared: true,
};

beforeEach(() => {
  calls.length = 0;
  result = { data: [{ id: "x" }], error: null };
});

describe("toRow", () => {
  it("shapes a draft, sharing only when linked to a prayer", () => {
    expect(toRow("t1", "me", draft, "c1")).toEqual({
      id: "t1",
      author_id: "me",
      title: "The rent was paid",
      body: "An envelope arrived.",
      happened_on: "2026-11-14",
      prayer_id: "prayer-1",
      category_id: "c1",
      visibility: "shared",
    });
    expect(toRow("t1", "me", { ...draft, prayerId: "" }, null)).toMatchObject({ prayer_id: null, category_id: null, visibility: "personal" });
  });
});

describe("saveThanksgiving", () => {
  it("makes the new category first, then the thanksgiving in it, with ids chosen by the caller", async () => {
    await saveThanksgiving({ thanksgiving: "t1", category: "c1" }, "me", draft);
    expect(calls.map((c) => c.table)).toEqual(["thanksgiving_categories", "thanksgivings"]);
    expect(calls[0].values).toEqual({ id: "c1", owner_id: "me", name: "Provision", glow: "amber" });
    expect(calls[1].values).toMatchObject({ id: "t1", category_id: "c1" });
  });
  it("leaves categories alone when one already exists or none is chosen", async () => {
    await saveThanksgiving({ thanksgiving: "t1", category: "c1" }, "me", { ...draft, categoryId: "existing" });
    expect(calls.map((c) => c.table)).toEqual(["thanksgivings"]);
    expect(calls[0].values).toMatchObject({ category_id: "existing" });
  });
  it("passes a refusal on", async () => {
    result = { data: null, error: { code: "23505" } };
    await expect(saveThanksgiving({ thanksgiving: "t1", category: "c1" }, "me", draft)).rejects.toMatchObject({ code: "23505" });
  });
});

describe("deleting", () => {
  it("deletes one row", async () => {
    await deleteThanksgiving("t1");
    await deleteCategory("c1");
    expect(calls.map((c) => `${c.action} ${c.table} ${c.id}`)).toEqual([
      "delete thanksgivings t1",
      "delete thanksgiving_categories c1",
    ]);
  });
  it("treats zero rows changed as not allowed", async () => {
    result = { data: [], error: null };
    await expect(deleteThanksgiving("t1")).rejects.toMatchObject({ code: "42501" });
  });
});
