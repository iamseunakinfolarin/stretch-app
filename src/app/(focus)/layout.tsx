import { DetailSkeleton } from "@/features/prayers/Skeletons";
import { ProfileGate } from "@/features/profile/ProfileGate";

// These screens read the session and may redirect, so they render at request time.
// This opts them out of Next's instant-navigation check, as its auth guide describes.
export const instant = false;

/** Full-screen pages inside the app, without the tab bar: a prayer, its form, a stretch. */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-safe pt-safe pb-safe">
      <ProfileGate fallback={<DetailSkeleton />}>{children}</ProfileGate>
    </main>
  );
}
