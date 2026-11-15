import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/features/prayers/EmptyState";
import { CategoryCard, StartLink, ThanksgivingItem } from "@/features/thanksgiving/Bits";
import { listCategories, listThanksgivings } from "@/features/thanksgiving/queries";

export const metadata: Metadata = { title: "Thanksgiving" };

export default async function ThanksgivingPage() {
  const [categories, all] = await Promise.all([listCategories(), listThanksgivings()]);
  const uncategorised = all.filter((item) => !item.categoryId).length;
  const recent = all.slice(0, 3);

  return (
    <>
      <PageHeader eyebrow="Thanksgiving" title="God's goodness">
        Every answer to prayer. Nothing is too small.
      </PageHeader>
      <div className="mt-6">
        <StartLink />
      </div>

      {all.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Nothing recorded yet">
            When a prayer is answered, or something good happens, write it here. You will love looking back.
          </EmptyState>
        </div>
      ) : (
        <>
          <section aria-labelledby="categories-heading" className="mt-8">
            <h2 id="categories-heading" className="text-heading font-bold text-forest">
              Categories
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-4">
              {categories.map((category) => (
                <li key={category.id}>
                  <CategoryCard href={`/thanksgiving/c/${category.id}`} name={category.name} glow={category.glow} count={category.count} />
                </li>
              ))}
              {uncategorised > 0 ? (
                <li>
                  <CategoryCard href="/thanksgiving/c/none" name="No category" glow="gold" count={uncategorised} />
                </li>
              ) : null}
            </ul>
            <div className="mt-5">
              <Link href="/thanksgiving/scroll" className={buttonClass("secondary")}>
                Scroll through them
              </Link>
            </div>
          </section>

          <section aria-labelledby="recent-heading" className="mt-8">
            <h2 id="recent-heading" className="text-heading font-bold text-forest">
              Recent
            </h2>
            <ul className="mt-3 flex flex-col gap-4">
              {recent.map((item) => (
                <li key={item.id}>
                  <ThanksgivingItem item={item} />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
