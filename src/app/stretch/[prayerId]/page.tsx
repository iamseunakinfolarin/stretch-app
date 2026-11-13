import type { Metadata } from "next";
import { FullScreenPlaceholder } from "@/components/FullScreenPlaceholder";

// These screens read the session and may redirect, so they render at request time.
// This opts them out of Next's instant-navigation check, as its auth guide describes.
export const instant = false;

export const metadata: Metadata = { title: "Stretch" };

export default function StretchPage() {
  return (
    <FullScreenPlaceholder title="Stretch">
      The timed prayer session for this prayer will run here.
    </FullScreenPlaceholder>
  );
}
