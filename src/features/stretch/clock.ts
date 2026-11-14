// The rules of a stretch, as pure functions of stored timestamps.
//
// Nothing here counts seconds. Elapsed time is always worked out from when the stretch started,
// how long it was paused and the time now, so it stays correct if the screen locks or the tab
// is throttled. A timer on screen only asks for the answer to be worked out again.

export const MINUTE_MS = 60_000;
/** A check-in appears every 4 to 6 minutes of praying time. */
export const CHECK_IN_MIN_MS = 4 * MINUTE_MS;
export const CHECK_IN_MAX_MS = 6 * MINUTE_MS;
/** The person has 2 minutes to answer a check-in. */
export const CHECK_IN_WINDOW_MS = 2 * MINUTE_MS;
/** A stretch is never credited for more than 24 hours. */
export const MAX_CREDIT_SECONDS = 86_400;
/** Under a minute is not a stretch, and is not saved. */
export const MIN_CREDIT_SECONDS = 60;

/** Why the clock is stopped, if it is. */
export type PauseReason = "manual" | "missed";

export type CheckIn = {
  /** When the check-in appeared (wall clock, ms). */
  shownAt: number;
};

/** A stretch in progress. This is exactly what is kept on the phone. All times are in milliseconds. */
export type Stretch = {
  /** Chosen when the stretch starts, so saving it twice can only ever save it once. */
  id: string;
  prayerId: string;
  prayerTitle: string;
  startedAt: number;
  /** When the clock was stopped, or null while it runs. */
  pausedAt: number | null;
  pausedReason: PauseReason | null;
  /** Total time already spent paused, not counting the current pause. */
  pausedTotalMs: number;
  /** How much praying time has to pass before the next check-in appears. */
  nextCheckInAtActiveMs: number;
  /** The check-in waiting for an answer, if any. */
  checkIn: CheckIn | null;
  checkInsShown: number;
  checkInsConfirmed: number;
};

/** A random number from 0 up to but not including 1. Passed in so tests can control it. */
export type Random = () => number;

/** A random gap of 4 to 6 minutes. */
export function nextCheckInGap(random: Random): number {
  return CHECK_IN_MIN_MS + Math.floor(random() * (CHECK_IN_MAX_MS - CHECK_IN_MIN_MS));
}

export function startStretch(
  input: { id: string; prayerId: string; prayerTitle: string },
  now: number,
  random: Random,
): Stretch {
  return {
    ...input,
    startedAt: now,
    pausedAt: null,
    pausedReason: null,
    pausedTotalMs: 0,
    nextCheckInAtActiveMs: nextCheckInGap(random),
    checkIn: null,
    checkInsShown: 0,
    checkInsConfirmed: 0,
  };
}

/** Time spent actually praying: the clock, with every pause taken out. Frozen while paused. */
export function activeMs(stretch: Stretch, now: number): number {
  const until = stretch.pausedAt ?? now;
  return Math.max(0, until - stretch.startedAt - stretch.pausedTotalMs);
}

/** Whole seconds prayed. */
export function activeSeconds(stretch: Stretch, now: number): number {
  return Math.floor(activeMs(stretch, now) / 1000);
}

/** How long is left to answer the check-in, or null when there is none. */
export function checkInRemainingMs(stretch: Stretch, now: number): number | null {
  if (!stretch.checkIn) return null;
  return Math.max(0, stretch.checkIn.shownAt + CHECK_IN_WINDOW_MS - now);
}

/**
 * Brings a stretch up to date with the time now. Safe to call as often as you like, and after
 * any gap: a locked screen, a closed app. It decides, from the stored timestamps, what should
 * have happened in the meantime.
 *
 * - A check-in is shown once enough praying time has passed. It is stamped with the moment it was
 *   due, not the moment this ran, so a late wake-up changes nothing.
 * - If a check-in is not answered within 2 minutes, the clock stops at the moment it appeared.
 */
export function reconcile(stretch: Stretch, now: number): Stretch {
  let next = stretch;

  // A check-in that appeared while nobody was looking.
  if (!next.checkIn && next.pausedAt === null && activeMs(next, now) >= next.nextCheckInAtActiveMs) {
    next = {
      ...next,
      checkIn: { shownAt: next.startedAt + next.pausedTotalMs + next.nextCheckInAtActiveMs },
      checkInsShown: next.checkInsShown + 1,
    };
  }

  // A check-in that ran out of time: stop the clock where it appeared.
  if (next.checkIn && now >= next.checkIn.shownAt + CHECK_IN_WINDOW_MS) {
    next = { ...next, pausedAt: next.checkIn.shownAt, pausedReason: "missed", checkIn: null };
  }

  return next;
}

/** "Yes, I'm still praying": counts the answer and schedules the next check-in. */
export function confirmCheckIn(stretch: Stretch, now: number, random: Random): Stretch {
  const settled = reconcile(stretch, now);
  // Too late: reconcile has already paused it, and the answer does not count.
  if (!settled.checkIn) return settled;
  return {
    ...settled,
    checkIn: null,
    checkInsConfirmed: settled.checkInsConfirmed + 1,
    nextCheckInAtActiveMs: activeMs(settled, now) + nextCheckInGap(random),
  };
}

/** Stops the clock on purpose. Not possible while a check-in is waiting. */
export function pauseStretch(stretch: Stretch, now: number): Stretch {
  const settled = reconcile(stretch, now);
  if (settled.pausedAt !== null || settled.checkIn) return settled;
  return { ...settled, pausedAt: now, pausedReason: "manual" };
}

/** Starts the clock again. The time spent paused is never counted. */
export function resumeStretch(stretch: Stretch, now: number, random: Random): Stretch {
  const settled = reconcile(stretch, now);
  if (settled.pausedAt === null) return settled;
  const resumedAfterMiss = settled.pausedReason === "missed";
  const resumed: Stretch = {
    ...settled,
    pausedAt: null,
    pausedReason: null,
    pausedTotalMs: settled.pausedTotalMs + Math.max(0, now - settled.pausedAt),
  };
  // After a missed check-in the next one is scheduled afresh, a full 4 to 6 minutes away.
  return resumedAfterMiss
    ? { ...resumed, nextCheckInAtActiveMs: activeMs(resumed, now) + nextCheckInGap(random) }
    : resumed;
}

/** What gets saved when a stretch ends. */
export type FinishedStretch = {
  id: string;
  prayerId: string;
  startedAt: number;
  endedAt: number;
  creditedSeconds: number;
  checkInsShown: number;
  checkInsConfirmed: number;
};

/** Ends a stretch. Credit is the time spent praying, never more than 24 hours. */
export function finishStretch(stretch: Stretch, now: number): FinishedStretch {
  const settled = reconcile(stretch, now);
  return {
    id: settled.id,
    prayerId: settled.prayerId,
    startedAt: settled.startedAt,
    endedAt: Math.max(now, settled.startedAt + 1),
    creditedSeconds: Math.min(activeSeconds(settled, now), MAX_CREDIT_SECONDS),
    checkInsShown: settled.checkInsShown,
    checkInsConfirmed: settled.checkInsConfirmed,
  };
}

/** Whether a finished stretch is long enough to be saved. */
export function isWorthSaving(finished: FinishedStretch): boolean {
  return finished.creditedSeconds >= MIN_CREDIT_SECONDS;
}

/** 4:07, or 1:04:07 once past an hour. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** "12 minutes", "1 hour 5 minutes": for sentences. */
export function describeDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const part = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  if (h > 0) return m > 0 ? `${part(h, "hour")} ${part(m, "minute")}` : part(h, "hour");
  return part(Math.max(minutes, 0), "minute");
}
