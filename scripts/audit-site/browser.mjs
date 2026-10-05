#!/usr/bin/env node
/**
 * scripts/audit-site/browser.mjs — passage en vrai navigateur (Playwright, Chromium).
 *
 * Pages : toutes les pages fixes (app/(…)/page.tsx sans segment dynamique, hors /admin et /api) + jusqu'à 4 exemples
 * par modèle dynamique, tirés des plans du site (premier, dernier, deux au hasard) — ou une liste passée en --pages.
 * Deux tailles : téléphone 390×844 et ordinateur 1280×900.
 * Relève : erreurs JavaScript et d'hydratation, requêtes du site en erreur (≥ 400), débordement horizontal réel et
 * éléments fautifs, images cassées (après défilement complet), textes cassés APRÈS affichage (NaN, undefined…),
 * boutons/liens sans nom accessible. Capture d'écran (haut de page) de chaque passage.
 *
 * Usage : node scripts/audit-site/browser.mjs [--base=http://localhost:3100] [--out=dossier] [--conc=3] [--pages=a,b]
 */
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("playwright");

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split("=").slice(1).join("=");
const BASE = arg("base", "http://localhost:3100").replace(/\/$/, "");
const OUT = arg("out", "audit-browser");
const CONC = Number(arg("conc", "3"));
const ONLY = arg("pages", "");
const ROOT = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
mkdirSync(join(OUT, "captures"), { recursive: true });

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "pc", width: 1280, height: 900, isMobile: false, hasTouch: false },
];
// Bruit connu, sans rapport avec le site (outils tiers bloqués en local, extensions…)
const IGNORE = [/_vercel\/(insights|speed-insights)/, /googletagmanager|google-analytics|clarity\.ms|doubleclick/, /favicon\.ico/, /api\/analytics\/vitals/];
// images de partage (@vercel/og) : échec local sous Windows (police), 200 en production (vérifié le 05/10/2026)
if (/localhost|127\.0\.0\.1/.test(BASE)) IGNORE.push(/\/(opengraph|twitter)-image/);
// en local seulement : les aperçus /embed appellent l'API publique de production (autorisée par la CSP en production,
// où « 'self' » est www.cryptoreflex.fr) ; /cartes répond 404 sans l'interrupteur du jeu (absent en local, 200 en production)
if (/localhost|127\.0\.0\.1/.test(BASE)) IGNORE.push(/www\.cryptoreflex\.fr\/api\/public\//, /^404 \/cartes$|\/cartes$/);

function staticRoutes() {
  const app = join(ROOT, "app");
  const routes = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name.startsWith("[") || name.startsWith("_") || name === "api" || name === "admin") continue;
        walk(p);
      } else if (name === "page.tsx") {
        const r = "/" + relative(app, dir).split("\\").join("/").replace(/\([^)]*\)\/?/g, "");
        routes.push(r === "/." || r === "/" ? "/" : r.replace(/\/$/, ""));
      }
    }
  })(app);
  return routes;
}

async function dynamicSamples() {
  const idx = await (await fetch(`${BASE}/sitemap-index.xml`)).text();
  const all = [];
  for (const m of idx.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const x = await (await fetch(m[1].replace(/^https?:\/\/[^/]+/, BASE))).text();
    all.push(...[...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((mm) => mm[1].replace(/^https?:\/\/[^/]+/, "").replace(/&amp;/g, "&")));
  }
  const statics = new Set(staticRoutes());
  const groups = new Map();
  for (const p of all) {
    if (statics.has(p)) continue;
    const segs = p.split("/").filter(Boolean);
    const key = `/${segs[0]}/${"*/".repeat(Math.max(0, segs.length - 1)).replace(/\/$/, "")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const picks = [];
  let seed = 4242;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (const list of groups.values()) {
    const s = new Set([list[0], list[list.length - 1], list[Math.floor(rnd() * list.length)], list[Math.floor(rnd() * list.length)]]);
    picks.push(...s);
  }
  return { picks, groups: groups.size };
}

const TEXT_BAD = [/\bundefined\b/, /\bNaN\b/, /\[object Object\]/, /(?<!Axie )(?<![\w-])-?Infinity\b/, /Invalid Date/, /\{STATS|\$\{[A-Za-z_]/];

async function audit(browser, path, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, locale: "fr-FR" });
  const page = await ctx.newPage();
  const errors = [];
  const failed = [];
  page.on("console", (m) => {
    const t = m.text();
    // « Failed to load resource » : l'adresse est dans location(), pas dans le texte ; les réponses en erreur du site
    // sont déjà relevées par l'écoute des réponses → on garde seulement les ressources externes, avec leur adresse.
    const at = m.location()?.url ?? "";
    if (/^Failed to load resource/.test(t)) {
      if (!at || at.startsWith(BASE) || IGNORE.some((re) => re.test(at))) return;
      errors.push(`${t.slice(0, 120)} — ${at.slice(0, 160)}`);
      return;
    }
    if (/Refused to execute script/.test(t) && IGNORE.some((re) => re.test(t))) return;
    if ((m.type() === "error" || /hydrat|did not match/i.test(t)) && !IGNORE.some((re) => re.test(t))) errors.push(t.slice(0, 300));
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e.message).slice(0, 300)}`));
  page.on("response", (r) => {
    const u = r.url();
    if (u.startsWith(BASE) && r.status() >= 400 && !IGNORE.some((re) => re.test(u))) failed.push(`${r.status()} ${u.replace(BASE, "")}`);
  });
  page.on("requestfailed", (r) => {
    const u = r.url();
    if (u.startsWith(BASE) && !IGNORE.some((re) => re.test(u)) && !/net::ERR_ABORTED/.test(r.failure()?.errorText ?? "")) failed.push(`échec ${u.replace(BASE, "")} (${r.failure()?.errorText})`);
  });
  const res = { path, vp: vp.name };
  try {
    const resp = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 45000 }).catch(() => page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45000 }));
    res.status = resp?.status();
    await page.waitForTimeout(800);
    // défilement complet pour déclencher les images et composants différés
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += Math.round(innerHeight * 0.8)) {
        scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(600);
    // la micro-police de l'espace des milliers se charge à la demande (unicode-range) : on attend son chargement
    await page.evaluate(() => document.fonts.load('16px "Cryptoreflex NNBSP"', "\u202f").catch(() => null));
    Object.assign(
      res,
      await page.evaluate((badSrc) => {
        const bad = badSrc.map((s) => new RegExp(s));
        const vw = innerWidth;
        const overflow = document.documentElement.scrollWidth - vw;
        const offenders = [];
        if (overflow > 1) {
          for (const el of document.querySelectorAll("body *")) {
            const r = el.getBoundingClientRect();
            if (r.right <= vw + 1 || r.width === 0) continue;
            let a = el.parentElement;
            let clipped = false;
            while (a && a !== document.body) {
              const ox = getComputedStyle(a).overflowX;
              if (ox !== "visible") { clipped = true; break; }
              a = a.parentElement;
            }
            if (clipped || getComputedStyle(el).position === "fixed") continue;
            offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 70)} (droite ${Math.round(r.right)} px)`);
            if (offenders.length >= 5) break;
          }
        }
        const brokenImgs = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith("data:")).map((i) => i.src.slice(0, 150));
        const text = document.body.innerText;
        const badText = bad.filter((re) => re.test(text)).map((re) => {
          const m = text.match(re);
          const i = text.indexOf(m[0]);
          return text.slice(Math.max(0, i - 60), i + 40).replace(/\s+/g, " ");
        });
        const unnamed = [...document.querySelectorAll("button, a[href], [role=button]")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            if (getComputedStyle(el).visibility === "hidden") return false;
            // innerText est vide dans un bloc non rendu (content-visibility, sommaire replié) : textContent en secours
            const name = (el.getAttribute("aria-label") || el.getAttribute("title") || el.innerText || el.textContent || el.querySelector("img[alt]")?.getAttribute("alt") || "").trim();
            return !name && !el.getAttribute("aria-labelledby");
          })
          .slice(0, 5)
          .map((el) => el.outerHTML.slice(0, 140));
        // espace des milliers (U+202F, format fr-FR) : doit avoir une vraie largeur (micro-police cr-nnbsp.woff2 ;
        // sans elle, Inter la dessine avec ~2 px et on lit « 20000 € »). Mesurée dans la police du texte courant.
        const sp = document.createElement("span");
        sp.textContent = "\u202f";
        sp.style.cssText = "position:absolute;display:inline-block;white-space:pre;font-size:16px";
        sp.style.fontFamily = getComputedStyle(document.body).fontFamily;
        document.body.appendChild(sp);
        const nnbsp = Math.round(sp.getBoundingClientRect().width * 100) / 100;
        sp.remove();
        return { overflow, offenders, brokenImgs, badText, unnamed, nnbsp, h1: document.querySelector("h1")?.innerText.slice(0, 80) ?? null };
      }, TEXT_BAD.map((r) => r.source)),
    );
    const file = `${path === "/" ? "accueil" : path.replace(/^\//, "").replace(/[^\w-]+/g, "_")}-${vp.name}.png`;
    await page.screenshot({ path: join(OUT, "captures", file) });
    res.capture = file;
  } catch (e) {
    res.err = String(e.message).slice(0, 200);
  }
  // page redirigée côté navigateur (ex. /mon-compte → /connexion) : les préchargements en cours sont annulés et Next écrit
  // « Failed to fetch RSC payload … Falling back to browser navigation » — sans effet pour le visiteur, on ne le compte pas.
  const redirected = !page.isClosed() && new URL(page.url()).pathname !== new URL(BASE + path).pathname;
  res.errors = [...new Set(errors)].filter((t) => !(redirected && /Failed to fetch RSC payload/.test(t)));
  res.failed = [...new Set(failed)];
  await ctx.close();
  return res;
}

const browser = await chromium.launch();
let list;
if (ONLY) list = ONLY.split(",");
else {
  const { picks, groups } = await dynamicSamples();
  list = [...staticRoutes(), ...picks];
  console.log(`${list.length - picks.length} pages fixes + ${picks.length} exemples de ${groups} modèles dynamiques`);
}
const jobs = list.flatMap((p) => VIEWPORTS.map((vp) => [p, vp]));
const results = [];
let i = 0;
await Promise.all(
  Array.from({ length: CONC }, async () => {
    while (i < jobs.length) {
      const [p, vp] = jobs[i++];
      results.push(await audit(browser, p, vp));
      if (results.length % 50 === 0) console.log(`  … ${results.length}/${jobs.length}`);
    }
  }),
);
await browser.close();

const problems = [];
for (const r of results) {
  const at = `${r.path} [${r.vp}]`;
  if (r.err) problems.push({ type: "chargement", at, detail: r.err });
  if (r.status && r.status >= 400 && !IGNORE.some((re) => re.test(r.path))) problems.push({ type: `statut ${r.status}`, at, detail: "" });
  for (const e of r.errors ?? []) problems.push({ type: /hydrat|did not match/i.test(e) ? "hydratation" : "erreur JS", at, detail: e });
  for (const f of r.failed ?? []) problems.push({ type: "requête en erreur", at, detail: f });
  if (r.overflow > 1) problems.push({ type: "débordement horizontal", at, detail: `${r.overflow} px : ${(r.offenders ?? []).join(" | ")}` });
  for (const b of r.brokenImgs ?? []) if (!IGNORE.some((re) => re.test(b))) problems.push({ type: "image cassée", at, detail: b });
  for (const t of r.badText ?? []) problems.push({ type: "texte cassé (affiché)", at, detail: t });
  for (const u of r.unnamed ?? []) problems.push({ type: "élément sans nom", at, detail: u });
  if (typeof r.nnbsp === "number" && r.nnbsp < 3) problems.push({ type: "espace des milliers invisible", at, detail: `U+202F = ${r.nnbsp} px (police cr-nnbsp non chargée ?)` });
  if (r.h1 === null && !r.err) problems.push({ type: "pas de <h1> affiché", at, detail: "" });
}
const byType = {};
for (const p of problems) byType[p.type] = (byType[p.type] ?? 0) + 1;
writeFileSync(join(OUT, "resultats.json"), JSON.stringify({ base: BASE, date: new Date().toISOString(), results, problems, byType }, null, 1));
console.log(`\nPassages : ${results.length} ; problèmes : ${problems.length}`);
for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${t}`);
console.log(`Détail : ${join(OUT, "resultats.json")} ; captures : ${join(OUT, "captures")}`);
