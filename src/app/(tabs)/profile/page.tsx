import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { DatabaseStatus } from "@/features/profile/DatabaseStatus";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader eyebrow="Stretch" title="Profile">
        Your name, your hours and your account will live here.
      </PageHeader>
      <div className="mt-8">
        <DatabaseStatus />
      </div>
    </>
  );
}
