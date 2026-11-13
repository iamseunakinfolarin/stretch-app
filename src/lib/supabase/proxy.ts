import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

/**
 * Refreshes the Supabase session cookie on each request, as Supabase's Next.js guide describes,
 * and keeps people on the right side of the door: signed-out visitors go to sign-in,
 * signed-in people skip the sign-in screens. Onboarding is checked by ProfileGate.
 */
/** The screens a signed-out visitor may see. Everything else needs a session. */
const AUTH_SCREENS = ["/sign-in", "/sign-up"];

/** A redirect that still carries any refreshed session cookies to the browser. */
function redirectTo(request: NextRequest, from: NextResponse, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const response = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

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
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const { pathname } = request.nextUrl;
  const onAuthScreen = AUTH_SCREENS.includes(pathname);

  if (!signedIn && !onAuthScreen) return redirectTo(request, supabaseResponse, "/sign-in");
  if (signedIn && onAuthScreen) return redirectTo(request, supabaseResponse, "/");

  // Return supabaseResponse as is, so the refreshed cookies reach the browser.
  return supabaseResponse;
}
