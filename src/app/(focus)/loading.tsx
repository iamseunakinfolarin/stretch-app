import { DetailSkeleton } from "@/features/prayers/Skeletons";

/** Shown at once when opening a full-screen page, while its data is on its way. */
export default function Loading() {
  return <DetailSkeleton />;
}
