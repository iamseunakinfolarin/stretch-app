import { expect, type Page } from "@playwright/test";

export const PASSWORD = "stretch-e2e-password";

/** The name of the account the signed-in smoke tests share. */
export const SHARED_NAME = "Grace Tester";

/** A fresh address for every account, so tests never collide. The domain can never receive mail. */
export function uniqueEmail(label: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `e2e-${label}-${Date.now()}-${random}@stretch-tests.invalid`;
}

export async function signUp(page: Page, email: string, password = PASSWORD) {
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/welcome$/);
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function finishWelcome(page: Page, name: string) {
  await expect(page.getByRole("heading", { level: 1, name: "What should we call you?" })).toBeVisible();
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Pray" })).toBeVisible();
}

/** Deletes the signed-in account through the Profile tab, the same way a person would. */
export async function deleteAccount(page: Page) {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Delete account" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete your account?" });
  await dialog.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
}

/** The form's own error message. (Next adds an empty role="alert" element of its own to every page.) */
export function formAlert(page: Page) {
  return page.locator("main [role=alert]");
}
