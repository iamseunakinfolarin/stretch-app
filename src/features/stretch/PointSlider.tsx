"use client";

import { useRef, useState } from "react";

/** The prayer points, one at a time. Swipe, or use the buttons, which are always visible. */
export function PointSlider({ points }: { points: { id: string; body: string }[] }) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);

  if (points.length === 0) {
    return (
      <section aria-label="Prayer points" className="rounded-card border border-hairline bg-surface p-5">
        <p className="text-muted">This prayer has no prayer points yet. You can still pray, and add points later with Edit.</p>
      </section>
    );
  }

  const last = points.length - 1;
  const current = Math.min(index, last);
  const go = (to: number) => setIndex(Math.max(0, Math.min(last, to)));

  return (
    <section
      aria-label="Prayer points"
      onTouchStart={(e) => {
        touchStart.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        touchStart.current = null;
        const end = e.changedTouches[0]?.clientX;
        if (start === null || end === undefined) return;
        if (end - start < -50) go(current + 1);
        if (end - start > 50) go(current - 1);
      }}
      className="rounded-card border border-hairline bg-surface p-5 shadow-card"
    >
      <p className="eyebrow text-muted" aria-live="polite">
        Prayer point {current + 1} of {points.length}
      </p>
      <p className="mt-3 min-h-24 text-heading font-semibold break-words text-ink">{points[current].body}</p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(current - 1)}
          disabled={current === 0}
          aria-label="Previous prayer point"
          className="inline-flex min-h-field min-w-field items-center justify-center rounded-full border border-hairline px-5 font-semibold text-primary disabled:opacity-40"
        >
          Back
        </button>
        <div aria-hidden className="flex flex-wrap justify-center gap-1.5">
          {points.map((point, i) => (
            <span key={point.id} className={`h-2 w-2 rounded-full ${i === current ? "bg-primary" : "bg-hairline"}`} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(current + 1)}
          disabled={current === last}
          aria-label="Next prayer point"
          className="inline-flex min-h-field min-w-field items-center justify-center rounded-full border border-hairline px-5 font-semibold text-primary disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </section>
  );
}
