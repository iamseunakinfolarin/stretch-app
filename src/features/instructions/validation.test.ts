import { describe, expect, it } from "vitest";
import type { InstructionDraft } from "./types";
import { normalizeDraft, validateDraft } from "./validation";

const draft = (over: Partial<InstructionDraft> = {}): InstructionDraft => ({
  kind: "instruction",
  body: "Call your brother today",
  frequency: "",
  receivedOn: "2026-11-28",
  shared: false,
  ...over,
});

describe("instructions", () => {
  it("passes a good instruction and a good ritual", () => {
    expect(validateDraft(draft()).ok).toBe(true);
    expect(validateDraft(draft({ kind: "ritual", body: "Pray at 5am", frequency: "Daily" })).ok).toBe(true);
  });
  it("needs something written, up to 500 characters", () => {
    expect(validateDraft(draft({ body: "" })).errors.body).toMatch(/Write down/);
    expect(validateDraft(draft({ body: "x".repeat(501) })).errors.body).toMatch(/500/);
  });
  it("needs how often for a ritual, and drops it for an instruction", () => {
    expect(validateDraft(draft({ kind: "ritual" })).errors.frequency).toMatch(/how often/);
    expect(normalizeDraft(draft({ frequency: "Daily" })).frequency).toBe("");
    expect(normalizeDraft(draft({ kind: "ritual", frequency: "  Every   Wednesday " })).frequency).toBe("Every Wednesday");
  });
  it("needs a day", () => {
    expect(validateDraft(draft({ receivedOn: "" })).errors.receivedOn).toBeDefined();
  });
});
