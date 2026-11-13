// The two public Supabase values. Both are safe to ship to the browser.
// Never add the secret key, service_role key or database password here.

export type SupabaseEnv = { url: string; publishableKey: string };

// Each variable is read with its full literal name so Next can inline it in the browser bundle.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

/** Names of the Supabase variables that are not set. Empty when everything is configured. */
export function missingSupabaseVars(): string[] {
  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!publishableKey) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return missing;
}

/** The Supabase settings, or null when either variable is missing. */
export function getSupabaseEnv(): SupabaseEnv | null {
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

/** The Supabase settings, or a clear error. The root layout shows MissingConfig before this can throw. */
export function requireSupabaseEnv(): SupabaseEnv {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(`Supabase is not configured. Missing: ${missingSupabaseVars().join(", ")}`);
  }
  return env;
}
