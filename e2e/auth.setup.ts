import { test as setup } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SESSION_FILE } from "../playwright.config";
import { finishWelcome, SHARED_NAME, signUp, uniqueEmail } from "./helpers";

setup("create an account and sign in", async ({ page }) => {
  const email = uniqueEmail("shared");
  await signUp(page, email);
  await finishWelcome(page, SHARED_NAME);
  mkdirSync(dirname(SESSION_FILE), { recursive: true });
  await page.context().storageState({ path: SESSION_FILE });
});
