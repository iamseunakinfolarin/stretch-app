"use client";

import { Slider } from "./Slider";

type Scripture = { id: string; reference: string; verseText: string; translation: string };

/** The key scriptures, one at a time, moving separately from the prayer points. */
export function ScriptureSlider({ scriptures }: { scriptures: Scripture[] }) {
  if (scriptures.length === 0) return null;
  return (
    <Slider
      title="Key scriptures"
      noun="Key scripture"
      items={scriptures}
      keyOf={(s) => s.id}
      render={(s) => (
        <figure>
          {s.verseText ? <blockquote className="text-scripture font-medium break-words text-ink">{s.verseText}</blockquote> : null}
          <figcaption className={`font-bold text-forest ${s.verseText ? "mt-3" : ""}`}>
            {s.reference}
            {s.translation ? <span className="font-normal text-muted"> · {s.translation}</span> : null}
          </figcaption>
        </figure>
      )}
    />
  );
}
