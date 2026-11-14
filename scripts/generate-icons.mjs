// Renders the placeholder app icons: a calm solid square with a letter S.
// Replaced with real artwork in Phase 6. Run with: npm run gen:icons
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const DEEP = "#1f4d30";
const LAVENDER = "#fbfcfb";

// Maskable icons are cropped to a circle or rounded shape by Android,
// so the letter stays inside the central safe zone.
const icons = [
  { path: "public/icons/icon-192.png", size: 192, letter: 0.62 },
  { path: "public/icons/icon-512.png", size: 512, letter: 0.62 },
  { path: "public/icons/icon-maskable-512.png", size: 512, letter: 0.44 },
  { path: "src/app/apple-icon.png", size: 180, letter: 0.6 },
  { path: "src/app/icon.png", size: 96, letter: 0.62 },
];

const html = (size, letter) => `<!doctype html>
<html><body style="margin:0">
<div style="width:${size}px;height:${size}px;background:${DEEP};display:flex;align-items:center;justify-content:center">
  <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-weight:700;font-size:${Math.round(size * letter)}px;line-height:1;color:${LAVENDER};transform:translateY(-3%)">S</span>
</div>
</body></html>`;

mkdirSync("public/icons", { recursive: true });
const browser = await chromium.launch();
for (const icon of icons) {
  const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size }, deviceScaleFactor: 1 });
  await page.setContent(html(icon.size, icon.letter));
  await page.screenshot({ path: icon.path, omitBackground: false });
  await page.close();
  console.log(`wrote ${icon.path} (${icon.size}x${icon.size})`);
}
await browser.close();
