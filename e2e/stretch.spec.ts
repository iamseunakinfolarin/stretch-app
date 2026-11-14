import { expect, test, type Page } from "@playwright/test";
import { createAccount, deleteAccount } from "./helpers";

// These tests start signed out and create their own accounts, so each begins with an empty app.
test.use({ storageState: { cookies: [], origins: [] } });

const UUID_URL = /\/prayers\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MIN = 60_000;

async function createPrayer(page: Page): Promise<string> {
  await page.goto("/prayers/new");
  await page.getByLabel("Title").fill("For Mum's recovery");
  await page.getByRole("button", { name: "Add a prayer point" }).click();
  await page.getByRole("textbox", { name: /^Prayer point \d+$/ }).last().fill("Strength for each day of treatment");
  await page.getByRole("button", { name: "Add a prayer point" }).click();
  await page.getByRole("textbox", { name: /^Prayer point \d+$/ }).last().fill("Wisdom for her doctors");
  await page.getByRole("button", { name: "Add a scripture" }).click();
  const group = page.getByRole("group", { name: /^Scripture \d+$/ }).last();
  await group.getByLabel("Reference").fill("Psalm 41:3");
  await group.getByLabel("Version").fill("KJV");
  await group.getByLabel("Verse text (optional)").fill("The LORD will strengthen him upon the bed of languishing.");
  await page.getByRole("button", { name: "Create prayer" }).click();
  await expect(page).toHaveURL(UUID_URL);
  return new URL(page.url()).pathname.split("/").pop()!;
}

/** Opens the stretch screen with the browser's clock under the test's control. */
async function openStretch(page: Page, id: string) {
  await page.clock.install();
  await page.goto(`/stretch/${id}`);
}

const clock = (page: Page) => page.getByRole("timer", { name: "Time prayed" });

test("a stretch: points, scripture, check-ins, a missed check-in, pause and the end", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const shot = (name: string) => page.screenshot({ path: `docs/screenshots/${testInfo.project.name}-${name}.png`, fullPage: true });
  await createAccount(page, "stretch", "Seyi Bello");
  const id = await createPrayer(page);

  // From the prayer, start a stretch.
  await page.getByRole("link", { name: "Start a stretch" }).click();
  await expect(page).toHaveURL(new RegExp(`/stretch/${id}$`));
  await expect(page.getByRole("heading", { level: 1, name: "For Mum's recovery" })).toBeVisible();
  await shot("stretch-start");
  await page.clock.install();
  await page.reload();
  await page.getByRole("button", { name: "Start stretch" }).click();

  // The clock, the points one at a time, and the key scripture (18px or more).
  await expect(clock(page)).toHaveText("0:00");
  await expect(page.getByText("Prayer point 1 of 2")).toBeVisible();
  await expect(page.getByText("Strength for each day of treatment")).toBeVisible();
  await page.getByRole("button", { name: "Next prayer point" }).click();
  await expect(page.getByText("Prayer point 2 of 2")).toBeVisible();
  await expect(page.getByText("Wisdom for her doctors")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next prayer point" })).toBeDisabled();
  await page.getByRole("button", { name: "Previous prayer point" }).click();
  await expect(page.getByText("Prayer point 1 of 2")).toBeVisible();
  const verse = page.locator("blockquote");
  await expect(verse).toHaveText("The LORD will strengthen him upon the bed of languishing.");
  expect(await verse.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(18);

  // Time comes from timestamps: jump 3 minutes at once and it reads 3:00.
  await page.clock.fastForward(3 * MIN);
  await expect(clock(page)).toHaveText("3:00");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await shot("stretch-running");

  // Pause stops the clock, and the time paused is not counted.
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.clock.fastForward(20 * MIN);
  await expect(clock(page)).toHaveText("3:00");
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // A check-in appears between 4 and 6 minutes of praying time. Go past 6 and it must be showing.
  await page.clock.fastForward(3 * MIN + 1000);
  const checkIn = page.getByRole("dialog", { name: "Still praying?" });
  await expect(checkIn).toBeVisible();
  await shot("stretch-check-in");
  await checkIn.getByRole("button", { name: "Yes, I'm still praying" }).click();
  await expect(checkIn).toBeHidden();

  // The next one: this time nobody answers. After 2 minutes the clock pauses where it appeared.
  await page.clock.fastForward(6 * MIN + 1000);
  await expect(checkIn).toBeVisible();
  await page.clock.fastForward(2 * MIN + 1000);
  await expect(checkIn).toBeHidden();
  await expect(page.getByText(/We didn't hear back, so your clock paused at/)).toBeVisible();
  const pausedAt = await clock(page).textContent();
  await page.clock.fastForward(30 * MIN);
  await expect(clock(page)).toHaveText(pausedAt!);
  await shot("stretch-missed");

  // Resume, then end. The confirmation says what will be saved.
  await page.getByRole("button", { name: "Resume" }).click();
  await page.getByRole("button", { name: "End stretch" }).click();
  const dialog = page.getByRole("dialog", { name: "End this stretch?" });
  await expect(dialog).toContainText("will be added to your hours");
  await dialog.getByRole("button", { name: "Keep praying" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "End stretch" }).click();
  await dialog.getByRole("button", { name: "End stretch" }).click();
  await expect(page.getByRole("status")).toContainText("added to your hours");
  await shot("stretch-saved");

  // The hours are on the prayer.
  await page.getByRole("link", { name: "Back to this prayer" }).click();
  await expect(page.getByRole("region", { name: "Hours prayed" })).not.toContainText("0h");
  await expect(page.getByRole("region", { name: "Hours prayed" })).toContainText(/\d+m/);

  await deleteAccount(page);
});

test("a stretch survives a reload, and a lost connection never loses the time", async ({ page, context }) => {
  test.setTimeout(180_000);
  await createAccount(page, "stretch-offline", "Ruth Adeyemi");
  const id = await createPrayer(page);

  // Reload in the middle: the stretch carries on from its stored start time.
  await openStretch(page, id);
  await page.getByRole("button", { name: "Start stretch" }).click();
  await page.clock.fastForward(MIN);
  await expect(clock(page)).toHaveText("1:00");
  await page.reload();
  await expect(clock(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Start stretch" })).toHaveCount(0);

  // End with no connection: the stretch is kept on the phone.
  await page.clock.fastForward(MIN);
  await context.setOffline(true);
  await page.getByRole("button", { name: "End stretch" }).click();
  await page.getByRole("dialog", { name: "End this stretch?" }).getByRole("button", { name: "End stretch" }).click();
  await expect(page.getByRole("status")).toContainText("saved on this phone");

  // Back online, it reaches the database, once.
  await context.setOffline(false);
  await page.goto(`/prayers/${id}`);
  await expect(page.getByRole("region", { name: "Hours prayed" })).toContainText("2m", { timeout: 15_000 });
  await page.reload();
  await expect(page.getByRole("region", { name: "Hours prayed" })).toContainText("2m");
  await expect(page.getByRole("region", { name: "Hours prayed" })).not.toContainText("4m");

  await deleteAccount(page);
});

test("under a minute is not saved, and someone else's prayer is not found", async ({ page }) => {
  await createAccount(page, "stretch-short", "Dayo Ade");
  const id = await createPrayer(page);
  await openStretch(page, id);
  await page.getByRole("button", { name: "Start stretch" }).click();
  await page.clock.fastForward(30_000);
  await page.getByRole("button", { name: "End stretch" }).click();
  const dialog = page.getByRole("dialog", { name: "End this stretch?" });
  await expect(dialog).toContainText("less than a minute");
  await dialog.getByRole("button", { name: "End stretch" }).click();
  await expect(page.getByRole("status")).toContainText("under a minute");

  await page.goto("/stretch/4f1c8f0e-0000-4000-8000-000000000999");
  await expect(page.getByRole("heading", { name: "We couldn't find that" })).toBeVisible();

  await deleteAccount(page);
});
