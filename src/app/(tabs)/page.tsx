import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Pray" };

export default function PrayPage() {
  return (
    <>
      <PageHeader eyebrow="Stretch" title="Pray">
        Your prayers will wait here, ready to begin a stretch.
      </PageHeader>
      <figure className="mt-12 border-l border-accent pl-5">
        <blockquote className="text-scripture font-medium text-ink">
          Men ought always to pray, and not to faint.
        </blockquote>
        <figcaption className="eyebrow mt-4 text-muted">Luke 18:1 · KJV</figcaption>
      </figure>
    </>
  );
}
