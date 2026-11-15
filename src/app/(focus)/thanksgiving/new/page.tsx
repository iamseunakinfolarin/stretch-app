import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { listMyPrayers } from "@/features/prayers/queries";
import { isArchived } from "@/features/prayers/types";
import { isUuid } from "@/features/prayers/validation";
import { listCategories } from "@/features/thanksgiving/queries";
import { ThanksgivingForm } from "@/features/thanksgiving/ThanksgivingForm";

export const metadata: Metadata = { title: "New thanksgiving" };

export default async function NewThanksgivingPage({ searchParams }: { searchParams: Promise<{ prayer?: string }> }) {
  const { prayer } = await searchParams;
  const [categories, prayers] = await Promise.all([listCategories(), listMyPrayers()]);
  const options = prayers.filter((p) => !isArchived(p)).map((p) => ({ id: p.id, title: p.title }));
  const preselected = prayer && isUuid(prayer) && options.some((o) => o.id === prayer) ? prayer : "";

  return (
    <>
      <BackLink href="/thanksgiving">Thanksgiving</BackLink>
      <h1 className="mt-4 text-title font-bold text-forest">Start documenting God&apos;s goodness</h1>
      <p className="mt-2 mb-8 text-muted">Write what God did. A line is enough.</p>
      <ThanksgivingForm
        categories={categories}
        prayers={options}
        initial={
          preselected
            ? { title: "", body: "", happenedOn: "", prayerId: preselected, categoryId: "", newCategoryName: "", newCategoryGlow: "gold", shared: false }
            : undefined
        }
      />
    </>
  );
}
