"use client";

import { Slider } from "./Slider";

/** The prayer points, one at a time. */
export function PointSlider({ points }: { points: { id: string; body: string }[] }) {
  if (points.length === 0) {
    return (
      <section aria-label="Prayer points" className="rounded-card border border-hairline bg-surface p-5">
        <p className="text-muted">This prayer has no prayer points yet. You can still pray, and add points later with Edit.</p>
      </section>
    );
  }
  return (
    <Slider
      title="Prayer points"
      noun="Prayer point"
      items={points}
      keyOf={(p) => p.id}
      render={(p) => <p className="text-heading font-semibold break-words text-ink">{p.body}</p>}
    />
  );
}
