import { test as teardown } from "@playwright/test";
import { existsSync, rmSync } from "node:fs";
import { SESSION_FILE } from "../playwright.config";
import { deleteAccount } from "./helpers";

teardown("delete the shared account", async ({ browser }) => {
  if (!existsSync(SESSION_FILE)) return;
  const context = await browser.newContext({ storageState: SESSION_FILE });
  await deleteAccount(await context.newPage());
  await context.close();
  rmSync(SESSION_FILE);
});
