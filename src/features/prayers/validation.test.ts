import { describe, expect, it } from "vitest";
import type { PrayerDraft } from "./types";
import {
  isUuid,
  moveItem,
  normalizeDraft,
  validateDates,
  validateDraft,
  validatePoint,
  validateScripture,
  validateTargetHours,
  validateTitle,
} from "./validation";

const draft = (over: Partial<PrayerDraft> = {}): PrayerDraft => ({
  kind: "prayer",
  title: "For Mum's recovery",
  targetHours: "",
  plannedStartDate: "",
  plannedEndDate: "",
  points: [],
  scriptures: [],
  ...over,
});

describe("title", () => {
  it("needs 1 to 80 characters", () => {
    expect(validateTitle("")).toEqual(expect.any(String));
    expect(validateTitle("   ")).toEqual(expect.any(String));
    expect(validateTitle("A")).toBeNull();
    expect(validateTitle("x".repeat(80))).toBeNull();
    expect(validateTitle("x".repeat(81))).toEqual(expect.any(String));
  });
});

describe("target hours", () => {
  it("is optional", () => {
    expect(validateTargetHours("")).toBeNull();
    expect(validateTargetHours("  ")).toBeNull();
  });
  it("accepts whole hours from 1 to 10,000", () => {
    expect(validateTargetHours("1")).toBeNull();
    expect(validateTargetHours("10000")).toBeNull();
    expect(validateTargetHours("0")).toEqual(expect.any(String));
    expect(validateTargetHours("10001")).toEqual(expect.any(String));
  });
  it.each(["1.5", "-3", "ten", "1e3", "12h"])("refuses %j", (value) => {
    expect(validateTargetHours(value)).toEqual(expect.any(String));
  });
});

describe("dates", () => {
  it("are optional", () => {
    expect(validateDates("", "")).toBeNull();
    expect(validateDates("2026-12-01", "")).toBeNull();
  });
  it("need the end on or after the start", () => {
    expect(validateDates("2026-12-01", "2026-12-31")).toBeNull();
    expect(validateDates("2026-12-01", "2026-12-01")).toBeNull();
    expect(validateDates("2026-12-02", "2026-12-01")).toEqual(expect.any(String));
  });
  it("need a start date when there is an end date", () => {
    expect(validateDates("", "2026-12-31")).toEqual(expect.any(String));
  });
  it("refuse dates that do not exist", () => {
    expect(validateDates("2026-02-30", "")).toEqual(expect.any(String));
    expect(validateDates("next week", "")).toEqual(expect.any(String));
  });
});

describe("prayer points and scriptures", () => {
  it("limit a point to 300 characters", () => {
    expect(validatePoint("Peace in our home")).toBeNull();
    expect(validatePoint("x".repeat(300))).toBeNull();
    expect(validatePoint("x".repeat(301))).toEqual(expect.any(String));
    expect(validatePoint("  ")).toEqual(expect.any(String));
  });
  it("need a reference on a scripture", () => {
    expect(validateScripture({ id: "1", reference: "Isaiah 41:10", verseText: "", translation: "" })).toEqual({});
    expect(validateScripture({ id: "1", reference: "", verseText: "Fear thou not", translation: "KJV" }).reference).toEqual(expect.any(String));
  });
  it("limit reference, verse and translation lengths", () => {
    const errors = validateScripture({ id: "1", reference: "x".repeat(61), verseText: "x".repeat(1001), translation: "x".repeat(21) });
    expect(Object.keys(errors).sort()).toEqual(["reference", "translation", "verseText"]);
  });
});

describe("normalizeDraft", () => {
  it("trims text and drops rows left completely empty", () => {
    const result = normalizeDraft(
      draft({
        title: "  For   Mum's recovery ",
        points: [
          { id: "a", body: "  Strength each day " },
          { id: "b", body: "   " },
        ],
        scriptures: [
          { id: "s", reference: " Psalm 41:3 ", verseText: " ", translation: " KJV " },
          { id: "t", reference: "", verseText: "", translation: " " },
        ],
      }),
    );
    expect(result.title).toBe("For Mum's recovery");
    expect(result.points).toEqual([{ id: "a", body: "Strength each day" }]);
    expect(result.scriptures).toEqual([{ id: "s", reference: "Psalm 41:3", verseText: "", translation: "KJV" }]);
  });
  it("removes dates from an altar, which has no end", () => {
    const result = normalizeDraft(draft({ kind: "altar", plannedStartDate: "2026-12-01", plannedEndDate: "2026-12-31", targetHours: " 100 " }));
    expect(result.plannedStartDate).toBe("");
    expect(result.plannedEndDate).toBe("");
    expect(result.targetHours).toBe("100");
  });
});

describe("validateDraft", () => {
  it("passes a complete, sensible draft", () => {
    const result = validateDraft(
      draft({
        targetHours: "40",
        plannedStartDate: "2026-12-01",
        plannedEndDate: "2026-12-31",
        points: [{ id: "a", body: "Strength each day" }],
        scriptures: [{ id: "s", reference: "Psalm 41:3", verseText: "", translation: "" }],
      }),
    );
    expect(result.ok).toBe(true);
  });
  it("reports each problem against the right field", () => {
    const result = validateDraft(
      draft({
        title: "",
        targetHours: "0",
        plannedEndDate: "2026-12-31",
        points: [{ id: "a", body: "x".repeat(301) }],
        scriptures: [{ id: "s", reference: "", verseText: "Text with no reference", translation: "" }],
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors.title).toBeDefined();
    expect(result.errors.targetHours).toBeDefined();
    expect(result.errors.dates).toBeDefined();
    expect(result.errors.pointById.a).toBeDefined();
    expect(result.errors.scriptureById.s.reference).toBeDefined();
  });
  it("limits a prayer to 20 points and 10 scriptures", () => {
    const points = Array.from({ length: 21 }, (_, i) => ({ id: `p${i}`, body: `Point ${i}` }));
    const scriptures = Array.from({ length: 11 }, (_, i) => ({ id: `s${i}`, reference: `Psalm ${i + 1}`, verseText: "", translation: "" }));
    expect(validateDraft(draft({ points })).errors.points).toBeDefined();
    expect(validateDraft(draft({ scriptures })).errors.scriptures).toBeDefined();
    expect(validateDraft(draft({ points: points.slice(0, 20), scriptures: scriptures.slice(0, 10) })).ok).toBe(true);
  });
});

describe("moveItem", () => {
  it("moves an item up or down", () => {
    expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
  });
  it("leaves the list alone at the ends", () => {
    const list = ["a", "b"];
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 1, 1)).toBe(list);
  });
});

describe("isUuid", () => {
  it("recognises ids and refuses anything else", () => {
    expect(isUuid("10000000-0000-4000-a000-000000000001")).toBe(true);
    expect(isUuid("example-id")).toBe(false);
    expect(isUuid("10000000-0000-4000-a000-000000000001' or 1=1")).toBe(false);
  });
});
