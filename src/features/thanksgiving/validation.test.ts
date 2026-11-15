import { describe, expect, it } from "vitest";
import type { ThanksgivingDraft } from "./types";
import { normalizeDraft, validateBody, validateCategoryName, validateDay, validateDraft, validateTitle } from "./validation";

const draft = (over: Partial<ThanksgivingDraft> = {}): ThanksgivingDraft => ({
  title: "Mum walked into church",
  body: "After months in bed, she walked in on her own.",
  happenedOn: "2026-11-14",
  prayerId: "",
  categoryId: "",
  newCategoryName: "",
  newCategoryGlow: "gold",
  shared: false,
  ...over,
});

describe("field checks", () => {
  it("asks for a title of 1 to 80 characters", () => {
    expect(validateTitle("")).toMatch(/title/);
    expect(validateTitle("   ")).toMatch(/title/);
    expect(validateTitle("x".repeat(80))).toBeNull();
    expect(validateTitle("x".repeat(81))).toMatch(/80/);
  });
  it("asks for something written, up to 5,000 characters", () => {
    expect(validateBody(" ")).toMatch(/Write what God did/);
    expect(validateBody("A line")).toBeNull();
    expect(validateBody("x".repeat(5001))).toMatch(/5,000/);
  });
  it("names a category in 1 to 40 characters", () => {
    expect(validateCategoryName("")).toMatch(/Name/);
    expect(validateCategoryName("Healing")).toBeNull();
    expect(validateCategoryName("x".repeat(41))).toMatch(/40/);
  });
  it("wants a real day", () => {
    expect(validateDay("2026-11-14")).toBeNull();
    expect(validateDay("")).toMatch(/Choose/);
    expect(validateDay("2026-02-30")).toMatch(/real date/);
  });
});

describe("normalizeDraft", () => {
  it("tidies spaces", () => {
    const result = normalizeDraft(draft({ title: "  A   good   day ", body: "  Thank you  ", newCategoryName: " Family  life " }));
    expect(result.title).toBe("A good day");
    expect(result.body).toBe("Thank you");
    expect(result.newCategoryName).toBe("Family life");
  });
  it("only keeps shared on when it is linked to a prayer", () => {
    expect(normalizeDraft(draft({ shared: true })).shared).toBe(false);
    expect(normalizeDraft(draft({ shared: true, prayerId: "p1" })).shared).toBe(true);
  });
});

describe("validateDraft", () => {
  it("passes a good draft", () => {
    expect(validateDraft(draft()).ok).toBe(true);
  });
  it("marks everything that needs a look", () => {
    const result = validateDraft(draft({ title: "", body: "", happenedOn: "" }));
    expect(result.ok).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(["body", "happenedOn", "title"]);
  });
  it("needs a name when making a new category", () => {
    expect(validateDraft(draft({ categoryId: "new" })).errors.newCategoryName).toBeDefined();
    expect(validateDraft(draft({ categoryId: "new", newCategoryName: "Healing" })).ok).toBe(true);
  });
});
