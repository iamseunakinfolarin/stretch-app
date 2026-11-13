import type { Metadata } from "next";
import { FullScreenPlaceholder } from "@/components/FullScreenPlaceholder";

export const metadata: Metadata = { title: "Stretch" };

export default function StretchPage() {
  return (
    <FullScreenPlaceholder title="Stretch">
      The timed prayer session for this prayer will run here.
    </FullScreenPlaceholder>
  );
}
