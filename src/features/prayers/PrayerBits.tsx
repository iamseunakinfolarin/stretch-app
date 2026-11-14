import Link from "next/link";
import { countLabel, formatHours, kindLabel } from "./format";
import type { PrayerKind, PrayerSummary } from "./types";

/** The small "Prayer" or "Altar" label. */
export function KindChip({ kind }: { kind: PrayerKind }) {
  return (
    <span
      className={`eyebrow inline-flex items-center rounded-full px-3 py-1 ${
        kind === "altar" ? "bg-forest text-white" : "bg-wash text-forest"
      }`}
    >
      {kindLabel(kind)}
    </span>
  );
}

/** The round + button that starts a new prayer or altar. */
export function NewPrayerLink() {
  return (
    <Link
      href="/prayers/new"
      aria-label="New prayer"
      className="bg-brand inline-flex size-12 shrink-0 items-center justify-center rounded-full text-white shadow-card active:brightness-90"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  );
}

/** A tile on the Pray home screen. */
export function PrayerTile({ prayer }: { prayer: PrayerSummary }) {
  return (
    <Link
      href={`/prayers/${prayer.id}`}
      className="flex min-h-36 flex-col rounded-card border border-hairline bg-surface p-4 shadow-card active:bg-wash"
    >
      <span>
        <KindChip kind={prayer.kind} />
      </span>
      <span className="mt-3 line-clamp-3 font-bold break-words text-forest">{prayer.title}</span>
      <span className="mt-auto pt-3 text-caption text-muted">
        <span className="font-bold text-ink">{formatHours(prayer.mySeconds)}</span> prayed ·{" "}
        {countLabel(prayer.pointCount, "point")}
      </span>
    </Link>
  );
}
