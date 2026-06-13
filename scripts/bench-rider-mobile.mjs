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
  return r ? { src: r.src, pts: r.terrainPts, jumps: r.jumps } : null;
});
if (d) {
  console.log(`mobile terrain: source=${d.src} (${d.pts} pts), bande=${(await page.locator(".hero-pulse-band").boundingBox()).width.toFixed(0)}px`);
  console.log(`plan de sauts mobile: ${d.jumps.length}`);
  for (const j of d.jumps) {
    console.log(
      `  ${j.kind.padEnd(5)} takeoff=${j.takeoff.toFixed(0)} land=${j.land.toFixed(0)} portee=${(j.land - j.takeoff).toFixed(0)} apex=${j.apex.toFixed(0)} flip=${j.flip} dur=${j.dur.toFixed(0)}ms`,
    );
  }
} else {
  console.log("PAS de __crxRider mobile");
}
const band = await page.locator(".hero-pulse-band").boundingBox();
for (let i = 0; i < 8; i++) {
  await page.screenshot({
    path: `${OUT}\\m0${i}.png`,
    clip: {
      x: 0,
      y: Math.max(0, band.y - 80),
      width: 390,
      height: Math.min(band.height + 100, 844),
    },
  });
  await page.waitForTimeout(900);
}
console.log("8 frames mobiles");
await browser.close();
