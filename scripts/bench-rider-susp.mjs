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

// Repère les épisodes de suspension (sy < 0.995) et leur min sy.
let episodes = 0, worstSy = 1, maxSx = 1, reboundSeen = 0, glitch = 0;
let inEp = false, epMinSy = 1, epMaxSy = 0;
for (let i = 1; i < samples.length; i++) {
  const a = samples[i];
  if (a.sy < 0.992 || a.sx > 1.008) {
    if (!inEp) { inEp = true; epMinSy = 1; epMaxSy = 0; episodes++; }
    epMinSy = Math.min(epMinSy, a.sy);
    epMaxSy = Math.max(epMaxSy, a.sy);
    worstSy = Math.min(worstSy, a.sy);
    maxSx = Math.max(maxSx, a.sx);
    if (a.sy > 1.001) reboundSeen++;        // étirement = rebond
    if (a.sy < 0.80) glitch++;              // compression aberrante
  } else if (inEp) {
    inEp = false;
  }
}
console.log(`viewport ${VIEW.width}x${VIEW.height}`);
console.log(`épisodes de suspension : ${episodes}`);
console.log(`compression max : scaleY ${worstSy.toFixed(3)} (attendu ~0.87), scaleX ${maxSx.toFixed(3)}`);
console.log(`frames de rebond (étirement) : ${reboundSeen}`);
console.log(glitch ? `ALERTE compression aberrante x${glitch}` : "aucune compression aberrante");
