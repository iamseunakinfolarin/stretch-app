import { TabBar } from "@/components/TabBar";
import { ProfileGate } from "@/features/profile/ProfileGate";

// These screens read the session and may redirect, so they render at request time.
// This opts them out of Next's instant-navigation check, as its auth guide describes.
export const instant = false;

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto w-full max-w-md px-safe pt-safe pb-safe-tabbar">
        <ProfileGate>{children}</ProfileGate>
      </main>
      <TabBar />
    </>
  );
}
