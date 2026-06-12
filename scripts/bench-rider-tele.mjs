// scripts/bench-rider-tele.mjs — BANC NUMÉRIQUE anti-saccade du rider.
// Échantillonne position + angle à ~80 ms pendant ~5 s et vérifie :
//  - continuité de la vitesse horizontale (pas d'à-coups)
//  - continuité de l'angle au roulage (amortisseur efficace)
//  - durée réelle de la rotation du flip (lisibilité)
// Usage : serveur local port 3100 actif, puis `node scripts/bench-rider-tele.mjs`.
import { chromium } from "playwright-core";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
await page.goto("http://localhost:3100/", { waitUntil: "networkidle" });
try {
  await page.getByRole("button", { name: /tout refuser/i }).click({ timeout: 4000 });
} catch {}
await page.waitForTimeout(1500);

// Plan de sauts + source du terrain (capteur DOM vs fallback props)
const plan = await page.evaluate(() => {
  const d = window.__crxRider;
  return d ? { src: d.src, terrainPts: d.terrainPts, jumps: d.jumps } : null;
});
if (plan) {
  console.log(`terrain: source=${plan.src} (${plan.terrainPts} pts)`);
  console.log(`plan de sauts: ${plan.jumps.length}`);
  for (const j of plan.jumps) {
    console.log(
      `  ${j.kind.padEnd(5)} takeoff=${j.takeoff.toFixed(0)} land=${j.land.toFixed(0)} portee=${(j.land - j.takeoff).toFixed(0)} apex=${j.apex.toFixed(0)} flip=${j.flip} dur=${j.dur.toFixed(0)}ms`,
    );
  }
} else {
  console.log("PAS de __crxRider — composant non monte ?");
}

const samples = [];
for (let i = 0; i < 60; i++) {
  const s = await page.evaluate(() => {
    const r = document.querySelector(".hero-rider");
    const f = document.querySelector(".hero-rider-flip");
    if (!r || !f) return null;
    const m = /translate3d\(([\d.-]+)px, ([\d.-]+)px/.exec(r.style.transform || "");
    const a = /rotate\(([-\d.]+)deg\)/.exec(f.style.transform || "");
    return {
      t: performance.now(),
      x: m ? parseFloat(m[1]) : null,
      y: m ? parseFloat(m[2]) : null,
      deg: a ? parseFloat(a[1]) : null,
      pivot: (f.style.transform || "").includes("translate("),
      op: getComputedStyle(r).opacity,
    };
  });
  if (s) samples.push(s);
  await page.waitForTimeout(80);
}
await browser.close();

// Analyse : vitesses et vitesses angulaires entre échantillons consécutifs.
let maxSpeed = 0, maxRollRate = 0, flipMs = 0, flipDeg = 0;
let prevFlip = false, flipT0 = 0, flipD0 = 0;
const issues = [];
for (let i = 1; i < samples.length; i++) {
  const a = samples[i - 1], b = samples[i];
  if (a.op === "0" || b.op === "0" || a.x == null || b.x == null) { prevFlip = false; continue; }
  const dt = b.t - a.t;
  if (dt <= 0 || b.x < a.x) { prevFlip = false; continue; } // wrap de run
  const v = ((b.x - a.x) / dt) * 1000;
  if (v > maxSpeed) {
    maxSpeed = v;
    console.log(`  [pic vitesse] ${v.toFixed(0)} px/s entre x=${a.x.toFixed(0)} et x=${b.x.toFixed(0)} (dt=${dt.toFixed(0)}ms, pivots ${a.pivot}->${b.pivot}, op ${a.op}->${b.op})`);
  }
  if (b.pivot && !prevFlip) { flipT0 = b.t; flipD0 = b.deg ?? 0; }
  if (!b.pivot && prevFlip && flipT0) {
    flipMs = Math.max(flipMs, a.t - flipT0);
    flipDeg = Math.max(flipDeg, Math.abs((a.deg ?? 0) - flipD0));
  }
  if (!b.pivot && !a.pivot && a.deg != null && b.deg != null) {
    // au roulage : vitesse angulaire (deg/s), wrap normalisé
    let dd = b.deg - a.deg;
    dd = ((dd % 360) + 540) % 360 - 180;
    const rate = Math.abs(dd / dt) * 1000;
    maxRollRate = Math.max(maxRollRate, rate);
    if (rate > 220) issues.push(`saccade angulaire ${rate.toFixed(0)} deg/s a t=${(b.t / 1000).toFixed(1)}s (x=${b.x.toFixed(0)})`);
  }
  prevFlip = b.pivot;
}
console.log(`echantillons valides : ${samples.filter((s) => s.op !== "0").length}/${samples.length}`);
console.log(`vitesse horizontale max : ${maxSpeed.toFixed(0)} px/s (croisiere ${95})`);
console.log(`vitesse angulaire max au roulage : ${maxRollRate.toFixed(0)} deg/s (seuil confort 220)`);
console.log(`flip observe : ${flipMs ? `${flipMs.toFixed(0)} ms, ${flipDeg.toFixed(0)} deg balayes` : "aucun flip complet dans la fenetre"}`);
if (issues.length) { console.log("PROBLEMES :"); issues.forEach((s) => console.log(" -", s)); }
else console.log("aucune saccade detectee au-dessus du seuil");
