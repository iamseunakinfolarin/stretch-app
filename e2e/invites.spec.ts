import { expect, test, type Page } from "@playwright/test";
import { createAccount, deleteAccount, PASSWORD, uniqueEmail } from "./helpers";

// Two people: one invites, the other follows the link before even having an account.
test.use({ storageState: { cookies: [], origins: [] } });

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

async function inviteCode(page: Page): Promise<string> {
  const text = (await page.getByLabel("Invite message").textContent()) ?? "";
  const match = text.match(/\/join\/([A-Z2-9]{8})$/);
  expect(match, `an invite link in "${text}"`).not.toBeNull();
  return match![1];
}

test("invite a friend by link: they sign up, join, pray along, can leave, and an old link stops working", async ({ page, browser }, testInfo) => {
  test.setTimeout(180_000);
  const shot = (p: Page, name: string) => p.screenshot({ path: `docs/screenshots/${testInfo.project.name}-${name}.png`, fullPage: true });

  // The owner makes a prayer with a point.
  await createAccount(page, "inviter", "Grace Owner");
  await page.goto("/prayers/new");
  await page.getByLabel("Title").fill("For Mum's recovery");
  await page.getByRole("button", { name: "Add a prayer point" }).click();
  await page.getByRole("textbox", { name: /^Prayer point \d+$/ }).last().fill("Strength for each day of treatment");
  await page.getByRole("button", { name: "Create prayer" }).click();
  await expect(page).toHaveURL(new RegExp(`/prayers/${UUID}$`));
  const prayerUrl = page.url();
  await expect(page.getByRole("heading", { name: "People praying (1)" })).toBeVisible();

  // Invite friends: a link to copy or share.
  await page.getByRole("button", { name: "Invite friends" }).click();
  const code = await inviteCode(page);
  await expect(page.getByLabel("Invite message")).toHaveText(/^Grace is inviting you to pray together on "For Mum's recovery"\. Join here: http\S+\/join\/[A-Z2-9]{8}$/);
  await expect(page.getByRole("button", { name: "Copy invite" })).toBeVisible();
  await shot(page, "invite-link");

  // The friend opens the link with no account. They see who is inviting them before signing up,
  // and so does a link preview.
  const friendContext = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const friend = await friendContext.newPage();
  await friend.goto(`/join/${code}`);
  await expect(friend).toHaveURL(new RegExp(`/join/${code}$`));
  await expect(friend.getByText("Grace is inviting you to pray together", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(friend.getByRole("heading", { level: 1, name: "For Mum's recovery" })).toBeVisible();
  await expect(friend.locator('meta[property="og:title"]')).toHaveAttribute("content", "Grace is inviting you to pray together");
  await expect(friend.locator('meta[property="og:description"]')).toHaveAttribute("content", 'on "For Mum\'s recovery". Join on Stretch.');
  await expect(friend.getByRole("listitem")).toHaveCount(0);
  await shot(friend, "invite-signed-out");
  await friend.getByRole("link", { name: "Sign up to join" }).click();
  await expect(friend).toHaveURL(/\/sign-up$/);
  await friend.getByLabel("Email").fill(uniqueEmail("invitee"));
  await friend.getByLabel("Password").fill(PASSWORD);
  await friend.getByRole("button", { name: "Create account" }).click();
  await expect(friend).toHaveURL(/\/welcome$/);
  await friend.getByLabel("Your name").fill("Dayo Ade");
  await friend.getByRole("button", { name: "Continue" }).click();
  await expect(friend).toHaveURL(new RegExp(`/join/${code}$`));
  await expect(friend.getByText("Grace is inviting you to pray together", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(friend.getByRole("heading", { level: 1, name: "For Mum's recovery" })).toBeVisible();
  await shot(friend, "invite-join");

  // Join: they see the prayer, can pray, but cannot edit it.
  await friend.getByRole("button", { name: "Join this prayer" }).click();
  await expect(friend).toHaveURL(prayerUrl);
  await expect(friend.getByRole("listitem").filter({ hasText: "Strength for each day of treatment" })).toBeVisible();
  await expect(friend.getByRole("link", { name: "Start praying" })).toBeVisible();
  await expect(friend.getByRole("link", { name: /^Edit (prayer|altar)$/ })).toHaveCount(0);
  await expect(friend.getByRole("link", { name: "Add a prayer point" })).toHaveCount(0);
  await expect(friend.getByRole("heading", { name: "People praying (2)" })).toBeVisible();
  await expect(friend.getByRole("button", { name: "Leave this prayer" })).toBeVisible();
  await shot(friend, "invite-member-view");
  // It is on their Pray home, marked Shared.
  await friend.goto("/");
  await expect(friend.locator("main").getByRole("link").filter({ hasText: "For Mum's recovery" })).toContainText("Shared");

  // The owner sees them, and makes a new link: the old one stops working.
  await page.reload();
  await expect(page.getByRole("heading", { name: "People praying (2)" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Dayo Ade" })).toBeVisible();
  await page.getByRole("button", { name: "Make a new link" }).click();
  await page.getByRole("dialog", { name: "Make a new link?" }).getByRole("button", { name: "Make a new link" }).click();
  await expect.poll(() => inviteCode(page)).not.toBe(code);
  const newCode = await inviteCode(page);

  // The member leaves; it leaves their lists.
  await friend.goto(prayerUrl);
  await friend.getByRole("button", { name: "Leave this prayer" }).click();
  await friend.getByRole("dialog", { name: "Leave this prayer?" }).getByRole("button", { name: "Leave" }).click();
  await expect(friend).toHaveURL(/\/prayers$/);
  await friend.goto(prayerUrl);
  await expect(friend.getByRole("heading", { level: 1, name: "We couldn't find that" })).toBeVisible();

  // The old link no longer works; the new one lets them back in.
  await friend.goto(`/join/${code}`);
  await expect(friend.getByRole("heading", { name: "This invite link doesn't work" })).toBeVisible();
  await friend.goto(`/join/${newCode}`);
  await friend.getByRole("button", { name: "Join this prayer" }).click();
  await expect(friend).toHaveURL(prayerUrl);

  // The owner can remove a member, after a confirmation.
  await page.reload();
  await page.getByRole("button", { name: "Remove Dayo Ade" }).click();
  await page.getByRole("dialog", { name: "Remove Dayo Ade?" }).getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("heading", { name: "People praying (1)" })).toBeVisible();
  await friend.goto(prayerUrl);
  await expect(friend.getByRole("heading", { level: 1, name: "We couldn't find that" })).toBeVisible();

  await deleteAccount(friend);
  await friendContext.close();
  await deleteAccount(page);
});
