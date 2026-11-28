import type { InstructionDraft } from "./types";

export const BODY_MAX = 500;
export const FREQUENCY_MAX = 80;
const length = (v: string) => [...v].length;

export function normalizeDraft(d: InstructionDraft): InstructionDraft {
  return {
    ...d,
    body: d.body.trim(),
    frequency: d.kind === "ritual" ? d.frequency.trim().replace(/\s+/g, " ") : "",
  };
}

export type DraftErrors = { body?: string; frequency?: string; receivedOn?: string };

export function validateDraft(d: InstructionDraft): { ok: boolean; errors: DraftErrors } {
  const errors: DraftErrors = {};
  if (!d.body) errors.body = "Write down what you were told to do.";
  else if (length(d.body) > BODY_MAX) errors.body = `Use ${BODY_MAX} characters or fewer.`;
  if (d.kind === "ritual") {
    if (!d.frequency) errors.frequency = "Say how often, for example Daily or Every Wednesday.";
    else if (length(d.frequency) > FREQUENCY_MAX) errors.frequency = `Use ${FREQUENCY_MAX} characters or fewer.`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.receivedOn)) errors.receivedOn = "Choose the day you received it.";
  return { ok: Object.keys(errors).length === 0, errors };
}
