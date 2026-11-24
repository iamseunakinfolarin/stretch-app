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
/** The page a confirmation email link lands on. It signs the person in, so it must be reachable signed out. */
const CALLBACK = "/auth/callback";
/** An invite link, and the cookie that remembers one across sign-in. */
const JOIN_PATH = /^\/join\/[A-Za-z0-9]{8}$/;
export const NEXT_COOKIE = "stretch_next";

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
  if (pathname === CALLBACK) return supabaseResponse;
  // If Supabase's Site URL sends the email link to the home page, pass its code on to the callback.
  if (pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = CALLBACK;
    return NextResponse.redirect(url);
  }
  const onAuthScreen = AUTH_SCREENS.includes(pathname);

  if (!signedIn && !onAuthScreen) {
    const response = redirectTo(request, supabaseResponse, "/sign-in");
    // Opening an invite link signed out: remember it, so after signing in (and naming yourself) you land on it.
    if (JOIN_PATH.test(pathname)) {
      response.cookies.set(NEXT_COOKIE, pathname, { path: "/", maxAge: 60 * 60, sameSite: "lax" });
    }
    return response;
  }
  if (signedIn && onAuthScreen) return redirectTo(request, supabaseResponse, "/");
  // Arriving home with an invite still waiting: go to it. The join page clears the reminder.
  if (signedIn && pathname === "/") {
    const next = request.cookies.get(NEXT_COOKIE)?.value;
    if (next && JOIN_PATH.test(next)) return redirectTo(request, supabaseResponse, next);
  }

  // Return supabaseResponse as is, so the refreshed cookies reach the browser.
  return supabaseResponse;
}
