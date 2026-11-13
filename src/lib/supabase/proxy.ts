import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

/**
 * Refreshes the Supabase session cookie on each request, as Supabase's Next.js guide describes.
 * Redirecting signed-out visitors to the sign-in screen is added in Phase 2.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const env = getSupabaseEnv();
  // Without configuration the app shows the MissingConfig screen, so just pass the request on.
  if (!env) return supabaseResponse;

  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not run code between createServerClient and getClaims().
  // getClaims() verifies the token and refreshes it when it has expired.
  await supabase.auth.getClaims();

  // Return supabaseResponse as is, so the refreshed cookies reach the browser.
  return supabaseResponse;
}
