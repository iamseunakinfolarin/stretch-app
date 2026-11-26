"use client";

import { useRef, useState } from "react";

type Props<T> = {
  /** Names the section for screen readers, e.g. "Prayer points". */
  title: string;
  /** One item's name, e.g. "Prayer point", used in "Prayer point 2 of 4" and the button names. */
  noun: string;
  items: T[];
  keyOf: (item: T) => string;
  render: (item: T) => React.ReactNode;
};

/**
 * Items one at a time. Swipe, or use the Back and Next buttons, which are always visible and stay in the
 * same place: the card keeps a steady height, and a very long item scrolls inside it.
 */
export function Slider<T>({ title, noun, items, keyOf, render }: Props<T>) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);
  const last = items.length - 1;
  const current = Math.min(index, last);
  const go = (to: number) => setIndex(Math.max(0, Math.min(last, to)));
  const lower = noun.toLowerCase();
  const button =
    "inline-flex min-h-field min-w-field items-center justify-center rounded-full border border-hairline px-5 font-semibold text-primary disabled:opacity-40";

  return (
    <section
      aria-label={title}
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
        {noun} {current + 1} of {items.length}
      </p>
      <div key={keyOf(items[current])} className="mt-3 min-h-36 max-h-72 overflow-y-auto">
        {render(items[current])}
      </div>

      {items.length > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={() => go(current - 1)} disabled={current === 0} aria-label={`Previous ${lower}`} className={button}>
            Back
          </button>
          <div aria-hidden className="flex flex-wrap justify-center gap-1.5">
            {items.map((item, i) => (
              <span key={keyOf(item)} className={`h-2 w-2 rounded-full ${i === current ? "bg-primary" : "bg-hairline"}`} />
            ))}
          </div>
          <button type="button" onClick={() => go(current + 1)} disabled={current === last} aria-label={`Next ${lower}`} className={button}>
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}
