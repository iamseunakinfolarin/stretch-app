import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { listMyPrayers } from "@/features/prayers/queries";
import { isArchived } from "@/features/prayers/types";
import { DeleteAction } from "@/features/thanksgiving/Actions";
import { getThanksgiving, listCategories } from "@/features/thanksgiving/queries";
import { ThanksgivingForm } from "@/features/thanksgiving/ThanksgivingForm";

export const metadata: Metadata = { title: "Edit thanksgiving" };

export default async function EditThanksgivingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, categories, prayers] = await Promise.all([getThanksgiving(id), listCategories(), listMyPrayers()]);
  // Only the author edits. Anyone else gets the same not-found page as for one that does not exist.
  if (!item || !item.isMine) notFound();
  const options = prayers.filter((p) => !isArchived(p) || p.id === item.prayerId).map((p) => ({ id: p.id, title: p.title }));

  return (
    <>
      <BackLink href={`/thanksgiving/${item.id}`}>Back</BackLink>
      <h1 className="mt-4 mb-8 text-title font-bold text-forest">Edit thanksgiving</h1>
      <ThanksgivingForm
        thanksgivingId={item.id}
        categories={categories}
        prayers={options}
        initial={{
          title: item.title,
          body: item.body,
          happenedOn: item.happenedOn,
          prayerId: item.prayerId ?? "",
          categoryId: item.categoryId ?? "",
          newCategoryName: "",
          newCategoryGlow: "gold",
          shared: item.visibility === "shared",
        }}
      />
      <div className="mt-10 mb-6">
        <DeleteAction kind="thanksgiving" id={item.id} name={item.title} />
      </div>
    </>
  );
}
