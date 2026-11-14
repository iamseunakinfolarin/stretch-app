import { describe, expect, it } from "vitest";
import { countLabel, formatDate, formatHours, formatPlan, kindLabel, targetProgress } from "./format";

describe("formatHours", () => {
  it.each([
    [0, "0h"],
    [59, "0h"],
    [60, "1m"],
    [1500, "25m"],
    [3600, "1h"],
    [5400, "1h 30m"],
    [43200, "12h"],
    [3600 * 1234 + 120, "1,234h 2m"],
    [-10, "0h"],
  ])("%i seconds is %s", (seconds, expected) => {
    expect(formatHours(seconds)).toBe(expected);
  });
});

describe("formatDate", () => {
  it("shows a calendar day without shifting it", () => {
    expect(formatDate("2026-12-01")).toBe("1 Dec 2026");
    expect(formatDate("2026-01-31")).toBe("31 Jan 2026");
  });
  it("returns the text unchanged when it is not a date", () => {
    expect(formatDate("soon")).toBe("soon");
  });
});

describe("formatPlan", () => {
  const none = { targetHours: null, plannedStartDate: null, plannedEndDate: null };
  it("is null when there is no plan", () => {
    expect(formatPlan(none)).toBeNull();
  });
  it("describes a target, a start, or a full range", () => {
    expect(formatPlan({ ...none, targetHours: 40 })).toBe("40h target");
    expect(formatPlan({ ...none, plannedStartDate: "2026-12-01" })).toBe("from 1 Dec 2026");
    expect(formatPlan({ targetHours: 40, plannedStartDate: "2026-12-01", plannedEndDate: "2026-12-31" })).toBe(
      "40h target · 1 Dec 2026 to 31 Dec 2026",
    );
  });
});

describe("targetProgress", () => {
  it("is null without a target", () => {
    expect(targetProgress(3600, null)).toBeNull();
  });
  it("is a percentage, capped at 100", () => {
    expect(targetProgress(0, 10)).toBe(0);
    expect(targetProgress(3600 * 5, 10)).toBe(50);
    expect(targetProgress(3600 * 50, 10)).toBe(100);
  });
});

describe("labels", () => {
  it("counts with the right word", () => {
    expect(countLabel(0, "point")).toBe("0 points");
    expect(countLabel(1, "point")).toBe("1 point");
    expect(countLabel(2, "prayer")).toBe("2 prayers");
  });
  it("names the two kinds", () => {
    expect(kindLabel("altar")).toBe("Altar");
    expect(kindLabel("prayer")).toBe("Prayer");
  });
});
