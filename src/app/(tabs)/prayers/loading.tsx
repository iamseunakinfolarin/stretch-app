import { ListSkeleton } from "@/features/prayers/Skeletons";

/** Shown at once when switching tabs, while the screen's data is on its way. */
export default function Loading() {
  return <ListSkeleton />;
}
