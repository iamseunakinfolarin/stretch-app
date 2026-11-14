import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentProfile = { id: string; email: string; displayName: string | null };

/**
 * The signed-in person and their profile, read once per request.
 * Sends signed-out visitors to sign-in. Reads the session, so call it inside a <Suspense> boundary.
 */
export const getCurrentProfile = cache(async (): Promise<CurrentProfile> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    displayName: profile?.display_name ?? null,
  };
});
