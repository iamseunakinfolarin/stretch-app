import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPrayer } from "@/features/prayers/queries";
import { isArchived } from "@/features/prayers/types";
import { StretchScreen } from "@/features/stretch/StretchScreen";

export const metadata: Metadata = { title: "Stretch" };

export default async function StretchPage({ params }: { params: Promise<{ prayerId: string }> }) {
  const { prayerId } = await params;
  const prayer = await getPrayer(prayerId);
  // Missing and not yours look identical.
  if (!prayer) notFound();
  // An archived prayer is set aside: reactivate it first.
  if (isArchived(prayer)) redirect(`/prayers/${prayer.id}`);

  return <StretchScreen prayerId={prayer.id} title={prayer.title} points={prayer.points} scriptures={prayer.scriptures} />;
}
