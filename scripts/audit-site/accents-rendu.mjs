#!/usr/bin/env node
/**
 * scripts/audit-site/accents-rendu.mjs — mots français sans accent dans le TEXTE VISIBLE des pages rendues (HTML serveur,
 * scripts et styles retirés). Couvre aussi les articles, actus et fiches venant de la base, que le scan du code ne voit pas.
 * Usage : node scripts/audit-site/accents-rendu.mjs --base=http://localhost:3100 --from=audit-crawl.json [--out=f.json]
 * (--from : sortie de crawl.mjs, pour la liste des pages en 200)
 */
import { readFileSync, writeFileSync } from "node:fs";

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split("=").slice(1).join("=");
const BASE = arg("base", "http://localhost:3100").replace(/\/$/, "");
const FROM = arg("from", "audit-crawl.json");
const OUT = arg("out", "audit-accents.json");
const CONC = Number(arg("conc", "8"));

const WORDS = [
  "analysees", "editoriales?", "categories?", "donnees?", "verifiee?s?", "verifier", "verification", "detaillee?", "methode",
  "methodologie", "strategies?", "securite", "securisee?", "telecharger", "telechargement", "reponses?", "deja", "apres", "tres",
  "etre", "fevrier", "decembre", "regles?", "periode", "premiere", "derniere", "deuxieme", "interets?", "frequence", "evenements?",
  "depots?", "elevee", "reelles?", "creer", "generer", "fiscalite", "legalement", "francaises?", "economies?", "etapes?", "equipes?",
  "acceder", "proteger", "eviter", "repondre", "agreees?", "televerser", "annees?", "quantite", "impot", "debuter", "debutants?",
  "revoquer", "victime d'un incident de securite", "ete victime", "piratee", "conformite", "agrement", "a nuancer", "en tete",
  "ca change", "systeme", "probleme", "parametres", "specifique", "precedent", "precedente", "rapidite", "liquidite", "volatilite",
];
const RE = new RegExp(`(?<![\\p{L}\\-/_.@])(${WORDS.join("|")})(?![\\p{L}\\-_])`, "giu");

const crawl = JSON.parse(readFileSync(FROM, "utf8"));
const pages = crawl.pages.filter((p) => p.s === 200 && p.title !== undefined).map((p) => p.path);
const decode = (s) => s.replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&nbsp;|&#160;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const hits = new Map(); // mot+extrait → pages
let done = 0;
async function check(path) {
  try {
    const r = await fetch(BASE + path, { signal: AbortSignal.timeout(40000) });
    const html = await r.text();
    const body = html.slice(html.indexOf("<body")).replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ");
    const text = decode(body.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
    // attributs lus par les lecteurs d'écran
    const attrs = [...body.matchAll(/\b(?:aria-label|title|alt|placeholder)="([^"]{3,})"/g)].map((m) => decode(m[1])).join(" | ");
    for (const src of [text, attrs]) {
      for (const m of src.matchAll(RE)) {
        const ex = src.slice(Math.max(0, m.index - 50), m.index + m[0].length + 50).trim();
        const key = `${m[1].toLowerCase()} — ${ex}`;
        if (!hits.has(key)) hits.set(key, []);
        if (hits.get(key).length < 4) hits.get(key).push(path);
      }
    }
  } catch {}
  if (++done % 500 === 0) console.log(`  … ${done}/${pages.length}`);
}
let i = 0;
await Promise.all(Array.from({ length: CONC }, async () => { while (i < pages.length) await check(pages[i++]); }));

// regroupe par extrait (un même gabarit produit le même extrait sur des centaines de pages)
const rows = [...hits.entries()].map(([k, v]) => ({ k, pages: v })).sort((a, b) => b.pages.length - a.pages.length);
writeFileSync(OUT, JSON.stringify({ base: BASE, pages: pages.length, hits: rows }, null, 1));
console.log(`Pages : ${pages.length} ; extraits sans accent : ${rows.length}`);
for (const r of rows.slice(0, 400)) console.log(`  ${r.k.slice(0, 160)}  ← ${r.pages.slice(0, 2).join(" ")}`);
