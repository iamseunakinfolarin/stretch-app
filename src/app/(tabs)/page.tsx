import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/Button";
import { EmptyState } from "@/features/prayers/EmptyState";
import { NewPrayerLink, PrayerTile } from "@/features/prayers/PrayerBits";
import { listMyPrayers } from "@/features/prayers/queries";
import { isArchived } from "@/features/prayers/types";
import { getCurrentProfile } from "@/features/profile/current-profile";

export const metadata: Metadata = { title: "Pray" };

export default async function PrayPage() {
  const [profile, prayers] = await Promise.all([getCurrentProfile(), listMyPrayers()]);
  const active = prayers.filter((prayer) => !isArchived(prayer));
  const altars = active.filter((prayer) => prayer.kind === "altar");
  const others = active.filter((prayer) => prayer.kind === "prayer");
  const firstName = profile.displayName?.split(" ")[0];

  return (
    <>
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow truncate text-primary">{firstName ? `Hello, ${firstName}` : "Hello"}</p>
          <h1 className="mt-1 text-title font-bold text-forest">Pray</h1>
        </div>
        <NewPrayerLink />
      </header>

      {active.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="You're in the right place."
            action={
              <Link href="/prayers/new" className={buttonClass("primary")}>
                Create your first prayer
              </Link>
            }
          >
            Create your first prayer and it will wait for you here.
          </EmptyState>
        </div>
      ) : (
        <>
          <p className="mt-2 text-muted">Choose what to pray for.</p>
          {[
            { heading: "Altars", items: altars },
            { heading: "Prayers", items: others },
          ].map((group) =>
            group.items.length > 0 ? (
              <section key={group.heading} aria-labelledby={`${group.heading}-heading`} className="mt-8">
                <h2 id={`${group.heading}-heading`} className="eyebrow text-muted">
                  {group.heading}
                </h2>
                <ul className="mt-3 grid grid-cols-2 gap-3">
                  {group.items.map((prayer) => (
                    <li key={prayer.id}>
                      <PrayerTile prayer={prayer} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </>
      )}
    </>
  );
}
