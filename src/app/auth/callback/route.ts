import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the link in a confirmation email lands. Supabase sends a one-time code; exchanging it
 * signs the person in. If that fails (an old link, or a different browser from the one that signed
 * up), they are sent to sign-in, where their confirmed account works as normal.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = request.nextUrl.clone();
  destination.search = "";

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        destination.pathname = "/";
        return NextResponse.redirect(destination);
      }
    } catch {
      // Fall through to sign-in.
    }
  }

  destination.pathname = "/sign-in";
  return NextResponse.redirect(destination);
}
