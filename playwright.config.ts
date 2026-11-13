import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "off",
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  },
  // The two phone sizes the app is checked at.
  projects: [
    { name: "phone-390x844", use: { viewport: { width: 390, height: 844 } } },
    { name: "phone-412x915", use: { viewport: { width: 412, height: 915 } } },
  ],
  // Starts the dev server unless PLAYWRIGHT_BASE_URL points at a running app (for example a Vercel preview).
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
