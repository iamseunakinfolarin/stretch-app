import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Pray" };

export default function PrayPage() {
  return (
    <>
      <PageHeader eyebrow="Stretch" title="Pray">
        Your prayers will wait here, ready to begin a stretch.
      </PageHeader>
      <figure className="mt-10 border-l-2 border-gold pl-5">
        <blockquote className="font-serif text-scripture text-ink">
          Men ought always to pray, and not to faint.
        </blockquote>
        <figcaption className="mt-2 text-caption text-muted">Luke 18:1 · KJV</figcaption>
      </figure>
    </>
  );
}
