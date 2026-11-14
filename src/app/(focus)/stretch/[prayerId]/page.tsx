import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";

export const metadata: Metadata = { title: "Stretch" };

/** Placeholder: the timed prayer session arrives in Phase 4. */
export default function StretchPage() {
  return (
    <>
      <BackLink href="/">Pray</BackLink>
      <h1 className="mt-4 text-title font-bold text-forest">Stretch</h1>
      <p className="mt-3 text-muted">The timed prayer session for this prayer will run here.</p>
    </>
  );
}
