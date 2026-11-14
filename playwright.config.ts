import { defineConfig } from "@playwright/test";
import { execSync } from "node:child_process";

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * The tests create real accounts, so by default they run against the LOCAL Supabase stack
 * (npm run db:start), where sign-up needs no email and nothing touches real data.
 * Set STRETCH_E2E_TARGET=hosted to run against whatever .env.local points at instead.
 * Every account a test creates is deleted again through the app's own "Delete account" button.
 */
function localSupabaseEnv(): Record<string, string> {
  if (process.env.STRETCH_E2E_TARGET === "hosted" || process.env.PLAYWRIGHT_BASE_URL) return {};
  let status: string;
  try {
    status = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    throw new Error("The local Supabase stack is not running. Start it with: npm run db:start");
  }
  const read = (name: string) => status.match(new RegExp(`^${name}="(.*)"$`, "m"))?.[1];
  const url = read("API_URL");
  const key = read("PUBLISHABLE_KEY");
  if (!url || !key) throw new Error("Could not read the local Supabase URL and publishable key.");
  return { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key };
}

/** The signed-in session the smoke tests share. Written by auth.setup.ts, never committed. */
export const SESSION_FILE = "e2e/.auth/session.json";

const phone = { hasTouch: true, isMobile: true, deviceScaleFactor: 2 };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  use: { baseURL, trace: "off", ...phone },
  projects: [
    // Creates one account and signs in, for the tests that need to be inside the app.
    { name: "setup", testMatch: /auth\.setup\.ts/, teardown: "cleanup", use: { viewport: { width: 390, height: 844 } } },
    // Deletes that account again when everything has finished.
    { name: "cleanup", testMatch: /auth\.teardown\.ts/, use: { viewport: { width: 390, height: 844 } } },
    // The two phone sizes the app is checked at.
    { name: "phone-390x844", dependencies: ["setup"], testMatch: /\.spec\.ts/, use: { viewport: { width: 390, height: 844 } } },
    { name: "phone-412x915", dependencies: ["setup"], testMatch: /\.spec\.ts/, use: { viewport: { width: 412, height: 915 } } },
  ],
  // Starts the dev server unless PLAYWRIGHT_BASE_URL points at a running app (for example a Vercel preview).
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: `${baseURL}/sign-in`,
        // A server that is already running may point at a different database, so always start a fresh one.
        reuseExistingServer: false,
        timeout: 120_000,
        env: localSupabaseEnv(),
      },
});
