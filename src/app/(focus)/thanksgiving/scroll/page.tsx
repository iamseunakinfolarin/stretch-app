import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { EmptyState } from "@/features/prayers/EmptyState";
import { isUuid } from "@/features/prayers/validation";
import { listThanksgivings } from "@/features/thanksgiving/queries";
import { ScrollReel } from "@/features/thanksgiving/ScrollReel";

export const metadata: Metadata = { title: "Scroll through thanksgivings" };

export default async function ScrollPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c: raw } = await searchParams;
  // Only a real category id, or "none", is used; anything else shows everything.
  const c = raw && (raw === "none" || isUuid(raw)) ? raw : undefined;
  const items = await listThanksgivings(c ? { categoryId: c } : {});

  return (
    <>
      <BackLink href={c && c !== "none" ? `/thanksgiving/c/${c}` : "/thanksgiving"}>Back</BackLink>
      <h1 className="sr-only">Scroll through thanksgivings</h1>
      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Nothing to scroll yet">When you record a thanksgiving, it will appear here.</EmptyState>
        </div>
      ) : (
        <ScrollReel items={items} />
      )}
    </>
  );
}
