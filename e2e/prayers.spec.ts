import { expect, test, type Page } from "@playwright/test";
import { createAccount, deleteAccount, signIn } from "./helpers";

// These tests start signed out and create their own accounts, so each begins with an empty app.
test.use({ storageState: { cookies: [], origins: [] } });

const UUID_URL = /\/prayers\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function addPoint(page: Page, text: string) {
  await page.getByRole("button", { name: "Add a prayer point" }).click();
  await page.getByRole("textbox", { name: /^Prayer point \d+$/ }).last().fill(text);
}

async function addScripture(page: Page, reference: string, version = "", verse = "") {
  await page.getByRole("button", { name: "Add a scripture" }).click();
  const group = page.getByRole("group", { name: /^Scripture \d+$/ }).last();
  await group.getByLabel("Reference").fill(reference);
  if (version) await group.getByLabel("Version").fill(version);
  if (verse) await group.getByLabel("Verse text (optional)").fill(verse);
}

async function listCounts(page: Page) {
  await page.goto("/prayers");
  const group = page.getByRole("group", { name: "Which list to show" });
  await expect(group).toBeVisible();
  return group.getByRole("button").allTextContents();
}

test("a new person sees empty states that invite them to begin", async ({ page }, testInfo) => {
  await createAccount(page, "empty", "Ruth Adeyemi");

  // Pray home.
  await expect(page.getByText("Hello, Ruth")).toBeVisible();
  await expect(page.getByRole("heading", { name: "You're in the right place." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create your first prayer" })).toBeVisible();
  await page.screenshot({ path: `docs/screenshots/${testInfo.project.name}-pray-empty.png` });

  // My Prayers: three lists, all empty, each saying so in its own words.
  expect(await listCounts(page)).toEqual(["Prayers (0)", "Altars (0)", "Archived (0)"]);
  await expect(page.getByRole("heading", { name: "No prayers yet" })).toBeVisible();
  await page.getByRole("button", { name: "Altars (0)" }).click();
  await expect(page.getByRole("heading", { name: "No altars yet" })).toBeVisible();
  await expect(page.getByText("An altar is a long-term prayer you return to again and again.")).toBeVisible();
  await page.getByRole("button", { name: "Archived (0)" }).click();
  await expect(page.getByRole("heading", { name: "Nothing archived" })).toBeVisible();

  // The invitation leads to the form.
  await page.goto("/");
  await page.getByRole("link", { name: "Create your first prayer" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "New prayer" })).toBeVisible();

  await deleteAccount(page);
});

test("create, edit, archive, reactivate and delete prayers and an altar", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const shot = (name: string) => page.screenshot({ path: `docs/screenshots/${testInfo.project.name}-${name}.png`, fullPage: true });
  const email = await createAccount(page, "prayers", "Seyi Bello");

  // The form checks its input first.
  await page.getByRole("link", { name: "New prayer" }).click();
  await expect(page).toHaveURL(/\/prayers\/new$/);
  await page.getByRole("button", { name: "Create prayer" }).click();
  await expect(page.getByText("Give it a title.")).toBeVisible();
  await page.getByLabel("Title").fill("x".repeat(81));
  await page.getByLabel("Target hours").fill("0");
  await page.getByLabel("End date").fill("2026-12-31");
  await page.getByRole("button", { name: "Create prayer" }).click();
  await expect(page.getByText("Use 80 characters or fewer.")).toBeVisible();
  await expect(page.getByText("Enter at least 1 hour.")).toBeVisible();
  await expect(page.getByText("Add a start date, or clear the end date.")).toBeVisible();
  await expect(page).toHaveURL(/\/prayers\/new$/);

  // Create a prayer with a plan, two points and a scripture.
  await page.getByLabel("Title").fill("For Mum's recovery");
  await page.getByLabel("Target hours").fill("40");
  await page.getByLabel("Start date").fill("2026-12-01");
  await page.getByLabel("End date").fill("2026-12-31");
  await addPoint(page, "Strength for each day of treatment");
  await addPoint(page, "Wisdom for her doctors");
  await addScripture(page, "Psalm 41:3", "KJV", "The LORD will strengthen him upon the bed of languishing.");
  await shot("create-form");
  await page.getByRole("button", { name: "Create prayer" }).click();

  await expect(page).toHaveURL(UUID_URL);
  const mumUrl = page.url();
  await expect(page.getByRole("heading", { level: 1, name: "For Mum's recovery" })).toBeVisible();
  await expect(page.getByText("40h target · 1 Dec 2026 to 31 Dec 2026")).toBeVisible();
  const hours = page.getByRole("region", { name: "Hours prayed" });
  await expect(hours).toContainText("0h");
  await expect(hours).toContainText("0% of your 40 hour target");
  const points = page.getByRole("list").filter({ has: page.getByText("Strength for each day of treatment") });
  await expect(points.getByRole("listitem")).toHaveText([/Strength for each day of treatment/, /Wisdom for her doctors/]);
  await expect(page.locator("blockquote")).toHaveText("The LORD will strengthen him upon the bed of languishing.");
  await expect(page.locator("figcaption")).toHaveText(/Psalm 41:3 · KJV/);
  // Scripture is set at 18px or more.
  const verseSize = await page.locator("blockquote").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(verseSize).toBeGreaterThanOrEqual(18);
  await shot("prayer-detail");

  // Create an altar. An altar has no dates, only an hours target.
  await page.goto("/prayers/new");
  await page.getByLabel("Title").fill("Morning watch");
  await page.getByText("A long-term prayer you keep returning to.").click();
  await expect(page.getByLabel("Start date")).toHaveCount(0);
  await expect(page.getByText("An altar has no end date.")).toBeVisible();
  await page.getByLabel("Target hours").fill("100");
  await addPoint(page, "Thank God for today");
  await addPoint(page, "Pray for the family");
  await addPoint(page, "Listen");
  await addScripture(page, "Psalm 5:3");
  await page.getByRole("button", { name: "Create altar" }).click();
  await expect(page).toHaveURL(UUID_URL);
  await expect(page.getByRole("heading", { level: 1, name: "Morning watch" })).toBeVisible();
  await expect(page.getByText("100h target")).toBeVisible();
  // Next keeps the page you came from in the document, hidden, so this looks only at what is showing.
  await expect(page.getByText("Altar", { exact: true }).filter({ visible: true })).toHaveCount(1);

  // A second prayer, with only a title.
  await page.goto("/prayers/new");
  await page.getByLabel("Title").fill("A new job for David");
  await page.getByRole("button", { name: "Create prayer" }).click();
  await expect(page).toHaveURL(UUID_URL);
  const davidUrl = page.url();
  await expect(page.getByText("No plan set.")).toBeVisible();
  await expect(page.getByText("No prayer points yet.")).toBeVisible();

  // Pray home shows a tile for each, altars first.
  await page.goto("/");
  const tiles = page.locator("main").getByRole("link").filter({ hasText: "prayed" });
  await expect(tiles).toHaveCount(3);
  await expect(tiles.first()).toContainText("Morning watch");
  await expect(tiles.first()).toContainText("3 points");
  await expect(page.locator("main")).toContainText("For Mum's recovery");
  await expect(page.locator("main")).toContainText("A new job for David");
  await page.screenshot({ path: `docs/screenshots/${testInfo.project.name}-pray-home.png` });
  if (testInfo.project.name === "phone-390x844") {
    // On a wide screen the app stays in a centered phone-width column.
    const phone = page.viewportSize()!;
    await page.setViewportSize({ width: 1280, height: 800 });
    const column = (await page.locator("main").boundingBox())!;
    expect(column.width).toBeLessThanOrEqual(448);
    expect(Math.abs(column.x + column.width / 2 - 640)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: "docs/screenshots/desktop-1280x800-pray-home.png" });
    await page.setViewportSize(phone);
  }

  // My Prayers lists them with counts.
  expect(await listCounts(page)).toEqual(["Prayers (2)", "Altars (1)", "Archived (0)"]);
  await expect(page.getByRole("link", { name: /For Mum's recovery/ })).toContainText("40h target");
  await page.screenshot({ path: `docs/screenshots/${testInfo.project.name}-my-prayers.png` });
  await page.getByRole("button", { name: "Altars (1)" }).click();
  await expect(page.getByRole("link", { name: /Morning watch/ })).toBeVisible();

  // Edit: rename, change the plan, edit, reorder, add and remove points, edit and add scriptures.
  await page.goto(mumUrl);
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await expect(page.getByLabel("Title")).toHaveValue("For Mum's recovery");
  await expect(page.getByText("The type is chosen once, when it is created.")).toBeVisible();
  await page.getByLabel("Title").fill("For Mum's full recovery");
  await page.getByLabel("Target hours").fill("60");
  await page.getByRole("textbox", { name: "Prayer point 1" }).fill("Strength and peace through treatment");
  await page.getByRole("button", { name: "Move prayer point 2 up" }).click();
  await expect(page.getByRole("textbox", { name: "Prayer point 1" })).toHaveValue("Wisdom for her doctors");
  await addPoint(page, "Thanksgiving for every good report");
  await addPoint(page, "This one will be removed");
  await page.getByRole("button", { name: "Remove prayer point 4" }).click();
  await expect(page.getByRole("textbox", { name: /^Prayer point \d+$/ })).toHaveCount(3);
  await page.getByRole("group", { name: "Scripture 1" }).getByLabel("Version").fill("NKJV");
  await addScripture(page, "Jeremiah 30:17", "KJV", "For I will restore health unto thee.");
  await page.getByRole("button", { name: "Move scripture 2 up" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL(mumUrl);
  await expect(page.getByRole("heading", { level: 1, name: "For Mum's full recovery" })).toBeVisible();
  await expect(page.getByText("60h target · 1 Dec 2026 to 31 Dec 2026")).toBeVisible();
  const expectEdited = async () => {
    const list = page.getByRole("list").filter({ has: page.getByText("Wisdom for her doctors") });
    await expect(list.getByRole("listitem")).toHaveText([
      /Wisdom for her doctors/,
      /Strength and peace through treatment/,
      /Thanksgiving for every good report/,
    ]);
    await expect(page.locator("figcaption")).toHaveText([/Jeremiah 30:17 · KJV/, /Psalm 41:3 · NKJV/]);
  };
  await expectEdited();
  // It was saved, not just shown: a full reload reads it back from the database.
  await page.reload();
  await expectEdited();

  // Leaving a form with unsaved changes asks first.
  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Title").fill("Something I will not keep");
  await page.getByRole("button", { name: "Cancel" }).click();
  const leave = page.getByRole("dialog", { name: "Leave without saving?" });
  await leave.getByRole("button", { name: "Keep writing" }).click();
  await expect(page.getByLabel("Title")).toHaveValue("Something I will not keep");
  await page.getByRole("button", { name: "Cancel" }).click();
  await leave.getByRole("button", { name: "Leave" }).click();
  await expect(page).toHaveURL(mumUrl);
  await expect(page.getByRole("heading", { level: 1, name: "For Mum's full recovery" })).toBeVisible();

  // Archive: it leaves the active lists but keeps everything.
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Archived", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reactivate" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
  await expect(page.getByRole("listitem").filter({ hasText: "Wisdom for her doctors" })).toBeVisible();
  await page.goto(`${mumUrl}/edit`);
  await expect(page).toHaveURL(mumUrl);
  expect(await listCounts(page)).toEqual(["Prayers (1)", "Altars (1)", "Archived (1)"]);
  await page.getByRole("button", { name: "Archived (1)" }).click();
  await expect(page.getByRole("link", { name: /For Mum's full recovery/ })).toBeVisible();
  await page.goto("/");
  await expect(page.locator("main").getByRole("link").filter({ hasText: "prayed" })).toHaveCount(2);
  await expect(page.locator("main")).not.toContainText("For Mum's full recovery");

  // Reactivate: it comes back.
  await page.goto(mumUrl);
  await page.getByRole("button", { name: "Reactivate" }).click();
  await expect(page.getByRole("link", { name: "Edit" })).toBeVisible();
  expect(await listCounts(page)).toEqual(["Prayers (2)", "Altars (1)", "Archived (0)"]);

  // Delete asks first, and "Keep prayer" really keeps it.
  await page.goto(davidUrl);
  await page.getByRole("button", { name: "Delete" }).click();
  const confirm = page.getByRole("dialog", { name: "Delete this prayer?" });
  await expect(confirm).toContainText("A new job for David");
  await page.screenshot({ path: `docs/screenshots/${testInfo.project.name}-delete-confirmation.png` });
  await confirm.getByRole("button", { name: "Keep prayer" }).click();
  await expect(confirm).toBeHidden();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "A new job for David" })).toBeVisible();

  // Confirming removes it, and its address stops working.
  await page.getByRole("button", { name: "Delete" }).click();
  await confirm.getByRole("button", { name: "Delete prayer" }).click();
  await expect(page).toHaveURL(/\/prayers$/);
  expect(await listCounts(page)).toEqual(["Prayers (1)", "Altars (1)", "Archived (0)"]);
  await page.goto(davidUrl);
  await expect(page.getByRole("heading", { level: 1, name: "We couldn't find that" })).toBeVisible();

  // Everything survives closing the app: sign out, sign in again, and it is all still there.
  await page.goto("/profile");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await signIn(page, email);
  await expect(page.getByRole("heading", { level: 1, name: "Pray" })).toBeVisible();
  await expect(page.locator("main").getByRole("link").filter({ hasText: "prayed" })).toHaveCount(2);
  await page.goto(mumUrl);
  await expectEdited();

  await deleteAccount(page);
});

test("another person's prayer shows a not-found page, never its data", async ({ page, browser }) => {
  // The owner creates a prayer.
  await createAccount(page, "owner", "Tolu Owner");
  await page.goto("/prayers/new");
  await page.getByLabel("Title").fill("A private matter between me and God");
  await addPoint(page, "Nobody else should read this");
  await page.getByRole("button", { name: "Create prayer" }).click();
  await expect(page).toHaveURL(UUID_URL);
  const privateUrl = page.url();

  // A different person, signed in, opens the same address.
  const other = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const otherPage = await other.newPage();
  await createAccount(otherPage, "visitor", "Vera Visitor");
  for (const url of [privateUrl, `${privateUrl}/edit`]) {
    await otherPage.goto(url);
    await expect(otherPage.getByRole("heading", { level: 1, name: "We couldn't find that" }), url).toBeVisible();
    await expect(otherPage.locator("body")).not.toContainText("A private matter");
    await expect(otherPage.locator("body")).not.toContainText("Nobody else should read this");
  }
  // And it is not in their lists.
  await otherPage.goto("/");
  await expect(otherPage.getByRole("heading", { name: "You're in the right place." })).toBeVisible();

  // Addresses that are not ids at all get the same page, not an error.
  for (const path of ["/prayers/not-an-id", "/prayers/10000000-0000-4000-a000-00000000dead", "/prayers/1%27%20or%201=1"]) {
    await otherPage.goto(path);
    await expect(otherPage.getByRole("heading", { level: 1, name: "We couldn't find that" }), path).toBeVisible();
  }

  // The owner still sees it.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "A private matter between me and God" })).toBeVisible();

  await deleteAccount(otherPage);
  await other.close();
  await deleteAccount(page);
});
