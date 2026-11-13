import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { requireSupabaseEnv } from "./env";

/** Supabase client for Client Components. createBrowserClient keeps a single instance. */
export function createClient() {
  const { url, publishableKey } = requireSupabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
