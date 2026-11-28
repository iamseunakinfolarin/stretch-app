import { expect, test } from "@playwright/test";
import { createAccount, deleteAccount } from "./helpers";

test.use({ storageState: { cookies: [], origins: [] } });

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

test("write down instructions, tick them off, make one a ritual, and catch one while praying", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const shot = (name: string) => page.screenshot({ path: `docs/screenshots/${testInfo.project.name}-${name}.png`, fullPage: true });
  await createAccount(page, "instructions", "Seyi Bello");
  await page.goto("/prayers/new");
  await page.getByLabel("Title").fill("For Mum's recovery");
  await page.getByRole("button", { name: "Create prayer" }).click();
  await expect(page).toHaveURL(new RegExp(`/prayers/${UUID}$`));
  const prayerUrl = page.url();
  const section = page.getByRole("region", { name: "Instructions" });
  await expect(section.getByText("Nothing written down yet.")).toBeVisible();

  // Write one down.
  await page.getByRole("link", { name: "Write down an instruction" }).click();
  await page.getByRole("button", { name: "Save instruction" }).click();
  await expect(page.getByText("Write down what you were told to do.")).toBeVisible();
  await page.getByLabel("The instruction").fill("Call your brother today");
  await shot("instruction-form");
  await page.getByRole("button", { name: "Save instruction" }).click();
  await expect(page).toHaveURL(prayerUrl);
  await expect(section.getByText("Call your brother today")).toBeVisible();

  // Tick it done, and untick it.
  const tick = section.getByRole("checkbox", { name: "Done: Call your brother today" });
  await tick.click();
  await expect(tick).toHaveAttribute("aria-checked", "true");
  await expect(section.getByText(/^Done /)).toBeVisible();
  await tick.click();
  await expect(tick).toHaveAttribute("aria-checked", "false");

  // A ritual, written down as one.
  await page.getByRole("link", { name: "Write down an instruction" }).click();
  await page.getByText("Something to keep doing.").click();
  await page.getByLabel("The ritual").fill("Pray at 5am");
  await page.getByRole("button", { name: "Save ritual" }).click();
  await expect(page.getByText("Say how often, for example Daily or Every Wednesday.")).toBeVisible();
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  await page.getByRole("button", { name: "Save ritual" }).click();
  await expect(page).toHaveURL(prayerUrl);
  await expect(section.getByText("Pray at 5am")).toBeVisible();

  // Make the instruction a ritual: it stays on this prayer.
  await section.getByRole("link", { name: /Call your brother today/ }).click();
  await page.getByRole("button", { name: "Make this a ritual" }).click();
  await page.getByRole("button", { name: "Every Sunday" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(prayerUrl);
  await expect(section.getByRole("checkbox")).toHaveCount(0);
  await expect(section.getByText("Every Sunday")).toBeVisible();
  await shot("instructions-section");

  // While praying: the rituals show, and a new instruction is caught without stopping the clock.
  await page.getByRole("link", { name: "Start praying" }).click();
  await page.getByRole("button", { name: "Begin" }).click();
  const card = page.getByRole("region", { name: "Instructions" });
  await expect(card.getByText("Pray at 5am")).toBeVisible();
  await card.getByRole("button", { name: "Write down an instruction" }).click();
  const dialog = page.getByRole("dialog", { name: "Write down an instruction" });
  await dialog.getByLabel("The instruction").fill("Write to Pastor James");
  await shot("instruction-while-praying");
  await dialog.getByRole("button", { name: "Save instruction" }).click();
  await expect(dialog).toBeHidden();
  await expect(card.getByText("Write to Pastor James")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.getByRole("button", { name: "End prayer time" }).click();
  await page.getByRole("dialog", { name: "End this prayer time?" }).getByRole("button", { name: "End prayer time" }).click();

  // It is on the prayer's page, and can be deleted.
  await page.goto(prayerUrl);
  await expect(section.getByText("Write to Pastor James")).toBeVisible();
  await section.getByRole("link", { name: /Write to Pastor James/ }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog", { name: "Delete this instruction?" }).getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(prayerUrl);
  await expect(section.getByText("Write to Pastor James")).toHaveCount(0);

  await deleteAccount(page);
});
