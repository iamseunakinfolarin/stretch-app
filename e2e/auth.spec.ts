import { expect, test } from "@playwright/test";
import { deleteAccount, finishWelcome, formAlert, PASSWORD, signIn, signUp, uniqueEmail } from "./helpers";

// These tests start signed out and create their own accounts.
test.use({ storageState: { cookies: [], origins: [] } });

test("a signed-out visitor is sent to sign-in from every screen", async ({ page }) => {
  for (const path of ["/", "/prayers", "/testimonies", "/profile", "/welcome", "/prayers/new", "/prayers/10000000-0000-4000-a000-000000000001", "/stretch/example-id"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  }
});

test("the forms check their input before asking the server", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your email address.")).toBeVisible();
  await expect(page.getByText("Choose a password.")).toBeVisible();

  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("That doesn't look like an email address.")).toBeVisible();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(/\/sign-up$/);

  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Enter your email address.")).toBeVisible();
  await expect(page.getByText("Enter your password.")).toBeVisible();
});

test("fields are 16px or larger and buttons are easy to tap", async ({ page }) => {
  for (const path of ["/sign-in", "/sign-up"]) {
    await page.goto(path);
    for (const field of await page.locator("main input").all()) {
      const size = await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(size, `${path} input font size`).toBeGreaterThanOrEqual(16);
      expect((await field.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    for (const control of await page.locator("main button, main a").all()) {
      expect((await control.boundingBox())!.height, `${path} ${await control.textContent()}`).toBeGreaterThanOrEqual(44);
    }
    const viewport = page.viewportSize()!;
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  }
});

test("sign up, onboard, sign out, sign in again, delete the account", async ({ page }, testInfo) => {
  const email = uniqueEmail("journey");
  const shot = (name: string) => page.screenshot({ path: `docs/screenshots/${testInfo.project.name}-${name}.png` });

  await page.goto("/sign-in");
  await shot("sign-in");
  await page.goto("/sign-up");
  await shot("sign-up");

  // Sign up: straight in, and straight to onboarding.
  await signUp(page, email);
  await shot("welcome");

  // Onboarding can't be skipped.
  for (const path of ["/", "/profile", "/prayers/new"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/welcome$/);
  }

  // The name has to be 1 to 40 characters.
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Enter a name.")).toBeVisible();
  await page.getByLabel("Your name").fill("x".repeat(41));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Use 40 characters or fewer.")).toBeVisible();
  await expect(page).toHaveURL(/\/welcome$/);

  await finishWelcome(page, "  Ada   Lovelace ");

  // The name was saved to the profile: it is still there after a full reload.
  await page.goto("/profile");
  const details = page.getByRole("region", { name: "Your details" });
  await expect(details).toContainText("Ada Lovelace");
  await expect(details).toContainText(email);
  await page.reload();
  await expect(details).toContainText("Ada Lovelace");

  // Once onboarded, the welcome and sign-in screens are behind you.
  for (const path of ["/welcome", "/sign-in", "/sign-up"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/$/);
  }

  // Change the name.
  await page.goto("/profile");
  await page.getByRole("button", { name: "Change name" }).click();
  await page.getByLabel("Your name").fill("Ada L.");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(details).toContainText("Ada L.");
  await expect(details).not.toContainText("Ada Lovelace");

  // Sign out.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/sign-in$/);

  // The email is taken now.
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(formAlert(page)).toContainText("already an account with this email");

  // A wrong password is refused, with a message that does not say which part was wrong.
  await signIn(page, email, "definitely-not-the-password");
  await expect(formAlert(page)).toContainText("That email and password don't match");
  await expect(page).toHaveURL(/\/sign-in$/);

  // The right password goes straight to the app, not back to onboarding.
  await signIn(page, email);
  await expect(page.getByRole("heading", { level: 1, name: "Pray" })).toBeVisible();
  await page.goto("/profile");
  await expect(details).toContainText("Ada L.");

  // Delete account asks first, and "Keep my account" really keeps it.
  await page.getByRole("button", { name: "Delete account" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete your account?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Keep my account" }).click();
  await expect(dialog).toBeHidden();
  await expect(details).toContainText("Ada L.");

  // Confirming removes the account, and the old login stops working.
  await deleteAccount(page);
  await signIn(page, email);
  await expect(formAlert(page)).toContainText("That email and password don't match");
});

test("a form can't be submitted before the page is ready, so a password never reaches the address", async ({ browser }) => {
  // With JavaScript off the page never becomes ready, which is the worst case of a slow phone.
  const context = await browser.newContext({ javaScriptEnabled: false, storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  for (const [path, button] of [
    ["/sign-in", "Sign in"],
    ["/sign-up", "Create account"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: button })).toBeDisabled();
    await expect(page.locator("form")).toHaveAttribute("method", "post");
    await page.getByLabel("Email").fill("someone@example.com");
    await page.getByLabel("Password").fill("a-secret-password");
    await page.getByLabel("Password").press("Enter");
    await page.waitForTimeout(300);
    expect(page.url(), path).not.toContain("a-secret-password");
    expect(page.url(), path).not.toContain("?");
  }
  await context.close();
});
