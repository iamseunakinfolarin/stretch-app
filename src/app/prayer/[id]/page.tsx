import type { Metadata } from "next";
import { FullScreenPlaceholder } from "@/components/FullScreenPlaceholder";

export const metadata: Metadata = { title: "Prayer" };

export default function PrayerPage() {
  return (
    <FullScreenPlaceholder title="Prayer">
      The prayer points, scriptures and notes for this prayer will show here.
    </FullScreenPlaceholder>
  );
}
