import { expect, test } from "@playwright/test";
import { SESSION_FILE } from "../playwright.config";
import { SHARED_NAME } from "./helpers";

// These tests run inside the app, signed in as the account auth.setup.ts created.
test.use({ storageState: SESSION_FILE });

const TABS = [
  { label: "Pray", path: "/", file: "pray" },
  { label: "My Prayers", path: "/prayers", file: "my-prayers" },
  { label: "Testimonies", path: "/testimonies", file: "testimonies" },
  { label: "Profile", path: "/profile", file: "profile" },
];

test("the four tabs show, and each one opens", async ({ page }, testInfo) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link")).toHaveText(TABS.map((tab) => tab.label));

  for (const tab of TABS) {
    await nav.getByRole("link", { name: tab.label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${tab.path}$`));
    await expect(page.getByRole("heading", { level: 1, name: tab.label })).toBeVisible();
    await expect(nav.getByRole("link", { name: tab.label, exact: true })).toHaveAttribute("aria-current", "page");

    if (tab.label === "Profile") {
      // The name comes from the database, read with the signed-in person's own permissions.
      await expect(page.getByRole("region", { name: "Your details" })).toContainText(SHARED_NAME);
    }
    await page.screenshot({ path: `docs/screenshots/${testInfo.project.name}-${tab.file}.png` });
  }
});

test("the tab bar is fixed to the bottom and every tab is at least 44px tall", async ({ page }) => {
  await page.goto("/");
  const viewport = page.viewportSize()!;
  const nav = page.getByRole("navigation", { name: "Main" });
  const box = (await nav.boundingBox())!;
  expect(Math.round(box.y + box.height)).toBe(viewport.height);
  expect(Math.round(box.width)).toBe(viewport.width);
  await expect(nav).toHaveCSS("position", "fixed");

  for (const link of await nav.getByRole("link").all()) {
    const size = (await link.boundingBox())!;
    expect(size.height).toBeGreaterThanOrEqual(44);
    expect(size.width).toBeGreaterThanOrEqual(44);
  }
  // Nothing scrolls sideways on a phone.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
});

test("prayer and stretch screens are full screen, without the tab bar", async ({ page }) => {
  for (const [path, title] of [
    ["/prayer/example-id", "Prayer"],
    ["/stretch/example-id", "Stretch"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  }
});

test("scripture text is at least 18px", async ({ page }) => {
  await page.goto("/");
  const size = await page.locator("blockquote").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(18);
});

test("the manifest makes the app installable", async ({ page, request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("application/manifest+json");
  const manifest = await response.json();

  expect(manifest).toMatchObject({
    name: "Stretch",
    short_name: "Stretch",
    description: "Pray deliberately. Keep the hours.",
    display: "standalone",
    orientation: "portrait",
    start_url: "/",
  });
  expect(manifest.theme_color).toBeTruthy();
  expect(manifest.background_color).toBeTruthy();

  const icons: { src: string; sizes: string; type: string; purpose?: string }[] = manifest.icons;
  const find = (sizes: string, purpose: string) => icons.find((i) => i.sizes === sizes && i.purpose === purpose);
  expect(find("192x192", "any")).toBeTruthy();
  expect(find("512x512", "any")).toBeTruthy();
  expect(find("512x512", "maskable")).toBeTruthy();

  // Every icon is really there, is a PNG, and has the size it claims.
  await page.goto("/");
  for (const icon of icons) {
    const file = await request.get(icon.src);
    expect(file.ok(), icon.src).toBe(true);
    expect(file.headers()["content-type"]).toBe("image/png");
    const actual = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return `${image.naturalWidth}x${image.naturalHeight}`;
    }, icon.src);
    expect(actual, icon.src).toBe(icon.sizes);
  }
});

test("the page head has what iPhone and Android need for Add to Home Screen", async ({ page, request }) => {
  await page.goto("/");
  const head = page.locator("head");

  await expect(head.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest\.webmanifest/);
  await expect(head.locator('meta[name="viewport"]')).toHaveAttribute("content", /viewport-fit=cover/);
  await expect(head.locator('meta[name="viewport"]')).toHaveAttribute("content", /width=device-width/);
  await expect(head.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f5efff");
  await expect(head.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  await expect(head.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  await expect(head.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "Stretch");
  await expect(page).toHaveTitle(/Stretch/);

  const appleIcon = head.locator('link[rel="apple-touch-icon"]');
  await expect(appleIcon).toHaveAttribute("sizes", "180x180");
  const href = await appleIcon.getAttribute("href");
  const file = await request.get(href!);
  expect(file.ok()).toBe(true);
  expect(file.headers()["content-type"]).toBe("image/png");
});
