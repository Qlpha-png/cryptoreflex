// Détecteur de JITTER vertical de la moto au roulage : échantillonne cy à
// ~30 ms, et pendant les phases AU SOL (pas de saut), compte les
// inversions de la vitesse verticale (signature d'un tremblement) et
// l'amplitude des micro-secousses. Usage : serveur local 3100 actif.
import { chromium } from "playwright-core";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const VIEW = process.argv[2] === "mobile" ? { width: 390, height: 844 } : { width: 1500, height: 900 };
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: VIEW });
await page.goto("http://localhost:3100/", { waitUntil: "networkidle" });
try { await page.getByRole("button", { name: /tout refuser/i }).click({ timeout: 4000 }); } catch {}
await page.waitForTimeout(1500);

const s = [];
for (let i = 0; i < 320; i++) {
  const d = await page.evaluate(() => {
    const r = document.querySelector(".hero-rider-main");
    const f = document.querySelector(".hero-rider-main .hero-rider-flip");
    if (!r || !f) return null;
    const tr = r.style.transform || "";
    const m = /translate3d\(([\d.-]+)px, ([\d.-]+)px/.exec(tr);
    const air = (f.style.transform || "").includes("translate(0px,");
    return { t: performance.now(), x: m ? +m[1] : null, y: m ? +m[2] : null, air, op: getComputedStyle(r).opacity };
  });
  if (d) s.push(d);
  await page.waitForTimeout(30);
}
await browser.close();

// Analyse : sur les segments AU SOL continus (op=1, !air, x croissant),
// vitesse verticale vy = dcy/dx ; on compte les inversions de signe de
// l'accélération verticale (jitter) et l'amplitude des secousses.
let reversals = 0, samplesGround = 0, maxJerkPx = 0;
const jl = [];
for (let i = 2; i < s.length; i++) {
  const a = s[i - 2], b = s[i - 1], c = s[i];
  if ([a, b, c].some((p) => p.op === "0" || p.x == null || p.air)) continue;
  if (b.x <= a.x || c.x <= b.x) continue; // run wrap / immobile
  samplesGround++;
  // pente verticale par unité X (indépendant de la vitesse)
  const v1 = (b.y - a.y) / (b.x - a.x);
  const v2 = (c.y - b.y) / (c.x - b.x);
  // secousse = changement brusque de pente verticale sur peu de X
  const jerk = Math.abs(v2 - v1);
  if (v1 * v2 < 0 && jerk > 0.15) reversals++; // inversion franche = tremble
  // amplitude en px : variation de y non expliquee par une pente lisse
  const dyExpected = v1 * (c.x - b.x);
  const wobble = Math.abs((c.y - b.y) - dyExpected);
  if (wobble > maxJerkPx) maxJerkPx = wobble;
  jl.push(wobble);
}
jl.sort((a, b) => a - b);
const p95 = jl.length ? jl[Math.floor(jl.length * 0.95)] : 0;
console.log(`viewport ${VIEW.width}x${VIEW.height}`);
console.log(`echantillons au sol : ${samplesGround}`);
console.log(`inversions franches (tremblement) : ${reversals}`);
console.log(`wobble vertical p95 : ${p95.toFixed(2)} px, max : ${maxJerkPx.toFixed(2)} px`);
console.log(reversals > samplesGround * 0.12 || p95 > 2 ? "JITTER PERCEPTIBLE" : "ride lisse");
