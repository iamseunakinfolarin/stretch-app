export type InstructionKind = "instruction" | "ritual";

/** Something God said to do: an instruction (done once) or a ritual (kept again and again). */
export type Instruction = {
  id: string;
  prayerId: string;
  kind: InstructionKind;
  body: string;
  /** Calendar days, YYYY-MM-DD. */
  receivedOn: string;
  doneOn: string | null;
  frequency: string | null;
  shared: boolean;
  isMine: boolean;
  authorName: string | null;
};

export type InstructionDraft = { kind: InstructionKind; body: string; frequency: string; receivedOn: string; shared: boolean };

export function toKind(value: string): InstructionKind {
  return value === "ritual" ? "ritual" : "instruction";
}
