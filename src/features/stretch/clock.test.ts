import { describe, expect, it } from "vitest";
import {
  CHECK_IN_MAX_MS,
  CHECK_IN_MIN_MS,
  CHECK_IN_WINDOW_MS,
  MINUTE_MS,
  activeMs,
  activeSeconds,
  confirmCheckIn,
  describeDuration,
  finishStretch,
  formatClock,
  isWorthSaving,
  nextCheckInGap,
  pauseStretch,
  reconcile,
  resumeStretch,
  startStretch,
} from "./clock";

const T0 = 1_700_000_000_000;
const min = (n: number) => n * MINUTE_MS;
// A "random" that always gives the same answer: 0 is the shortest gap (4 min), 0.5 is 5 min.
const at = (value: number) => () => value;
const begin = (value = 0.5) => startStretch({ id: "s1", prayerId: "p1", prayerTitle: "Morning watch" }, T0, at(value));

describe("elapsed time comes from timestamps", () => {
  it("is the time since the start, however the screen behaved in between", () => {
    const s = begin();
    expect(activeSeconds(s, T0)).toBe(0);
    // Nothing ticked for 90 minutes (a locked screen): the answer is still right.
    expect(activeSeconds(s, T0 + min(90))).toBe(90 * 60);
  });

  it("stands still while paused and leaves the pause out afterwards", () => {
    const s = pauseStretch(begin(), T0 + min(2));
    expect(activeMs(s, T0 + min(10))).toBe(min(2));
    const resumed = resumeStretch(s, T0 + min(10), at(0.5));
    expect(activeMs(resumed, T0 + min(11))).toBe(min(3));
  });
});

describe("check-in timing", () => {
  it("gives a gap of 4 to 6 minutes", () => {
    expect(nextCheckInGap(at(0))).toBe(CHECK_IN_MIN_MS);
    expect(nextCheckInGap(at(0.999999))).toBeLessThan(CHECK_IN_MAX_MS);
    expect(nextCheckInGap(at(0.999999))).toBeGreaterThan(CHECK_IN_MAX_MS - 10);
    for (let i = 0; i < 200; i++) {
      const gap = nextCheckInGap(Math.random);
      expect(gap).toBeGreaterThanOrEqual(CHECK_IN_MIN_MS);
      expect(gap).toBeLessThan(CHECK_IN_MAX_MS);
    }
  });

  it("appears when enough praying time has passed, and not before", () => {
    const s = begin(0.5); // 5 minutes
    expect(reconcile(s, T0 + min(4.9)).checkIn).toBeNull();
    const shown = reconcile(s, T0 + min(5));
    expect(shown.checkIn).toEqual({ shownAt: T0 + min(5) });
    expect(shown.checkInsShown).toBe(1);
  });

  it("is stamped with the moment it was due, even if noticed late", () => {
    const shown = reconcile(begin(0.5), T0 + min(6));
    expect(shown.checkIn?.shownAt).toBe(T0 + min(5));
  });

  it("does not appear while paused", () => {
    const s = pauseStretch(begin(0.5), T0 + min(1));
    expect(reconcile(s, T0 + min(60)).checkIn).toBeNull();
  });

  it("counts a confirmed check-in and schedules the next, 4 to 6 minutes of praying time on", () => {
    const shown = reconcile(begin(0.5), T0 + min(5));
    const confirmed = confirmCheckIn(shown, T0 + min(5.5), at(0));
    expect(confirmed.checkIn).toBeNull();
    expect(confirmed.checkInsConfirmed).toBe(1);
    expect(confirmed.nextCheckInAtActiveMs).toBe(min(5.5) + CHECK_IN_MIN_MS);
    expect(reconcile(confirmed, T0 + min(9)).checkIn).toBeNull();
    expect(reconcile(confirmed, T0 + min(9.5)).checkIn).not.toBeNull();
  });
});

describe("a missed check-in", () => {
  it("is still open just inside 2 minutes", () => {
    const s = reconcile(begin(0.5), T0 + min(5) + CHECK_IN_WINDOW_MS - 1);
    expect(s.checkIn).not.toBeNull();
    expect(s.pausedAt).toBeNull();
  });

  it("stops the clock at the moment the check-in appeared", () => {
    const s = reconcile(begin(0.5), T0 + min(5) + CHECK_IN_WINDOW_MS);
    expect(s.checkIn).toBeNull();
    expect(s.pausedReason).toBe("missed");
    expect(s.pausedAt).toBe(T0 + min(5));
    // Two hours later, still only the 5 minutes before the check-in.
    expect(activeSeconds(s, T0 + min(120))).toBe(5 * 60);
  });

  it("still counts the right time when the phone was locked for ages before waking", () => {
    const s = reconcile(begin(0.5), T0 + min(300));
    expect(s.pausedAt).toBe(T0 + min(5));
    expect(s.checkInsShown).toBe(1);
    expect(s.checkInsConfirmed).toBe(0);
  });

  it("does not count a late answer", () => {
    const shown = reconcile(begin(0.5), T0 + min(5));
    const late = confirmCheckIn(shown, T0 + min(8), at(0.5));
    expect(late.checkInsConfirmed).toBe(0);
    expect(late.pausedReason).toBe("missed");
  });

  it("resumes from the pause, leaves the missed time out and schedules a fresh check-in", () => {
    const missed = reconcile(begin(0.5), T0 + min(20));
    const resumed = resumeStretch(missed, T0 + min(30), at(0));
    expect(resumed.pausedAt).toBeNull();
    expect(activeMs(resumed, T0 + min(30))).toBe(min(5));
    expect(resumed.nextCheckInAtActiveMs).toBe(min(5) + CHECK_IN_MIN_MS);
  });

  it("is the same answer however often it is worked out", () => {
    const a = reconcile(begin(0.5), T0 + min(300));
    expect(reconcile(a, T0 + min(400))).toEqual(a);
  });
});

describe("pause and resume", () => {
  it("cannot pause while a check-in is waiting", () => {
    const shown = reconcile(begin(0.5), T0 + min(5));
    expect(pauseStretch(shown, T0 + min(5.5)).pausedAt).toBeNull();
  });

  it("keeps the same check-in schedule across a manual pause", () => {
    const s = pauseStretch(begin(0.5), T0 + min(3));
    const resumed = resumeStretch(s, T0 + min(13), at(0.5));
    // 3 minutes prayed, next check-in due at 5 minutes of praying, so 2 more minutes.
    expect(reconcile(resumed, T0 + min(14.9)).checkIn).toBeNull();
    expect(reconcile(resumed, T0 + min(15)).checkIn).not.toBeNull();
  });
});

describe("ending", () => {
  it("credits the time prayed", () => {
    const f = finishStretch(begin(), T0 + min(3) + 20_000);
    expect(f.creditedSeconds).toBe(200);
    expect(f.startedAt).toBe(T0);
    expect(f.endedAt).toBe(T0 + min(3) + 20_000);
  });

  it("never credits more than the time between start and end, which the database also requires", () => {
    const missed = reconcile(begin(0.5), T0 + min(60));
    const f = finishStretch(missed, T0 + min(60));
    expect(f.creditedSeconds).toBe(300);
    expect(f.creditedSeconds).toBeLessThanOrEqual((f.endedAt - f.startedAt) / 1000);
  });

  it("caps credit at 24 hours", () => {
    const s = pauseStretch(begin(), T0);
    const running = resumeStretch(s, T0, at(0.5));
    const f = finishStretch({ ...running, nextCheckInAtActiveMs: Number.MAX_SAFE_INTEGER }, T0 + 30 * 3600_000);
    expect(f.creditedSeconds).toBe(86_400);
  });

  it("reports check-ins shown and confirmed", () => {
    const shown = reconcile(begin(0.5), T0 + min(5));
    const confirmed = confirmCheckIn(shown, T0 + min(6), at(0.5));
    const f = finishStretch(confirmed, T0 + min(7));
    expect(f.checkInsShown).toBe(1);
    expect(f.checkInsConfirmed).toBe(1);
  });

  it("does not save anything under a minute", () => {
    expect(isWorthSaving(finishStretch(begin(), T0 + 59_000))).toBe(false);
    expect(isWorthSaving(finishStretch(begin(), T0 + 60_000))).toBe(true);
  });
});

describe("words", () => {
  it("formats the clock", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(247)).toBe("4:07");
    expect(formatClock(3847)).toBe("1:04:07");
  });
  it("describes a duration", () => {
    expect(describeDuration(60)).toBe("1 minute");
    expect(describeDuration(12 * 60 + 30)).toBe("12 minutes");
    expect(describeDuration(3600)).toBe("1 hour");
    expect(describeDuration(3900)).toBe("1 hour 5 minutes");
  });
});
