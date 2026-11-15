import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/features/profile/current-profile";
import { isUuid } from "@/features/prayers/validation";
import { toGlow, type Category, type Thanksgiving, type Visibility } from "./types";

// All reads of thanksgivings go through this file. Each runs as the signed-in person, so row level security
// decides what comes back: their own, and ones shared with a prayer they are in.

const COLUMNS =
  "id, title, body, happened_on, visibility, prayer_id, category_id, author_id, prayers(title), thanksgiving_categories(name, glow), profiles(display_name)";

type Row = {
  id: string;
  title: string;
  body: string;
  happened_on: string;
  visibility: string;
  prayer_id: string | null;
  category_id: string | null;
  author_id: string;
  prayers: { title: string } | null;
  thanksgiving_categories: { name: string; glow: string } | null;
  profiles: { display_name: string | null } | null;
};

function toThanksgiving(row: Row, myId: string): Thanksgiving {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    happenedOn: row.happened_on,
    visibility: row.visibility === "shared" ? "shared" : ("personal" satisfies Visibility),
    prayerId: row.prayer_id,
    prayerTitle: row.prayers?.title ?? null,
    categoryId: row.category_id,
    categoryName: row.thanksgiving_categories?.name ?? null,
    glow: toGlow(row.thanksgiving_categories?.glow),
    isMine: row.author_id === myId,
    authorName: row.profiles?.display_name ?? null,
  };
}

/** The signed-in person's categories, with how many thanksgivings are in each. */
export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("thanksgiving_categories")
    .select("id, name, glow, thanksgivings(count)")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    glow: toGlow(row.glow),
    count: row.thanksgivings[0]?.count ?? 0,
  }));
}

export type Filter = { categoryId?: string | "none"; prayerId?: string; mineOnly?: boolean };

/** Thanksgivings, newest day first. By default only the signed-in person's own. */
export async function listThanksgivings(filter: Filter = {}): Promise<Thanksgiving[]> {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  let query = supabase.from("thanksgivings").select(COLUMNS);
  if (filter.mineOnly ?? !filter.prayerId) query = query.eq("author_id", profile.id);
  if (filter.prayerId) {
    if (!isUuid(filter.prayerId)) return [];
    query = query.eq("prayer_id", filter.prayerId);
  }
  if (filter.categoryId === "none") query = query.is("category_id", null);
  else if (filter.categoryId) {
    if (!isUuid(filter.categoryId)) return [];
    query = query.eq("category_id", filter.categoryId);
  }
  const { data, error } = await query
    .order("happened_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map((row) => toThanksgiving(row, profile.id));
}

/** One thanksgiving, or null when it does not exist or is not the person's to see. */
export async function getThanksgiving(id: string): Promise<Thanksgiving | null> {
  if (!isUuid(id)) return null;
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.from("thanksgivings").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toThanksgiving(data as unknown as Row, profile.id) : null;
}

/** One of the person's own categories, or null. */
export async function getCategory(id: string): Promise<Category | null> {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("thanksgiving_categories")
    .select("id, name, glow, thanksgivings(count)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, name: data.name, glow: toGlow(data.glow), count: data.thanksgivings[0]?.count ?? 0 } : null;
}
