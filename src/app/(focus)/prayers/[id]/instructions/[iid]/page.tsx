import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { InstructionForm } from "@/features/instructions/InstructionForm";
import { getInstruction } from "@/features/instructions/queries";

export const metadata: Metadata = { title: "Edit instruction" };

export default async function EditInstructionPage({ params }: { params: Promise<{ id: string; iid: string }> }) {
  const { id, iid } = await params;
  const item = await getInstruction(iid);
  // Only the person who received it edits it; anyone else gets not-found.
  if (!item || !item.isMine || item.prayerId !== id) notFound();

  return (
    <>
      <BackLink href={`/prayers/${id}`}>Back</BackLink>
      <h1 className="mt-4 mb-8 text-title font-bold text-forest">{item.kind === "ritual" ? "Edit ritual" : "Edit instruction"}</h1>
      <InstructionForm
        prayerId={id}
        instructionId={item.id}
        doneOn={item.doneOn}
        initial={{ kind: item.kind, body: item.body, frequency: item.frequency ?? "", receivedOn: item.receivedOn, shared: item.shared }}
      />
    </>
  );
}
