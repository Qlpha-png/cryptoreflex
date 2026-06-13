// Détecteur de SUSPENSION : échantillonne le scale du châssis à ~40 ms et
// trace la courbe de compression à chaque atterrissage (doit monter au
// toucher puis revenir au repos avec un léger rebond, sans dépasser ~0.13).
import { chromium } from "playwright-core";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const VIEW = process.argv[2] === "mobile" ? { width: 390, height: 844 } : { width: 1500, height: 900 };
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: VIEW });
await page.goto("http://localhost:3100/", { waitUntil: "networkidle" });
try {
  await page.getByRole("button", { name: /tout refuser/i }).click({ timeout: 4000 });
} catch {}
await page.waitForTimeout(1500);

const samples = [];
for (let i = 0; i < 220; i++) {
  const s = await page.evaluate(() => {
    const f = document.querySelector(".hero-rider-main .hero-rider-flip");
    if (!f) return null;
    const tr = f.style.transform || "";
    const sc = /scale\(([\d.]+),\s*([\d.]+)\)/.exec(tr);
    return { t: performance.now(), sx: sc ? +sc[1] : 1, sy: sc ? +sc[2] : 1, air: tr.includes("translate(0px,") };
  });
  if (s) samples.push(s);
  await page.waitForTimeout(40);
}
await browser.close();

// Min/max globaux du scale : compression (sy<1) ET détente/pop (sy>1).
let minSy = 1, maxSy = 1, maxSx = 1, minSx = 1, compFrames = 0, extFrames = 0, glitch = 0;
for (const a of samples) {
  minSy = Math.min(minSy, a.sy);
  maxSy = Math.max(maxSy, a.sy);
  maxSx = Math.max(maxSx, a.sx);
  minSx = Math.min(minSx, a.sx);
  if (a.sy < 0.99) compFrames++;
  if (a.sy > 1.01) extFrames++;
  if (a.sy < 0.78 || a.sy > 1.18) glitch++;
}
console.log(`viewport ${VIEW.width}x${VIEW.height}`);
console.log(`COMPRESSION (préload+atterrissage) : scaleY min ${minSy.toFixed(3)} (~0.87 attendu), scaleX max ${maxSx.toFixed(3)} — ${compFrames} frames`);
console.log(`DÉTENTE (pop décollage) : scaleY max ${maxSy.toFixed(3)} (>1 attendu), scaleX min ${minSx.toFixed(3)} — ${extFrames} frames`);
console.log(glitch ? `ALERTE scale aberrant x${glitch}` : "aucun scale aberrant");
