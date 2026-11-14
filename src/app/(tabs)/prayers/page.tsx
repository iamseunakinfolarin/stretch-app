import type { Metadata } from "next";
import { NewPrayerLink } from "@/features/prayers/PrayerBits";
import { PrayerLists } from "@/features/prayers/PrayerLists";
import { listMyPrayers } from "@/features/prayers/queries";

export const metadata: Metadata = { title: "My Prayers" };

export default async function MyPrayersPage() {
  const prayers = await listMyPrayers();

  return (
    <>
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">Stretch</p>
          <h1 className="mt-1 text-title font-bold text-forest">My Prayers</h1>
        </div>
        <NewPrayerLink />
      </header>
      <div className="mt-6">
        <PrayerLists prayers={prayers} />
      </div>
    </>
  );
}
