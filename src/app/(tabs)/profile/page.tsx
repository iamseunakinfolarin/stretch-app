import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ProfileCard } from "@/features/profile/ProfileCard";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader eyebrow="Stretch" title="Profile" />
      <div className="mt-8">
        <ProfileCard />
      </div>
    </>
  );
}
