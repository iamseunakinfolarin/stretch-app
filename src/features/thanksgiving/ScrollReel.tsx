"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatDay } from "./format";
import { glowStyle } from "./glow";
import type { Thanksgiving } from "./types";

const ADVANCE_MS = 9000;

/**
 * One thanksgiving fills the screen at a time. Swipe up for the next. A slow auto-advance can be switched on
 * and paused; it is off to begin with, and unavailable for anyone who prefers reduced motion.
 */
export function ScrollReel({ items }: { items: Thanksgiving[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [calm, setCalm] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setCalm(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!playing || calm) return;
    const el = scroller.current;
    if (!el) return;
    const timer = window.setInterval(() => {
      const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
      el.scrollTo({ top: atEnd ? 0 : el.scrollTop + el.clientHeight, behavior: "smooth" });
    }, ADVANCE_MS);
    // A touch or a wheel means the person is in charge now.
    const stop = () => setPlaying(false);
    el.addEventListener("touchstart", stop, { passive: true });
    el.addEventListener("wheel", stop, { passive: true });
    return () => {
      window.clearInterval(timer);
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("wheel", stop);
    };
  }, [playing, calm]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3">
        {calm ? null : (
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={playing}
            className="inline-flex min-h-tap items-center rounded-full border border-hairline bg-surface px-5 font-semibold text-primary"
          >
            {playing ? "Pause" : "Play slowly"}
          </button>
        )}
        <p className="text-caption text-muted" aria-live="polite">
          {items.length} {items.length === 1 ? "thanksgiving" : "thanksgivings"}
        </p>
      </div>
      <div
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label="Thanksgivings"
        className="mt-3 h-[calc(100dvh-10rem)] snap-y snap-mandatory overflow-y-auto rounded-card"
      >
        {items.map((item) => (
          <article
            key={item.id}
            style={glowStyle(item.glow)}
            className="glow-card flex h-full snap-start flex-col justify-center rounded-card px-6 py-8"
          >
            <p className="eyebrow text-muted">
              {formatDay(item.happenedOn)}
              {item.categoryName ? ` · ${item.categoryName}` : ""}
            </p>
            <h2 className="mt-3 text-title font-bold break-words text-forest">{item.title}</h2>
            <p className="mt-4 max-h-[45%] overflow-y-auto text-scripture break-words whitespace-pre-line text-ink">{item.body}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted">
              {item.prayerTitle ? <span>For: {item.prayerTitle}</span> : null}
              {!item.isMine && item.authorName ? <span>From {item.authorName}</span> : null}
              <Link href={`/thanksgiving/${item.id}`} className="inline-flex min-h-tap items-center font-semibold text-primary">
                Open
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
