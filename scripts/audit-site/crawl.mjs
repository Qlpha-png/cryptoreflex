#!/usr/bin/env node
/**
 * scripts/audit-site/crawl.mjs — exploration EXHAUSTIVE du site (HTML serveur, sans navigateur).
 *
 * Couvre : toutes les adresses des plans du site (y compris les 4 950 /vs), les pages fixes hors plan (app/(…)/page.tsx
 * sans segment dynamique, hors /admin et /api), puis chaque lien interne et chaque image trouvés dans ces pages.
 * Contrôle : statut et chaînes de redirection, <title>, description, canonique, robots, un seul <h1>, langue, données
 * structurées JSON-LD valides, textes cassés (NaN, undefined, [object Object], Infinity, « Invalid Date », gabarits
 * non remplis {STATS…} / ${…}, Lorem, TODO), prix à « 0,00 € », liens internes morts, images internes cassées.
 *
 * Usage : node scripts/audit-site/crawl.mjs [--base=http://localhost:3100] [--out=fichier.json] [--conc=8]
 * Lecture seule. Sortie : JSON (pages + problèmes) et résumé console.
 */
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split("=").slice(1).join("=");
const BASE = arg("base", "http://localhost:3100").replace(/\/$/, "");
const OUT = arg("out", "audit-crawl.json");
const CONC = Number(arg("conc", "8"));
const UA = "Mozilla/5.0 (audit Cryptoreflex; contact Kev)";
const ROOT = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

const TEXT_BAD = [
  [/\bundefined\b/, "undefined"],
  [/\bNaN\b/, "NaN"],
  [/\[object Object\]/, "[object Object]"],
  [/(?<!Axie )(?<![\w-])-?Infinity\b/, "Infinity"],
  [/Invalid Date/, "Invalid Date"],
  [/\{STATS|\$\{[A-Za-z_]/, "gabarit non rempli"],
  [/Lorem ipsum/i, "Lorem"],
  [/\bTODO\b|\bFIXME\b/, "TODO"],
  [/\bnull\s?€|€\s?null\b|:\s?null\b(?!\s*[,}\]])/, "null affiché"],
  [/(?<![\d.,])0,00\s?€(?!\s*\/)/, "prix 0,00 €"],
];

/* ------------------------------------------------------------- liste des adresses */

async function get(u, { manual = true } = {}) {
  let last;
  for (let a = 0; a < 3; a++) {
    try {
      return await fetch(u, {
        redirect: manual ? "manual" : "follow",
        headers: { "user-agent": UA, "accept-language": "fr-FR" },
        signal: AbortSignal.timeout(60000),
      });
    } catch (e) {
      last = e;
      await sleep(1500 * (a + 1));
    }
  }
  throw last;
}

async function sitemapUrls() {
  const out = [];
  const idx = await (await get(`${BASE}/sitemap-index.xml`, { manual: false })).text();
  const maps = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1].trim()));
  for (const m of maps) {
    const x = await (await get(m.replace(/^https?:\/\/[^/]+/, BASE), { manual: false })).text();
    out.push(...[...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((mm) => decode(mm[1].trim()).replace(/^https?:\/\/[^/]+/, "")));
  }
  return out;
}

function staticRoutes() {
  const app = join(ROOT, "app");
  const routes = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name.startsWith("[") || name.startsWith("(") === false && name.startsWith("_")) continue;
        if (name === "api" || name === "admin") continue;
        walk(p);
      } else if (name === "page.tsx") {
        const r = "/" + relative(app, dir).split("\\").join("/").replace(/\([^)]*\)\/?/g, "");
        routes.push(r === "/." || r === "/" ? "/" : r.replace(/\/$/, ""));
      }
    }
  })(app);
  return routes;
}

/* ------------------------------------------------------------- contrôle d'une page */

const pages = new Map();
const linkRefs = new Map(); // cible → [pages qui la citent]
const imgRefs = new Map();

function ref(map, target, from) {
  if (!map.has(target)) map.set(target, new Set());
  if (map.get(target).size < 5) map.get(target).add(from);
}

async function checkPage(path, origin) {
  const t0 = Date.now();
  let r;
  try {
    r = await get(BASE + path);
  } catch (e) {
    pages.set(path, { path, origin, err: String(e.cause?.code || e.message) });
    return;
  }
  const o = { path, origin, s: r.status, ms: Date.now() - t0, loc: r.headers.get("location") };
  if (r.status >= 300 && r.status < 400 && o.loc) {
    // une redirection ne doit pas en entraîner une autre, ni aboutir à une erreur
    const sameHost = !/^https?:\/\//.test(o.loc) || new URL(o.loc).host === new URL(BASE).host || /(^|\.)cryptoreflex\.fr$/.test(new URL(o.loc).host);
    if (!sameHost) {
      // lien sortant (partenaire) : contrôlé à part avec un vrai navigateur, certains réseaux refusent les robots
      o.redirTo = o.loc;
      o.redirStatus = 200;
      o.external = true;
    } else {
      const target = o.loc.replace(/^https?:\/\/[^/]+/, "");
      try {
        const r2 = await get(BASE + target);
        o.redirTo = target;
        o.redirStatus = r2.status;
      } catch (e) {
        o.redirStatus = "err";
      }
    }
  }
  if (r.status === 200 && (r.headers.get("content-type") || "").includes("text/html")) {
    const html = await r.text();
    const headEnd = html.indexOf("</head>");
    const head = html.slice(0, headEnd > 0 ? headEnd : 80000);
    o.title = decode((head.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || "").trim();
    o.desc = decode((head.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "");
    o.canon = ((head.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || "").replace(/^https?:\/\/[^/]+/, "") || null;
    o.robots = (head.match(/<meta name="robots" content="([^"]+)"/) || [])[1] || null;
    o.lang = (html.match(/<html[^>]*lang="([^"]+)"/) || [])[1] || null;
    o.h1 = (html.match(/<h1[\s>]/g) || []).length;
    const body = html
      .slice(html.indexOf("<body"))
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " ");
    const text = decode(body).replace(/\s+/g, " ");
    o.bad = [];
    for (const [re, label] of TEXT_BAD) {
      const m = text.match(re);
      if (m) {
        const i = text.indexOf(m[0]);
        o.bad.push(`${label} : « ${text.slice(Math.max(0, i - 70), i + 50).trim()} »`);
      }
    }
    o.jsonldBad = (html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) || []).filter((s) => {
      try {
        JSON.parse(s.replace(/^<script[^>]*>|<\/script>$/g, ""));
        return false;
      } catch {
        return true;
      }
    }).length;
    for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)) {
      const h = decode(m[1]);
      if (h.startsWith("/") && !h.startsWith("//")) ref(linkRefs, h.split("#")[0].split("?")[0] || "/", path);
    }
    for (const m of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) {
      const s = decode(m[1]);
      if (s.startsWith("/") && !s.startsWith("//")) ref(imgRefs, s, path);
    }
  }
  pages.set(path, o);
}

async function pool(items, fn) {
  let i = 0;
  let done = 0;
  const workers = Array.from({ length: CONC }, async () => {
    while (i < items.length) {
      const it = items[i++];
      await fn(it);
      if (++done % 500 === 0) console.log(`  … ${done}/${items.length}`);
    }
  });
  await Promise.all(workers);
}

/* ------------------------------------------------------------- exécution */

const fromSitemap = await sitemapUrls();
const statics = staticRoutes();
const todo = [...new Set([...fromSitemap, ...statics])];
console.log(`Base ${BASE} : ${fromSitemap.length} adresses des plans du site + ${statics.length} pages fixes → ${todo.length} uniques`);
const smSet = new Set(fromSitemap);
await pool(todo, (p) => checkPage(p, smSet.has(p) ? "plan" : "fixe"));

// liens internes trouvés hors liste : on les contrôle aussi
const extra = [...linkRefs.keys()].filter((p) => !pages.has(p) && !/\.(xml|txt|png|jpe?g|svg|webp|ico|pdf|csv|json)$/i.test(p));
console.log(`Liens internes hors liste : ${extra.length}`);
await pool(extra, (p) => checkPage(p, "lien"));

// images internes : statut
const imgStatus = new Map();
await pool([...imgRefs.keys()], async (src) => {
  try {
    const r = await get(BASE + src, { manual: false });
    imgStatus.set(src, r.status);
    await r.arrayBuffer();
  } catch (e) {
    imgStatus.set(src, "err");
  }
});

/* ------------------------------------------------------------- problèmes */

const problems = [];
const add = (type, path, detail) => problems.push({ type, path, detail });
const titles = new Map();
for (const o of pages.values()) {
  if (o.err) add("injoignable", o.path, o.err);
  else if (o.s >= 400) add(`statut ${o.s}`, o.path, `cité par : ${[...(linkRefs.get(o.path) ?? [])].join(", ") || o.origin}`);
  else if (o.s >= 300) {
    if (o.redirStatus !== 200) add("redirection cassée", o.path, `→ ${o.redirTo} (${o.redirStatus})`);
    if (o.origin === "plan") add("redirection dans le plan du site", o.path, `→ ${o.redirTo}`);
    if (o.origin === "lien" && !o.external) add("lien interne vers une redirection", o.path, `→ ${o.redirTo} ; cité par : ${[...(linkRefs.get(o.path) ?? [])].join(", ")}`);
  }
  if (o.s !== 200 || o.title === undefined) continue;
  if (!o.title) add("titre manquant", o.path, "");
  else {
    if (o.title.length > 70) add("titre trop long", o.path, `${o.title.length} car. : ${o.title}`);
    if (!o.canon || o.canon === o.path) {
      if (!titles.has(o.title)) titles.set(o.title, []);
      titles.get(o.title).push(o.path);
    }
  }
  const indexable = !/noindex/i.test(o.robots || "");
  if (indexable && !o.desc) add("description manquante", o.path, "");
  if (indexable && o.desc && o.desc.length > 170) add("description trop longue", o.path, `${o.desc.length} car.`);
  if (indexable && o.h1 !== 1) add("nombre de <h1>", o.path, String(o.h1));
  if (o.lang !== "fr" && o.lang !== "fr-FR") add("langue", o.path, String(o.lang));
  if (o.jsonldBad) add("JSON-LD invalide", o.path, String(o.jsonldBad));
  if (o.origin === "plan" && !indexable) add("noindex dans le plan du site", o.path, o.robots);
  if (o.origin === "lien" && !indexable && o.h1 === 0)
    add("lien interne vers une page introuvable (200 + noindex)", o.path, `cité par : ${[...(linkRefs.get(o.path) ?? [])].join(", ")}`);
  if (o.origin === "plan" && o.canon && o.canon !== o.path) add("canonique différente dans le plan du site", o.path, `→ ${o.canon}`);
  for (const b of o.bad) add("texte cassé", o.path, b);
}
for (const [t, ps] of titles) if (ps.length > 1 && ps.length <= 50) add("titre en double", ps[0], `${ps.length} pages : ${ps.slice(0, 4).join(", ")} — « ${t} »`);
const LOCAL = /localhost|127\.0\.0\.1/.test(BASE);
// images de partage (@vercel/og) : échec local sous Windows (police), 200 en production (vérifié le 05/10/2026)
for (const [src, s] of imgStatus) if (s !== 200 && !(LOCAL && /\/(opengraph|twitter)-image/.test(src))) add(`image ${s}`, src, `dans : ${[...imgRefs.get(src)].join(", ")}`);

const byType = {};
for (const p of problems) byType[p.type] = (byType[p.type] ?? 0) + 1;
writeFileSync(OUT, JSON.stringify({ base: BASE, date: new Date().toISOString(), pages: [...pages.values()], problems, byType }, null, 1));
console.log(`\nPages contrôlées : ${pages.size} ; images : ${imgStatus.size} ; problèmes : ${problems.length}`);
for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${t}`);
console.log(`Détail : ${OUT}`);
