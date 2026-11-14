"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackLink } from "@/components/BackLink";
import { Button, buttonClass } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { STRETCH_MESSAGES } from "@/features/auth/messages";
import { useHydrated } from "@/lib/use-hydrated";
import { CheckInDialog } from "./CheckInDialog";
import { PointSlider } from "./PointSlider";
import {
  activeSeconds,
  checkInRemainingMs,
  confirmCheckIn,
  describeDuration,
  finishStretch,
  formatClock,
  isWorthSaving,
  pauseStretch,
  reconcile,
  resumeStretch,
  startStretch,
  type Stretch,
} from "./clock";
import { flushPendingStretches, saveFinishedStretch } from "./mutations";
import { loadActiveStretch, saveActiveStretch } from "./storage";

type Props = {
  prayerId: string;
  title: string;
  points: { id: string; body: string }[];
  scriptures: { id: string; reference: string; verseText: string; translation: string }[];
};

type Outcome = { kind: "saved" | "waiting" | "refused" | "short"; seconds: number };

export function StretchScreen({ prayerId, title, points, scriptures }: Props) {
  const router = useRouter();
  const hydrated = useHydrated();
  const stretchRef = useRef<Stretch | null>(null);
  const [stretch, setStretch] = useState<Stretch | null>(null);
  // The other stretch, if one is already running on a different prayer.
  const [elsewhere, setElsewhere] = useState<Stretch | null>(null);
  const [now, setNow] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [scriptureIndex, setScriptureIndex] = useState(0);

  const update = useCallback((next: Stretch | null) => {
    stretchRef.current = next;
    saveActiveStretch(next);
    setStretch(next);
  }, []);

  // Work the time out again from the stored timestamps. Called by a timer, and whenever the
  // page comes back from a locked screen or another app.
  const tick = useCallback(() => {
    const t = Date.now();
    setNow(t);
    const current = stretchRef.current;
    if (!current) return;
    const next = reconcile(current, t);
    if (next !== current) update(next);
  }, [update]);

  // Pick up a stretch left running: after a reload, a closed tab, a locked screen.
  // Reading what is kept on the phone has to wait until the page is in the browser.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = loadActiveStretch();
    const t = Date.now();
    if (saved && saved.prayerId === prayerId) {
      const settled = reconcile(saved, t);
      stretchRef.current = settled;
      saveActiveStretch(settled);
      setStretch(settled);
    } else if (saved) {
      setElsewhere(saved);
    }
    setNow(t);
    setLoaded(true);
    void flushPendingStretches();
  }, [prayerId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!stretch) return;
    const timer = window.setInterval(tick, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    window.addEventListener("pageshow", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
      window.removeEventListener("pageshow", tick);
    };
  }, [stretch, tick]);

  function start() {
    const t = Date.now();
    update(startStretch({ id: crypto.randomUUID(), prayerId, prayerTitle: title }, t, Math.random));
    setNow(t);
  }

  function act(change: (s: Stretch, t: number) => Stretch) {
    const current = stretchRef.current;
    if (!current) return;
    const t = Date.now();
    update(change(current, t));
    setNow(t);
  }

  async function end() {
    const current = stretchRef.current;
    if (!current || ending) return;
    setEnding(true);
    const finished = finishStretch(current, Date.now());
    update(null);
    setConfirmEnd(false);
    if (!isWorthSaving(finished)) {
      setOutcome({ kind: "short", seconds: finished.creditedSeconds });
      setEnding(false);
      return;
    }
    const result = await saveFinishedStretch(finished);
    setOutcome({ kind: result, seconds: finished.creditedSeconds });
    setEnding(false);
    if (result === "saved") router.refresh();
  }

  // The screen after a stretch ends.
  if (outcome) {
    const message =
      outcome.kind === "saved"
        ? `${describeDuration(outcome.seconds)} added to your hours.`
        : outcome.kind === "waiting"
          ? STRETCH_MESSAGES.waiting
          : outcome.kind === "refused"
            ? STRETCH_MESSAGES.refused
            : STRETCH_MESSAGES.tooShort;
    return (
      <>
        <h1 className="mt-8 text-title font-bold text-forest">
          {outcome.kind === "short" || outcome.kind === "refused" ? "Stretch ended" : "Well prayed"}
        </h1>
        <p role="status" className="mt-3 text-body text-ink">
          {message}
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link href={`/prayers/${prayerId}`} className={buttonClass("primary")}>
            Back to this prayer
          </Link>
          <Link href="/" className={buttonClass("secondary")}>
            Pray home
          </Link>
        </div>
      </>
    );
  }

  if (!loaded) return <p className="mt-8 text-muted">Getting ready…</p>;

  const scripture = scriptures.length > 0 ? scriptures[Math.min(scriptureIndex, scriptures.length - 1)] : null;

  // Before the stretch starts.
  if (!stretch) {
    return (
      <>
        <BackLink href={`/prayers/${prayerId}`}>Back</BackLink>
        <p className="eyebrow mt-4 text-muted">Stretch</p>
        <h1 className="mt-1 text-title font-bold break-words text-forest">{title}</h1>
        <p className="mt-3 text-muted">
          {points.length === 0 ? "No prayer points yet." : `${points.length} prayer point${points.length === 1 ? "" : "s"} to pray through.`}
        </p>

        {elsewhere ? (
          <div className="mt-6 rounded-card border border-hairline bg-surface p-5">
            <p className="font-semibold text-forest">A stretch is already running</p>
            <p className="mt-1 text-muted break-words">You have a stretch open on &ldquo;{elsewhere.prayerTitle}&rdquo;. Finish it before you start another.</p>
            <div className="mt-4">
              <Link href={`/stretch/${elsewhere.prayerId}`} className={buttonClass("secondary")}>
                Go to that stretch
              </Link>
            </div>
          </div>
        ) : (
          <>
            <ul className="mt-6 flex list-disc flex-col gap-2 pl-5 text-muted">
              <li>Your time is kept from when you start, even if the screen locks.</li>
              <li>Every few minutes we&apos;ll ask &ldquo;Still praying?&rdquo;. You have 2 minutes to answer.</li>
              <li>If you don&apos;t answer, the clock pauses where the question appeared.</li>
            </ul>
            <div className="mt-8">
              <Button onClick={start} disabled={!hydrated}>
                Start stretch
              </Button>
            </div>
          </>
        )}
      </>
    );
  }

  const seconds = activeSeconds(stretch, now);
  const paused = stretch.pausedAt !== null;
  const missed = stretch.pausedReason === "missed";
  const remaining = checkInRemainingMs(stretch, now);

  return (
    <>
      <p className="eyebrow mt-4 text-muted">{paused ? "Paused" : "Praying"}</p>
      <h1 className="mt-1 text-heading font-bold break-words text-forest">{stretch.prayerTitle}</h1>

      <div className="mt-4 rounded-card bg-wash px-5 py-4 text-center">
        <p className="eyebrow text-muted">Time prayed</p>
        <p role="timer" aria-label="Time prayed" className="mt-1 text-display font-bold text-forest tabular-nums">
          {formatClock(seconds)}
        </p>
      </div>

      {missed ? (
        <p role="status" className="mt-3 rounded-card border border-hairline bg-surface px-4 py-3 text-muted">
          We didn&apos;t hear back, so your clock paused at {formatClock(seconds)}. Resume when you&apos;re ready.
        </p>
      ) : null}

      <div className="mt-5">
        <PointSlider points={points} />
      </div>

      {scripture ? (
        <figure className="mt-5 rounded-card border border-hairline bg-surface px-5 py-4">
          {scripture.verseText ? (
            <blockquote className="text-scripture font-medium break-words text-ink">{scripture.verseText}</blockquote>
          ) : null}
          <figcaption className={`font-bold text-forest ${scripture.verseText ? "mt-3" : ""}`}>
            {scripture.reference}
            {scripture.translation ? <span className="font-normal text-muted"> · {scripture.translation}</span> : null}
          </figcaption>
          {scriptures.length > 1 ? (
            <button
              type="button"
              onClick={() => setScriptureIndex((i) => (i + 1) % scriptures.length)}
              className="mt-3 inline-flex min-h-field items-center font-semibold text-primary"
            >
              Next scripture ({(Math.min(scriptureIndex, scriptures.length - 1)) + 1} of {scriptures.length})
            </button>
          ) : null}
        </figure>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 pb-6">
        {paused ? (
          <Button onClick={() => act((s, t) => resumeStretch(s, t, Math.random))}>Resume</Button>
        ) : (
          <Button variant="secondary" onClick={() => act((s, t) => pauseStretch(s, t))} disabled={stretch.checkIn !== null}>
            Pause
          </Button>
        )}
        <Button variant="quiet-danger" onClick={() => setConfirmEnd(true)} disabled={ending}>
          End stretch
        </Button>
      </div>

      <CheckInDialog
        open={stretch.checkIn !== null}
        remainingMs={remaining ?? 0}
        onConfirm={() => act((s, t) => confirmCheckIn(s, t, Math.random))}
      />

      <ConfirmDialog
        open={confirmEnd}
        title="End this stretch?"
        description={
          seconds < 60
            ? "You've prayed for less than a minute, so this stretch won't be saved."
            : `${describeDuration(seconds)} will be added to your hours.`
        }
        confirmLabel="End stretch"
        cancelLabel="Keep praying"
        busy={ending}
        onConfirm={() => void end()}
        onCancel={() => setConfirmEnd(false)}
      />
    </>
  );
}
