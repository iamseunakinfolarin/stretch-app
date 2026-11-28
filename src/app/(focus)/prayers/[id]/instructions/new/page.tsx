import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { InstructionForm } from "@/features/instructions/InstructionForm";
import { getPrayer } from "@/features/prayers/queries";
import { isArchived } from "@/features/prayers/types";

export const metadata: Metadata = { title: "New instruction" };

export default async function NewInstructionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { id } = await params;
  const { kind } = await searchParams;
  const prayer = await getPrayer(id);
  // Anyone in the prayer may write down their own; an archived prayer has ended.
  if (!prayer || isArchived(prayer)) notFound();

  return (
    <>
      <BackLink href={`/prayers/${prayer.id}`}>Back</BackLink>
      <h1 className="mt-4 text-title font-bold text-forest">Write down an instruction</h1>
      <p className="mt-2 mb-8 break-words text-muted">For &ldquo;{prayer.title}&rdquo;</p>
      <InstructionForm
        prayerId={prayer.id}
        initial={{ kind: kind === "ritual" ? "ritual" : "instruction", body: "", frequency: "", receivedOn: "", shared: false }}
      />
    </>
  );
}
