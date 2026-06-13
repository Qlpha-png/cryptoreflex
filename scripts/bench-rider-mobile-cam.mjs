// Caméra embarquée MOBILE : 10 frames centrées sur la moto (390px viewport)
// pour vérifier roues-sur-trait au roulage et absence de plongeon.
import { chromium } from "playwright-core";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUT = "C:\\Users\\kevin\\AppData\\Local\\Temp\\rider_frames2";
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:3100/", { waitUntil: "networkidle" });
try {
  await page.getByRole("button", { name: /tout refuser/i }).click({ timeout: 4000 });
} catch {}
await page.waitForTimeout(1800);
for (let i = 0; i < 10; i++) {
  const info = await page.evaluate(() => {
    const r = document.querySelector(".hero-rider-main");
    const band = document.querySelector(".hero-pulse-band");
    if (!r || !band) return null;
    const br = band.getBoundingClientRect();
    const m = /translate3d\(([\d.-]+)px, ([\d.-]+)px/.exec(r.style.transform || "");
    return {
      op: getComputedStyle(r).opacity,
      bx: br.left, by: br.top,
      x: m ? parseFloat(m[1]) : null,
      y: m ? parseFloat(m[2]) : null,
    };
  });
  if (info && info.op !== "0" && info.x != null) {
    const cx = info.bx + info.x;
    const cy = info.by + info.y;
    await page.screenshot({
      path: `${OUT}\\c${String(i).padStart(2, "0")}.png`,
      clip: {
        x: Math.max(0, cx - 90),
        y: Math.max(0, cy - 90),
        width: 180,
        height: 150,
      },
    });
  }
  await page.waitForTimeout(700);
}
console.log("cam mobile : 10 frames");
await browser.close();
