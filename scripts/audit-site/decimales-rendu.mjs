#!/usr/bin/env node
/**
 * scripts/audit-site/decimales-rendu.mjs — nombres décimaux au format anglais dans le TEXTE VISIBLE (« 4.9/5 », « 12.5 % »,
 * « 0.25 € ») : en français, la virgule est le séparateur décimal. Relevé le 05/10/2026 sur /comparatif/securite.
 * Relève aussi les dates au format ISO (« vérifié le 2026-06-13 ») dans le texte visible : en français, « 13 juin 2026 ».
 * Usage : node scripts/audit-site/decimales-rendu.mjs --base=http://localhost:3100 --from=audit-crawl.json [--out=f.json]
 */
import { readFileSync, writeFileSync } from "node:fs";

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split("=").slice(1).join("=");
const BASE = arg("base", "http://localhost:3100").replace(/\/$/, "");
const FROM = arg("from", "audit-crawl.json");
const OUT = arg("out", "audit-decimales.json");
const CONC = Number(arg("conc", "8"));
// décimale à point suivie d'une unité française typique ; exclut versions (v1.2), adresses IP, dates
const RE = /(?<![\w.,/:-])(\d{1,3}(?:[   ]\d{3})*\.\d{1,4})(?=[   ]?(?:%|\/[  ]?5\b|\/[  ]?10\b|€|[  ]?(?:ans?|jours?|heures?|minutes?|mois|fois)\b|x\b|×))/g;

// date ISO affichée telle quelle (hors adresses, identifiants et noms de fichiers)
const RE_ISO = /(?<![\w/.-])(20\d\d-[01]\d-[0-3]\d)(?![\w/.-])/g;

const crawl = JSON.parse(readFileSync(FROM, "utf8"));
const pages = crawl.pages.filter((p) => p.s === 200 && p.title !== undefined).map((p) => p.path);
const decode = (s) => s.replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&nbsp;|&#160;/g, " ");
const hits = new Map();
let i = 0;
async function check(path) {
  try {
    const html = await (await fetch(BASE + path, { signal: AbortSignal.timeout(40000) })).text();
    const body = html.slice(html.indexOf("<body")).replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ");
    const text = decode(body.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
    for (const m of [...text.matchAll(RE), ...text.matchAll(RE_ISO)]) {
      const ex = text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 25).trim();
      const key = ex.replace(/\d/g, "9");
      if (!hits.has(key)) hits.set(key, { ex, pages: [] });
      if (hits.get(key).pages.length < 3) hits.get(key).pages.push(path);
    }
  } catch {}
}
await Promise.all(Array.from({ length: CONC }, async () => { while (i < pages.length) await check(pages[i++]); }));
const rows = [...hits.values()];
writeFileSync(OUT, JSON.stringify({ base: BASE, pages: pages.length, hits: rows }, null, 1));
const byRubrique = {};
for (const r of rows) {
  const k = r.pages[0].split("/").slice(0, 2).join("/");
  byRubrique[k] = (byRubrique[k] ?? 0) + 1;
}
console.log(`Pages : ${pages.length} ; formes distinctes de décimales à point ou de dates ISO : ${rows.length}`);
console.log(byRubrique);
for (const r of rows.slice(0, 120)) console.log(`  ${r.ex.slice(0, 110)}  ← ${r.pages[0]}`);
