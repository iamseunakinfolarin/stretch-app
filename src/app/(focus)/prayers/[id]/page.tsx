import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { buttonClass } from "@/components/Button";
import { formatHours, formatPlan, formatShortfall, targetProgress } from "@/features/prayers/format";
import { PrayerActions } from "@/features/prayers/PrayerActions";
import { KindChip } from "@/features/prayers/PrayerBits";
import { getCommitmentStatus, getPrayer } from "@/features/prayers/queries";
import { isArchived } from "@/features/prayers/types";
import { ThanksgivingItem } from "@/features/thanksgiving/Bits";
import { listThanksgivings } from "@/features/thanksgiving/queries";
import { getTimeZone } from "@/lib/time-zone";

export const metadata: Metadata = { title: "Prayer" };

/** The profile of one prayer or altar: its plan, the hours prayed, its points and its scriptures. */
export default async function PrayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prayer = await getPrayer(id);
  // Not found and not yours look identical: nothing about someone else's prayer is ever shown.
  if (!prayer) notFound();

  const archived = isArchived(prayer);
  const plan = formatPlan(prayer);
  const progress = targetProgress(prayer.mySeconds, prayer.targetHours);
  const status = prayer.commitmentHours ? await getCommitmentStatus(prayer.id, await getTimeZone()) : null;
  const shortfall = status ? formatShortfall(status.shortfallSeconds) : null;
  const together = prayer.memberCount > 1;
  const answers = await listThanksgivings({ prayerId: prayer.id });

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <BackLink href="/prayers">My Prayers</BackLink>
        {prayer.isOwner && !archived ? (
          <Link href={`/prayers/${prayer.id}/edit`} className="inline-flex min-h-field items-center px-2 font-semibold text-primary">
            Edit
          </Link>
        ) : null}
      </div>

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
        <div className={together ? "grid grid-cols-2 gap-4" : undefined}>
          <div>
            <p className="eyebrow text-muted">{together ? "My hours" : "Hours so far"}</p>
            <p className="mt-1 text-title font-bold text-forest">{formatHours(prayer.mySeconds)}</p>
          </div>
          {together ? (
            <div>
              <p className="eyebrow text-muted">Group hours</p>
              <p className="mt-1 text-title font-bold text-forest">{formatHours(prayer.groupSeconds)}</p>
            </div>
          ) : null}
        </div>
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
        ) : prayer.mySeconds === 0 ? (
          <p className="mt-1 text-caption text-muted">Each stretch you pray will add to this.</p>
        ) : null}
        {shortfall ? <p className="mt-2 text-caption text-danger">{shortfall}</p> : null}
      </section>

      <section aria-labelledby="points-heading" className="mt-8">
        <h2 id="points-heading" className="text-heading font-bold text-forest">
          Prayer points
        </h2>
        {prayer.points.length === 0 ? (
          <p className="mt-2 text-muted">No prayer points yet.{prayer.isOwner && !archived ? " Add some with Edit." : ""}</p>
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
          <p className="mt-2 text-muted">No key scriptures yet.{prayer.isOwner && !archived ? " Add some with Edit." : ""}</p>
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

      <section aria-labelledby="answers-heading" className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 id="answers-heading" className="text-heading font-bold text-forest">
            Answers to this prayer
          </h2>
          {!archived ? (
            <Link href={`/thanksgiving/new?prayer=${prayer.id}`} className="inline-flex min-h-field items-center px-2 font-semibold text-primary">
              Add
            </Link>
          ) : null}
        </div>
        {answers.length === 0 ? (
          <p className="mt-2 text-muted">No answers recorded yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {answers.map((item) => (
              <li key={item.id}>
                <ThanksgivingItem item={item} showCategory={false} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {prayer.isOwner && archived ? (
        <div className="mt-10">
          <PrayerActions id={prayer.id} title={prayer.title} kind={prayer.kind} archived />
        </div>
      ) : null}
    </>
  );
}
