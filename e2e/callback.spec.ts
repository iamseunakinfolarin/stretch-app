import { expect, test } from "@playwright/test";

// A signed-out visitor following an email link that cannot be used lands on sign-in, never on an error page.
test.use({ storageState: { cookies: [], origins: [] } });

test("an unusable email link leads to sign-in", async ({ page }) => {
  await page.goto("/auth/callback?code=not-a-real-code");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("a code sent to the home page is passed on to the callback", async ({ page }) => {
  await page.goto("/?code=13b5b6f5-a5ee-45d1-b885-79185504d7e4");
  await expect(page).toHaveURL(/\/sign-in$/);
});
