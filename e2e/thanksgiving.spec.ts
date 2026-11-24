import { expect, test, type Page } from "@playwright/test";
import { createAccount, deleteAccount } from "./helpers";

// These tests start signed out and create their own accounts, so each begins with an empty app.
test.use({ storageState: { cookies: [], origins: [] } });

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
/** A category card on the Thanksgiving page (the recent list can mention the same names). */
const card = (page: Page, name: RegExp) => page.getByRole("region", { name: "Categories" }).getByRole("link", { name });

const ENTRY_URL = new RegExp(`/thanksgiving/${UUID}$`);

test("record thanksgivings, group them in categories, scroll through them and keep them private", async ({ page, browser }, testInfo) => {
  test.setTimeout(180_000);
  const shot = (name: string) => page.screenshot({ path: `docs/screenshots/${testInfo.project.name}-${name}.png`, fullPage: true });
  await createAccount(page, "thanks", "Ruth Adeyemi");

  // An empty page invites the first one.
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Thanksgiving", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "God's goodness" })).toBeVisible();
  await expect(page.getByText("Every answer to prayer. Nothing is too small.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nothing recorded yet" })).toBeVisible();
  await shot("thanksgiving-empty");
  // The old address still lands here.
  await page.goto("/testimonies");
  await expect(page).toHaveURL(/\/thanksgiving$/);

  // A prayer to link one to.
  await page.goto("/prayers/new");
  await page.getByLabel("Title").fill("For Mum's recovery");
  await page.getByRole("button", { name: "Create prayer" }).click();
  await expect(page).toHaveURL(new RegExp(`/prayers/${UUID}$`));
  const prayerUrl = page.url();

  // The first one: with a new category.
  await page.goto("/thanksgiving");
  await page.getByRole("link", { name: "Start documenting God's goodness" }).click();
  await expect(page).toHaveURL(/\/thanksgiving\/new$/);
  await page.getByRole("button", { name: "Save thanksgiving" }).click();
  await expect(page.getByText("Give it a short title.")).toBeVisible();
  await expect(page.getByText("Write what God did, even a line.")).toBeVisible();
  await page.getByLabel("Title").fill("Mum walked into church");
  await page.getByLabel("What God did").fill("After months in bed, she walked in on her own and sat in her old seat.");
  await page.getByLabel("Category", { exact: true }).selectOption({ label: "New category…" });
  await page.getByRole("button", { name: "Save thanksgiving" }).click();
  await expect(page.getByText("Name the category.")).toBeVisible();
  await page.getByLabel("Category name").fill("Healing");
  await page.getByRole("radio", { name: "Rose" }).check({ force: true });
  await shot("thanksgiving-form");
  await page.getByRole("button", { name: "Save thanksgiving" }).click();
  await expect(page).toHaveURL(ENTRY_URL);
  const privateUrl = page.url();
  await expect(page.getByRole("heading", { level: 1, name: "Mum walked into church" })).toBeVisible();
  await expect(page.getByText("Only you can see this.")).toBeVisible();
  const bodySize = await page.getByText("After months in bed").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(bodySize).toBeGreaterThanOrEqual(18);
  await shot("thanksgiving-entry");

  // Coming straight back starts with a blank form.
  await page.getByRole("link", { name: "Thanksgiving", exact: true }).first().click();
  await page.getByRole("link", { name: "Start documenting God's goodness" }).click();
  await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue("");

  // The second one: linked to the prayer, shared, no category.
  await page.getByLabel("Title").fill("The scan came back clear");
  await page.getByLabel("What God did").fill("The doctor said there was nothing to see.");
  await page.getByLabel("Answer to which prayer? (optional)").selectOption({ label: "For Mum's recovery" });
  await page.getByRole("checkbox", { name: /Share with the people in this prayer/ }).check();
  await page.getByRole("button", { name: "Save thanksgiving" }).click();
  await expect(page).toHaveURL(ENTRY_URL);
  await expect(page.getByText("Shared with the people in this prayer.")).toBeVisible();
  const sharedUrl = page.url();
  await expect(page.getByRole("link", { name: "For Mum's recovery" })).toBeVisible();

  // The page groups them: a glowing card per category, and the ones with none.
  await page.goto("/thanksgiving");
  await expect(card(page, /Healing/)).toContainText("1 thanksgiving");
  await expect(card(page, /No category/)).toContainText("1 thanksgiving");
  await expect(page.getByRole("heading", { name: "Recent" })).toBeVisible();
  await shot("thanksgiving-home");
  await card(page, /Healing/).click();
  await expect(page.getByRole("heading", { level: 1, name: "Healing" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Mum walked into church/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /The scan came back clear/ })).toHaveCount(0);
  await shot("thanksgiving-category");

  // The reel: one at a time, with a play button that is off to begin with.
  await page.goto("/thanksgiving/scroll");
  await expect(page.getByRole("region", { name: "Thanksgivings" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "The scan came back clear" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Mum walked into church" })).toBeAttached();
  const play = page.getByRole("button", { name: "Play slowly" });
  await expect(play).toHaveAttribute("aria-pressed", "false");
  await play.click();
  await expect(page.getByRole("button", { name: "Pause" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Pause" }).click();
  await shot("thanksgiving-scroll");

  // The prayer's profile lists the answers to it.
  await page.goto(prayerUrl);
  await expect(page.getByRole("heading", { name: "Answers to this prayer" })).toBeVisible();
  await expect(page.getByRole("link", { name: /The scan came back clear/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Mum walked into church/ })).toHaveCount(0);

  // Edit, from the small link at the top, then delete from the edit page.
  await page.goto(sharedUrl);
  await page.getByRole("link", { name: "Edit thanksgiving" }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await page.getByLabel("Title").fill("The scan came back completely clear");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "The scan came back completely clear" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "The scan came back completely clear" })).toBeVisible();

  // Someone else cannot see a private one, or a shared one they are not in the prayer for.
  const other = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const otherPage = await other.newPage();
  await createAccount(otherPage, "thanks-other", "Dayo Ade");
  for (const url of [privateUrl, sharedUrl]) {
    await otherPage.goto(url);
    await expect(otherPage.getByRole("heading", { level: 1, name: "We couldn't find that" })).toBeVisible();
  }
  await otherPage.goto(`${sharedUrl}/edit`);
  await expect(otherPage.getByRole("heading", { level: 1, name: "We couldn't find that" })).toBeVisible();
  await deleteAccount(otherPage);
  await other.close();

  // Deleting a category keeps its thanksgivings, which become uncategorised.
  await page.goto("/thanksgiving");
  await card(page, /Healing/).click();
  await page.getByRole("button", { name: "Delete category" }).click();
  const confirm = page.getByRole("dialog", { name: "Delete this category?" });
  await confirm.getByRole("button", { name: "Keep it" }).click();
  await page.getByRole("button", { name: "Delete category" }).click();
  await confirm.getByRole("button", { name: "Delete category" }).click();
  await expect(page).toHaveURL(/\/thanksgiving$/);
  await expect(card(page, /Healing/)).toHaveCount(0);
  await expect(card(page, /No category/)).toContainText("2 thanksgivings");

  // Delete one from its edit page, with a confirmation.
  await page.goto(`${privateUrl}/edit`);
  await page.getByRole("button", { name: "Delete thanksgiving" }).click();
  await page.getByRole("dialog", { name: "Delete this thanksgiving?" }).getByRole("button", { name: "Delete thanksgiving" }).click();
  await expect(page).toHaveURL(/\/thanksgiving$/);
  await expect(card(page, /No category/)).toContainText("1 thanksgiving");
  await page.goto(privateUrl);
  await expect(page.getByRole("heading", { level: 1, name: "We couldn't find that" })).toBeVisible();

  await deleteAccount(page);
});
