// scripts/bench-rider.mjs — BANC DE VERIFICATION VISUELLE du rider.
// Usage : npm run build && npx next start -p 3100 & node scripts/bench-rider.mjs
// Filme la vraie animation (camera embarquee centree sur la moto, 14
// frames + telemetrie JSON) -> frames dans %TEMP%/rider_frames2.
// Cree le 2026-06-12 apres la lecon « la simulation valide les formules,
// pas le DOM » (bug transform-origin invisible en simulation pure).
// Banc V2 : camera embarquee — chaque frame est centree sur le rider,
// + telemetrie (position, transform) pour analyse numerique.
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "fs";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUT = "C:\\Users\\kevin\\AppData\\Local\\Temp\\rider_frames2";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
await page.goto("http://localhost:3100/", { waitUntil: "networkidle" });

// Fermer le cookie banner (Tout refuser)
try {
  await page.getByRole("button", { name: /tout refuser/i }).click({ timeout: 4000 });
} catch {}
// Scroller pour decoller la bande du bas du viewport : sinon les creux
// de la courbe sont COUPES par le bord ecran dans les captures.
await page.mouse.wheel(0, 260);
await page.waitForTimeout(2000);

const telemetry = [];
for (let i = 0; i < 14; i++) {
  const info = await page.evaluate(() => {
    const r = document.querySelector(".hero-rider");
    const f = document.querySelector(".hero-rider-flip");
    const band = document.querySelector(".hero-pulse-band");
    if (!r || !band) return null;
    const br = band.getBoundingClientRect();
    return {
      riderTransform: r.style.transform,
      flipTransform: f ? f.style.transform : "",
      opacity: getComputedStyle(r).opacity,
      bandTop: br.top,
      bandLeft: br.left,
    };
  });
  telemetry.push({ frame: i, ...info });

  if (info && info.opacity !== "0") {
    // Extraire x,y du translate3d
    const m = /translate3d\(([\d.]+)px, ([\d.]+)px/.exec(info.riderTransform || "");
    if (m) {
      const cx = info.bandLeft + parseFloat(m[1]);
      const cy = info.bandTop + parseFloat(m[2]);
      const clip = {
        x: Math.max(0, cx - 220),
        y: Math.max(0, cy - 200),
        width: 440,
        height: 320,
      };
      await page.screenshot({ path: `${OUT}\\f${String(i).padStart(2, "0")}.png`, clip });
    }
  }
  await page.waitForTimeout(800);
}
writeFileSync(`${OUT}\\telemetry.json`, JSON.stringify(telemetry, null, 1));
console.log("done", telemetry.filter((t) => t && t.opacity !== "0").length, "frames visibles");
await browser.close();
