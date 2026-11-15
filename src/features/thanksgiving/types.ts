export const GLOWS = ["gold", "rose", "green", "blue", "violet", "amber"] as const;
export type Glow = (typeof GLOWS)[number];
export type Visibility = "personal" | "shared";

export function toGlow(value: string | null | undefined): Glow {
  return (GLOWS as readonly string[]).includes(value ?? "") ? (value as Glow) : "gold";
}

export type Category = { id: string; name: string; glow: Glow; count: number };

/** One thanksgiving, as the lists, the profile and the reel show it. */
export type Thanksgiving = {
  id: string;
  title: string;
  body: string;
  /** A calendar day, YYYY-MM-DD. */
  happenedOn: string;
  visibility: Visibility;
  prayerId: string | null;
  prayerTitle: string | null;
  categoryId: string | null;
  categoryName: string | null;
  glow: Glow;
  /** True when the signed-in person wrote it. Otherwise it was shared with them. */
  isMine: boolean;
  authorName: string | null;
};

/** What the form edits. Text stays as typed until saving. */
export type ThanksgivingDraft = {
  title: string;
  body: string;
  happenedOn: string;
  prayerId: string;
  /** An existing category's id, "new" to make one, or "" for none. */
  categoryId: string;
  newCategoryName: string;
  newCategoryGlow: Glow;
  shared: boolean;
};
