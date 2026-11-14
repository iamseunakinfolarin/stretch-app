import type { Metadata } from "next";
import { FullScreenPlaceholder } from "@/components/FullScreenPlaceholder";

// These screens read the session and may redirect, so they render at request time.
// This opts them out of Next's instant-navigation check, as its auth guide describes.
export const instant = false;

export const metadata: Metadata = { title: "Prayer" };

export default function PrayerPage() {
  return (
    <FullScreenPlaceholder title="Prayer">
      The prayer points, scriptures and notes for this prayer will show here.
    </FullScreenPlaceholder>
  );
}
