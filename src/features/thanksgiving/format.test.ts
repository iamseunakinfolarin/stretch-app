import { describe, expect, it } from "vitest";
import { countLabel, formatDay, today } from "./format";

describe("thanksgiving words", () => {
  it("formats a day without shifting it", () => {
    expect(formatDay("2026-11-14")).toBe("14 Nov 2026");
    expect(formatDay("2026-01-01")).toBe("1 Jan 2026");
  });
  it("gives today in the form the date field needs", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("counts", () => {
    expect(countLabel(1)).toBe("1 thanksgiving");
    expect(countLabel(0)).toBe("0 thanksgivings");
    expect(countLabel(12)).toBe("12 thanksgivings");
  });
});
