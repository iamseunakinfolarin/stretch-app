import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Testimonies" };

export default function TestimoniesPage() {
  return (
    <PageHeader eyebrow="Stretch" title="Testimonies">
      What God has done will be recorded here.
    </PageHeader>
  );
}
