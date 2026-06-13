import { chromium } from "playwright-core";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUT = "C:\\Users\\kevin\\AppData\\Local\\Temp\\rider_frames2";
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
await page.goto("http://localhost:3100/", { waitUntil: "networkidle" });
try { await page.getByRole("button", { name: /tout refuser/i }).click({ timeout: 4000 }); } catch {}
await page.waitForTimeout(1500);

const band = await page.locator(".hero-pulse-band").boundingBox();
console.log("band:", JSON.stringify(band));

// 1) L'overlay scrub bloque-t-il les clics (CTA, liens) ? Quel élément est
//    au point central du hero ?
for (const f of [0.3, 0.5, 0.7]) {
  const px = band.x + band.width * f;
  const py = band.y + band.height * 0.4;
  const el = await page.evaluate(([x, y]) => {
    const e = document.elementFromPoint(x, y);
    return e ? `${e.tagName}.${(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) || ""}`.slice(0, 60) : "null";
  }, [px, py]);
  console.log(`elementFromPoint @${(f*100)|0}%,40%h : ${el}`);
}

// 2) Le point du scrub tombe-t-il SUR la ligne ? On survole, on lit la
//    position du dot, et on compare au pixel lumineux de la courbe.
for (const f of [0.25, 0.5, 0.75]) {
  const px = band.x + band.width * f;
  await page.mouse.move(px, band.y + band.height * 0.5);
  await page.waitForTimeout(250);
  const info = await page.evaluate(() => {
    const dot = document.querySelector(".hero-scrub-dot");
    const band = document.querySelector(".hero-pulse-band");
    if (!dot || !band) return null;
    const dr = dot.getBoundingClientRect();
    const br = band.getBoundingClientRect();
    return { dotCx: dr.left + dr.width / 2, dotCy: dr.top + dr.height / 2, bx: br.left, by: br.top, bw: br.width, bh: br.height, op: getComputedStyle(dot).opacity };
  });
  if (!info) { console.log("pas de dot"); continue; }
  // capture autour du dot
  await page.screenshot({ path: `${OUT}\\scrub_${(f*100)|0}.png`, clip: { x: Math.max(0, info.dotCx - 90), y: Math.max(0, info.dotCy - 70), width: 180, height: 140 } });
  console.log(`scrub @${(f*100)|0}% : dot=(${info.dotCx.toFixed(0)},${info.dotCy.toFixed(0)}) op=${info.op}`);
}
await browser.close();
