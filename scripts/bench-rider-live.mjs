// scripts/bench-rider-live.mjs — TEST DU CAPTEUR LIVE du rider.
// Mute l'attribut d des paths du pouls (comme un refresh de donnees) et
// verifie que le MutationObserver reconstruit terrain + plan de sauts.
// Usage : serveur local port 3100 actif.
import { chromium } from "playwright-core";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
await page.goto("http://localhost:3100/", { waitUntil: "networkidle" });
try {
  await page.getByRole("button", { name: /tout refuser/i }).click({ timeout: 4000 });
} catch {}
await page.waitForTimeout(1500);

const before = await page.evaluate(() => {
  const d = window.__crxRider;
  return d ? { src: d.src, pts: d.terrainPts, jumps: d.jumps.map((j) => Math.round(j.takeoff)) } : null;
});
console.log("AVANT :", JSON.stringify(before));

// Mutation de la courbe : on aplatit la moitie droite (comme un nouveau
// tick qui change le profil). Tous les paths du pouls partagent le d.
await page.evaluate(() => {
  const paths = document.querySelectorAll("path.hero-pulse-path");
  for (const p of paths) {
    const d = p.getAttribute("d") || "";
    // decale tous les Y de la 2e moitie vers 180 (profil different)
    const mutated = d.replace(/(\d{3,4}(?:\.\d+)?)[, ](\d{1,3}(?:\.\d+)?)/g, (m, x, y) =>
      parseFloat(x) > 600 ? `${x} ${(parseFloat(y) * 0.4 + 108).toFixed(1)}` : m,
    );
    p.setAttribute("d", mutated);
  }
});
await page.waitForTimeout(400);

const after = await page.evaluate(() => {
  const d = window.__crxRider;
  return d ? { src: d.src, pts: d.terrainPts, jumps: d.jumps.map((j) => Math.round(j.takeoff)) } : null;
});
console.log("APRES :", JSON.stringify(after));

const changed =
  before && after && JSON.stringify(before.jumps) !== JSON.stringify(after.jumps);
console.log(changed ? "CAPTEUR LIVE OK : plan reconstruit apres mutation du path" : "ECHEC : plan inchange apres mutation");
await browser.close();
process.exit(changed ? 0 : 1);
