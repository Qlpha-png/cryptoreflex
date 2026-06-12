// scripts/bench-scrub.mjs — VERIFICATION du scrub de la ligne de vie.
// Survole la bande a 3 positions, verifie reticule + chip (texte) et
// capture. Usage : serveur local port 3100 actif.
import { chromium } from "playwright-core";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUT = "C:\\Users\\kevin\\AppData\\Local\\Temp\\rider_frames2";
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
await page.goto("http://localhost:3100/", { waitUntil: "networkidle" });
try {
  await page.getByRole("button", { name: /tout refuser/i }).click({ timeout: 4000 });
} catch {}
await page.waitForTimeout(1500);

const band = await page.locator(".hero-pulse-band").boundingBox();
if (!band) {
  console.log("BANDE INTROUVABLE");
  process.exit(1);
}
for (const frac of [0.2, 0.55, 0.85]) {
  await page.mouse.move(band.x + band.width * frac, band.y + band.height * 0.5);
  await page.waitForTimeout(350);
  const state = await page.evaluate(() => {
    const w = document.querySelector(".hero-scrub");
    const chip = document.querySelector(".hero-scrub-chip");
    return {
      on: w ? w.classList.contains("hero-scrub-on") : null,
      chip: chip ? chip.textContent : null,
    };
  });
  console.log(`scrub @${(frac * 100).toFixed(0)}% : on=${state.on} chip="${state.chip}"`);
  await page.screenshot({
    path: `${OUT}\\s${(frac * 100).toFixed(0)}.png`,
    clip: { x: 0, y: Math.max(0, band.y - 60), width: 1500, height: band.height + 80 },
  });
}
// Sortie de la bande -> le reticule doit disparaitre
await page.mouse.move(band.x + 400, band.y - 200);
await page.waitForTimeout(300);
const off = await page.evaluate(
  () => document.querySelector(".hero-scrub")?.classList.contains("hero-scrub-on") ?? null,
);
console.log(`hors bande : on=${off} (attendu false)`);
await browser.close();
