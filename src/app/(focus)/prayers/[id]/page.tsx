import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddLink } from "@/components/AddLink";
import { BackLink } from "@/components/BackLink";
import { buttonClass } from "@/components/Button";
import { formatHours, formatPlan, formatShortfall, targetProgress } from "@/features/prayers/format";
import { PrayerActions } from "@/features/prayers/PrayerActions";
import { KindChip } from "@/features/prayers/PrayerBits";
import { InvitePanel } from "@/features/prayers/InvitePanel";
import { MemberAction } from "@/features/prayers/MemberActions";
import { getCommitmentStatus, getInviteCode, getPrayer, listMembers } from "@/features/prayers/queries";
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
  const canAdd = prayer.isOwner && !archived;
  const [answers, members, inviteCode] = await Promise.all([
    listThanksgivings({ prayerId: prayer.id }),
    listMembers(prayer.id),
    prayer.isOwner && !archived ? getInviteCode(prayer.id) : Promise.resolve(null),
  ]);
  const noun = prayer.kind === "altar" ? "altar" : "prayer";
  const me = members.find((m) => m.isMe);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <BackLink href="/prayers">My Prayers</BackLink>
        {prayer.isOwner && !archived ? (
          <Link href={`/prayers/${prayer.id}/edit`} className="inline-flex min-h-field items-center px-2 font-semibold text-primary">
            {prayer.kind === "altar" ? "Edit altar" : "Edit prayer"}
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
            Start praying
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
          <p className="mt-1 text-caption text-muted">Each time you pray will add to this.</p>
        ) : null}
        {shortfall ? <p className="mt-2 text-caption text-danger">{shortfall}</p> : null}
      </section>

      <section aria-labelledby="points-heading" className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 id="points-heading" className="text-heading font-bold text-forest">
            Prayer points
          </h2>
          {canAdd ? <AddLink href={`/prayers/${prayer.id}/edit?add=point`} label="Add a prayer point" /> : null}
        </div>
        {prayer.points.length === 0 ? (
          <p className="mt-2 text-muted">No prayer points yet.</p>
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
        <div className="flex items-center justify-between gap-3">
          <h2 id="scriptures-heading" className="text-heading font-bold text-forest">
            Key scriptures
          </h2>
          {canAdd ? <AddLink href={`/prayers/${prayer.id}/edit?add=scripture`} label="Add a key scripture" /> : null}
        </div>
        {prayer.scriptures.length === 0 ? (
          <p className="mt-2 text-muted">No key scriptures yet.</p>
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
            <AddLink href={`/thanksgiving/new?prayer=${prayer.id}`} label="Add an answer to this prayer" />
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

      <section aria-labelledby="people-heading" className="mt-8">
        <h2 id="people-heading" className="text-heading font-bold text-forest">
          People praying ({members.length})
        </h2>
        <ul className="mt-3 flex flex-col divide-y divide-hairline rounded-card border border-hairline bg-surface">
          {members.map((member) => (
            <li key={member.userId} className="flex min-h-tap items-center justify-between gap-3 px-4 py-2">
              <span className="min-w-0 break-words">
                {member.name}
                {member.isMe ? <span className="text-muted"> (you)</span> : null}
                {member.isOwner ? <span className="text-caption text-muted"> · started it</span> : null}
              </span>
              {prayer.isOwner && !member.isOwner ? (
                <MemberAction prayerId={prayer.id} userId={member.userId} name={member.name} mode="remove" noun={noun} />
              ) : null}
            </li>
          ))}
        </ul>
        {prayer.isOwner && !archived ? (
          <div className="mt-4">
            <InvitePanel prayerId={prayer.id} title={prayer.title} noun={noun} initialCode={inviteCode} />
          </div>
        ) : null}
        {!prayer.isOwner && me ? (
          <div className="mt-4">
            <MemberAction prayerId={prayer.id} userId={me.userId} name={me.name} mode="leave" noun={noun} />
          </div>
        ) : null}
      </section>

      {prayer.isOwner && archived ? (
        <div className="mt-10">
          <PrayerActions id={prayer.id} title={prayer.title} kind={prayer.kind} archived />
        </div>
      ) : null}
    </>
  );
}
