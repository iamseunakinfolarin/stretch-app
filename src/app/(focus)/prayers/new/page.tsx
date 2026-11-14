import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { PrayerForm } from "@/features/prayers/PrayerForm";

export const metadata: Metadata = { title: "New prayer" };

export default function NewPrayerPage() {
  return (
    <>
      <BackLink href="/prayers">My Prayers</BackLink>
      <h1 className="mt-4 text-title font-bold text-forest">New prayer</h1>
      <p className="mt-2 mb-8 text-muted">We make it easy to take the first step. Start with a title; the rest can come later.</p>
      <PrayerForm />
    </>
  );
}
