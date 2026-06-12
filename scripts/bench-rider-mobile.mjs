import { chromium } from "playwright-core";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUT = "C:\\Users\\kevin\\AppData\\Local\\Temp\\rider_frames2";
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:3100/", { waitUntil: "networkidle" });
try {
  await page.getByRole("button", { name: /tout refuser/i }).click({ timeout: 4000 });
} catch {}
await page.waitForTimeout(2000);
const d = await page.evaluate(() => {
  const r = window.__crxRider;
  return r ? { src: r.src, pts: r.terrainPts, jumps: r.jumps.length } : null;
});
console.log("mobile __crxRider:", JSON.stringify(d));
const band = await page.locator(".hero-pulse-band").boundingBox();
for (let i = 0; i < 4; i++) {
  await page.screenshot({
    path: `${OUT}\\m0${i}.png`,
    clip: {
      x: 0,
      y: Math.max(0, band.y - 80),
      width: 390,
      height: Math.min(band.height + 100, 844),
    },
  });
  await page.waitForTimeout(1400);
}
console.log("4 frames mobiles");
await browser.close();
