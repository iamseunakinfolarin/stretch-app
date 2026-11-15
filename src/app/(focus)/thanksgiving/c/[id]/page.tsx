import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { buttonClass } from "@/components/Button";
import { EmptyState } from "@/features/prayers/EmptyState";
import { DeleteAction } from "@/features/thanksgiving/Actions";
import { ThanksgivingItem } from "@/features/thanksgiving/Bits";
import { countLabel } from "@/features/thanksgiving/format";
import { glowStyle } from "@/features/thanksgiving/glow";
import { getCategory, listThanksgivings } from "@/features/thanksgiving/queries";

export const metadata: Metadata = { title: "Category" };

/** The profile of one category: everything the person has filed in it. "none" is the uncategorised ones. */
export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uncategorised = id === "none";
  const category = uncategorised ? { id: "none", name: "No category", glow: "gold" as const, count: 0 } : await getCategory(id);
  if (!category) notFound();
  const items = await listThanksgivings({ categoryId: id });

  return (
    <>
      <BackLink href="/thanksgiving">Thanksgiving</BackLink>
      <header style={glowStyle(category.glow)} className="glow-card mt-4 rounded-card px-6 py-6">
        <p className="eyebrow text-muted">Category</p>
        <h1 className="mt-2 text-title font-bold break-words text-forest">{category.name}</h1>
        <p className="mt-1 text-muted">{countLabel(items.length)}</p>
      </header>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Nothing here yet">Thanksgivings you file under this category will gather here.</EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-5">
            <Link href={`/thanksgiving/scroll?c=${id}`} className={buttonClass("secondary")}>
              Scroll through these
            </Link>
          </div>
          <ul className="mt-5 flex flex-col gap-4">
            {items.map((item) => (
              <li key={item.id}>
                <ThanksgivingItem item={item} showCategory={false} />
              </li>
            ))}
          </ul>
        </>
      )}

      {!uncategorised ? (
        <div className="mt-10 mb-6">
          <DeleteAction kind="category" id={category.id} name={category.name} />
        </div>
      ) : null}
    </>
  );
}
