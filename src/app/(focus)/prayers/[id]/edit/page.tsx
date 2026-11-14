import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { PrayerForm } from "@/features/prayers/PrayerForm";
import { getPrayer } from "@/features/prayers/queries";
import { isArchived } from "@/features/prayers/types";

export const metadata: Metadata = { title: "Edit" };

export default async function EditPrayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prayer = await getPrayer(id);
  // Only the owner edits. Anyone else gets the same not-found page as for a prayer that does not exist.
  if (!prayer || !prayer.isOwner) notFound();
  // An archived prayer is set aside: reactivate it first.
  if (isArchived(prayer)) redirect(`/prayers/${prayer.id}`);

  return (
    <>
      <BackLink href={`/prayers/${prayer.id}`}>Back</BackLink>
      <h1 className="mt-4 mb-8 text-title font-bold text-forest">Edit {prayer.kind === "altar" ? "altar" : "prayer"}</h1>
      <PrayerForm
        prayerId={prayer.id}
        initial={{
          kind: prayer.kind,
          title: prayer.title,
          targetHours: prayer.targetHours ? String(prayer.targetHours) : "",
          plannedStartDate: prayer.plannedStartDate ?? "",
          plannedEndDate: prayer.plannedEndDate ?? "",
          points: prayer.points,
          scriptures: prayer.scriptures,
        }}
      />
    </>
  );
}
