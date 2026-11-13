import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "My Prayers" };

export default function MyPrayersPage() {
  return (
    <PageHeader eyebrow="Stretch" title="My Prayers">
      Your prayers and altars will be listed here.
    </PageHeader>
  );
}
