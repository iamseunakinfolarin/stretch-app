import { createClient } from "@/lib/supabase/client";
import type { Glow, ThanksgivingDraft } from "./types";

// All writes to thanksgivings go through this file. Each runs as the signed-in person, so row level security
// has the final say on what is allowed.

/** The row to save for a normalized, valid draft. `categoryId` is already resolved to a real id or null. */
export function toRow(id: string, authorId: string, draft: ThanksgivingDraft, categoryId: string | null) {
  return {
    id,
    author_id: authorId,
    title: draft.title,
    body: draft.body,
    happened_on: draft.happenedOn,
    prayer_id: draft.prayerId || null,
    category_id: categoryId,
    visibility: draft.shared && draft.prayerId ? "shared" : "personal",
  };
}

/** Makes a category and returns its id. The id is chosen here, so a retry cannot make two. */
export async function createCategory(id: string, ownerId: string, name: string, glow: Glow): Promise<string> {
  const { error } = await createClient().from("thanksgiving_categories").upsert({ id, owner_id: ownerId, name, glow });
  if (error) throw error;
  return id;
}

/**
 * Saves a thanksgiving, making a new category first when the draft asks for one.
 * Both ids are chosen by the caller, so saving twice by accident changes nothing.
 */
export async function saveThanksgiving(
  ids: { thanksgiving: string; category: string },
  authorId: string,
  draft: ThanksgivingDraft,
): Promise<string> {
  let categoryId: string | null = draft.categoryId || null;
  if (draft.categoryId === "new") {
    categoryId = await createCategory(ids.category, authorId, draft.newCategoryName, draft.newCategoryGlow);
  }
  const { error } = await createClient().from("thanksgivings").upsert(toRow(ids.thanksgiving, authorId, draft, categoryId));
  if (error) throw error;
  return ids.thanksgiving;
}

/** A change that must touch exactly one row. Zero rows means it was not the caller's to change. */
async function changeOne(change: PromiseLike<{ data: { id: string }[] | null; error: unknown }>) {
  const { data, error } = await change;
  if (error) throw error;
  if (!data || data.length === 0) throw { code: "42501" };
}

export function deleteThanksgiving(id: string) {
  return changeOne(createClient().from("thanksgivings").delete().eq("id", id).select("id"));
}

/** Deleting a category keeps its thanksgivings, which become uncategorised. */
export function deleteCategory(id: string) {
  return changeOne(createClient().from("thanksgiving_categories").delete().eq("id", id).select("id"));
}
