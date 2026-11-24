import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { listMyPrayers } from "@/features/prayers/queries";
import { isArchived } from "@/features/prayers/types";
import { isUuid } from "@/features/prayers/validation";
import { listCategories } from "@/features/thanksgiving/queries";
import { ThanksgivingForm } from "@/features/thanksgiving/ThanksgivingForm";

export const metadata: Metadata = { title: "New thanksgiving" };

export default async function NewThanksgivingPage({ searchParams }: { searchParams: Promise<{ prayer?: string; category?: string }> }) {
  const { prayer, category } = await searchParams;
  const [categories, prayers] = await Promise.all([listCategories(), listMyPrayers()]);
  const options = prayers.filter((p) => !isArchived(p)).map((p) => ({ id: p.id, title: p.title }));
  // "Add" on a prayer or a category page arrives with that prayer or category already chosen.
  const preselected = prayer && isUuid(prayer) && options.some((o) => o.id === prayer) ? prayer : "";
  const preCategory = category && isUuid(category) && categories.some((c) => c.id === category) ? category : "";

  return (
    <>
      <BackLink href="/thanksgiving">Thanksgiving</BackLink>
      <h1 className="mt-4 text-title font-bold text-forest">Start documenting God&apos;s goodness</h1>
      <p className="mt-2 mb-8 text-muted">Write what God did. A line is enough.</p>
      <ThanksgivingForm
        categories={categories}
        prayers={options}
        initial={
          preselected || preCategory
            ? { title: "", body: "", happenedOn: "", prayerId: preselected, categoryId: preCategory, newCategoryName: "", newCategoryGlow: "gold", shared: false }
            : undefined
        }
      />
    </>
  );
}
