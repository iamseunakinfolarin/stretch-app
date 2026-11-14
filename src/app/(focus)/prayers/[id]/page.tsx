import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { buttonClass } from "@/components/Button";
import { formatHours, formatPlan, targetProgress } from "@/features/prayers/format";
import { PrayerActions } from "@/features/prayers/PrayerActions";
import { KindChip } from "@/features/prayers/PrayerBits";
import { getPrayer } from "@/features/prayers/queries";
import { isArchived } from "@/features/prayers/types";

export const metadata: Metadata = { title: "Prayer" };

export default async function PrayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prayer = await getPrayer(id);
  // Not found and not yours look identical: nothing about someone else's prayer is ever shown.
  if (!prayer) notFound();

  const archived = isArchived(prayer);
  const plan = formatPlan(prayer);
  const progress = targetProgress(prayer.mySeconds, prayer.targetHours);

  return (
    <>
      <BackLink href="/prayers">My Prayers</BackLink>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <KindChip kind={prayer.kind} />
        {archived ? <span className="eyebrow rounded-full border border-hairline px-3 py-1 text-muted">Archived</span> : null}
      </div>
      <h1 className="mt-3 text-title font-bold break-words text-forest">{prayer.title}</h1>
      <p className="mt-2 text-muted">{plan ?? "No plan set."}</p>

      {!archived ? (
        <div className="mt-6">
          <Link href={`/stretch/${prayer.id}`} className={buttonClass("primary")}>
            Start a stretch
          </Link>
        </div>
      ) : null}

      <section aria-label="Hours prayed" className="mt-6 rounded-card border border-hairline bg-surface p-5 shadow-card">
        <p className="eyebrow text-muted">Hours so far</p>
        <p className="mt-1 text-title font-bold text-forest">{formatHours(prayer.mySeconds)}</p>
        {prayer.targetHours && progress !== null ? (
          <>
            <div
              role="progressbar"
              aria-label="Progress towards your target"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="mt-3 h-2 overflow-hidden rounded-full bg-wash"
            >
              <div className="bg-brand h-full rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-caption text-muted">
              {progress}% of your {prayer.targetHours.toLocaleString("en")} hour target
            </p>
          </>
        ) : (
          <p className="mt-1 text-caption text-muted">Each stretch you pray will add to this.</p>
        )}
        {prayer.groupSeconds > prayer.mySeconds ? (
          <p className="mt-2 text-caption text-muted">Together: {formatHours(prayer.groupSeconds)}</p>
        ) : null}
      </section>

      <section aria-labelledby="points-heading" className="mt-8">
        <h2 id="points-heading" className="text-heading font-bold text-forest">
          Prayer points
        </h2>
        {prayer.points.length === 0 ? (
          <p className="mt-2 text-muted">No prayer points yet.{archived ? "" : " Add some with Edit."}</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-2">
            {prayer.points.map((point, index) => (
              <li key={point.id} className="flex gap-3 rounded-card border border-hairline bg-surface px-4 py-3">
                <span aria-hidden className="font-bold text-primary tabular-nums">
                  {index + 1}
                </span>
                <span className="min-w-0 break-words">{point.body}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="scriptures-heading" className="mt-8">
        <h2 id="scriptures-heading" className="text-heading font-bold text-forest">
          Key scriptures
        </h2>
        {prayer.scriptures.length === 0 ? (
          <p className="mt-2 text-muted">No key scriptures yet.{archived ? "" : " Add some with Edit."}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {prayer.scriptures.map((scripture) => (
              <li key={scripture.id}>
                <figure className="rounded-card border border-hairline bg-surface px-5 py-4">
                  {scripture.verseText ? (
                    <blockquote className="text-scripture font-medium break-words text-ink">{scripture.verseText}</blockquote>
                  ) : null}
                  <figcaption className={`font-bold text-forest ${scripture.verseText ? "mt-3" : ""}`}>
                    {scripture.reference}
                    {scripture.translation ? <span className="font-normal text-muted"> · {scripture.translation}</span> : null}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}
      </section>

      {prayer.isOwner ? (
        <div className="mt-10">
          <PrayerActions id={prayer.id} title={prayer.title} kind={prayer.kind} archived={archived} />
        </div>
      ) : null}
    </>
  );
}
