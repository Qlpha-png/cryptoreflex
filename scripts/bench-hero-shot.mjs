import { chromium } from "playwright-core";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUT = "C:\\Users\\kevin\\AppData\\Local\\Temp\\rider_frames2";
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
for (const [name, vp] of [["hero_desk", { width: 1500, height: 900 }], ["hero_mob", { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto("http://localhost:3100/", { waitUntil: "networkidle" });
  try { await page.getByRole("button", { name: /tout refuser/i }).click({ timeout: 4000 }); } catch {}
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}\\${name}.png`, clip: { x: 0, y: 0, width: vp.width, height: vp.height } });
  console.log(name, "ok");
  await page.close();
}
await browser.close();
