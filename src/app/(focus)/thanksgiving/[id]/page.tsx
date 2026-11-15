import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { formatDay } from "@/features/thanksgiving/format";
import { glowStyle } from "@/features/thanksgiving/glow";
import { getThanksgiving } from "@/features/thanksgiving/queries";

export const metadata: Metadata = { title: "Thanksgiving" };

/** The profile of one thanksgiving. */
export default async function ThanksgivingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getThanksgiving(id);
  // Missing and not yours to see look identical.
  if (!item) notFound();

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <BackLink href="/thanksgiving">Thanksgiving</BackLink>
        {item.isMine ? (
          <Link href={`/thanksgiving/${item.id}/edit`} className="inline-flex min-h-field items-center px-2 font-semibold text-primary">
            Edit
          </Link>
        ) : null}
      </div>

      <article style={glowStyle(item.glow)} className="glow-card glow-lit mt-4 rounded-card px-6 py-7">
        <p className="eyebrow text-muted">
          {formatDay(item.happenedOn)}
          {item.categoryName ? ` · ${item.categoryName}` : ""}
        </p>
        <h1 className="mt-3 text-title font-bold break-words text-forest">{item.title}</h1>
        <p className="mt-4 text-scripture break-words whitespace-pre-line text-ink">{item.body}</p>
      </article>

      <dl className="mt-6 flex flex-col gap-3 text-muted">
        {item.prayerId && item.prayerTitle ? (
          <div>
            <dt className="eyebrow">Answer to</dt>
            <dd className="mt-1">
              <Link href={`/prayers/${item.prayerId}`} className="font-semibold break-words text-primary">
                {item.prayerTitle}
              </Link>
            </dd>
          </div>
        ) : null}
        {item.isMine && item.categoryId ? (
          <div>
            <dt className="eyebrow">Category</dt>
            <dd className="mt-1">
              <Link href={`/thanksgiving/c/${item.categoryId}`} className="font-semibold text-primary">
                {item.categoryName}
              </Link>
            </dd>
          </div>
        ) : null}
        <p className="text-caption">
          {item.isMine
            ? item.visibility === "shared"
              ? "Shared with the people in this prayer."
              : "Only you can see this."
            : item.authorName
              ? `Shared by ${item.authorName}.`
              : "Shared with you."}
        </p>
      </dl>
    </>
  );
}
