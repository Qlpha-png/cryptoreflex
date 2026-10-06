#!/usr/bin/env node
/**
 * Banc de design (lot A0) — comparaison au pixel de deux jeux de captures (comparateur de @playwright/test, pixelmatch)
 * + comparaison SEO (titre, description, canonical, robots, h1, types JSON-LD, BreadcrumbList) et statuts HTTP.
 *
 *   node scripts/design/comparer.mjs --ref <dossier> --cur <dossier> --rapport <dossier HORS DÉPÔT> [--seuil 0] [--max-pixels 0]
 *
 * --seuil : tolérance de couleur de pixelmatch par pixel (0 = strict ; Playwright utilise 0,2 par défaut).
 * Sortie : rapport.json + rapport.html + images de différence ; code de sortie 1 s'il y a la moindre différence.
 */
import fs from "node:fs";
import path from "node:path";
import { args, sortieHorsDepot, comparateurPng, ecrireJson, lireJson } from "./lib/commun.mjs";

const a = args();
if (!a.ref || !a.cur || !a.rapport) { console.error("usage : --ref <dir> --cur <dir> --rapport <dir>"); process.exit(2); }
const OUT = sortieHorsDepot(a.rapport);
const SEUIL = a.seuil !== undefined ? Number(a.seuil) : 0;
const MAXPX = a["max-pixels"] !== undefined ? Number(a["max-pixels"]) : 0;
const ref = lireJson(path.join(a.ref, "captures.json"));
const cur = lireJson(path.join(a.cur, "captures.json"));
if (!ref || !cur) { console.error("captures.json introuvable dans --ref ou --cur"); process.exit(2); }
const cmp = comparateurPng();
const cle = (r) => `${r.id}@${r.largeur}`;
const mapRef = new Map(ref.resultats.filter((r) => !r.absente).map((r) => [cle(r), r]));
const mapCur = new Map(cur.resultats.filter((r) => !r.absente).map((r) => [cle(r), r]));
const SEO_CHAMPS = ["titre", "description", "canonical", "robots", "h1", "jsonLd", "breadcrumbList"];

const lignes = [];
for (const k of new Set([...mapRef.keys(), ...mapCur.keys()])) {
  const r = mapRef.get(k), c = mapCur.get(k);
  if (!r || !c) { lignes.push({ cle: k, etat: r ? "manquante-dans-cur" : "nouvelle-dans-cur" }); continue; }
  const l = { cle: k, url: c.url, etat: "identique", pixels: 0, statut: [r.statut, c.statut], seo: [] };
  if (r.statut !== c.statut) l.etat = "statut-different";
  if (r.sha256 !== c.sha256) {
    const res = cmp(fs.readFileSync(path.join(a.cur, c.fichier)), fs.readFileSync(path.join(a.ref, r.fichier)), { threshold: SEUIL, maxDiffPixels: MAXPX });
    if (res) {
      l.etat = "differente";
      l.message = res.errorMessage;
      const m = /(\d+) pixels/.exec(res.errorMessage || "");
      l.pixels = m ? Number(m[1]) : null;
      if (res.diff) { l.diff = `diff-${k.replace("@", "_")}.png`; fs.writeFileSync(path.join(OUT, l.diff), res.diff); }
    } else l.pixels = 0; // octets différents, pixels identiques (métadonnées PNG)
  }
  if (r.mesures && c.mesures) {
    for (const f of SEO_CHAMPS) {
      const x = JSON.stringify(r.mesures.seo[f]), y = JSON.stringify(c.mesures.seo[f]);
      if (x !== y) l.seo.push({ champ: f, ref: r.mesures.seo[f], cur: c.mesures.seo[f] });
    }
    if (l.seo.length && l.etat === "identique") l.etat = "seo-different";
    l.contraste = [r.mesures.contraste.echecs, c.mesures.contraste.echecs];
    l.debordement = [r.mesures.debordement, c.mesures.debordement];
    l.css = [r.mesures.cssOctets, c.mesures.cssOctets];
  }
  l.refPng = path.join(a.ref, r.fichier); l.curPng = path.join(a.cur, c.fichier);
  lignes.push(l);
}
const diff = lignes.filter((l) => l.etat !== "identique");
const rapport = { date: new Date().toISOString(), ref: path.resolve(a.ref), cur: path.resolve(a.cur), seuil: SEUIL, total: lignes.length, identiques: lignes.length - diff.length, differences: diff.length, lignes };
ecrireJson(path.join(OUT, "rapport.json"), rapport);

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const href = (p) => "file:///" + String(p).replace(/\\/g, "/");
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Banc design : comparaison</title>
<style>body{font:14px/1.45 system-ui,sans-serif;margin:24px;background:#fafafa;color:#111}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px 8px;vertical-align:top;text-align:left}
.ok{color:#166534}.ko{color:#b91c1c;font-weight:600}img{max-width:220px;max-height:320px;border:1px solid #ccc}code{font-size:12px}</style></head><body>
<h1>Comparaison au pixel : ${diff.length ? `<span class="ko">${diff.length} différence(s)</span>` : '<span class="ok">0 différence</span>'} sur ${lignes.length} captures</h1>
<p>Référence : <code>${esc(rapport.ref)}</code><br>Courant : <code>${esc(rapport.cur)}</code><br>Seuil pixelmatch : ${SEUIL} · zones vivantes masquées (aplat magenta).</p>
<table><tr><th>Capture</th><th>État</th><th>Pixels</th><th>SEO</th><th>Contraste (échecs réf → cur)</th><th>Référence</th><th>Courant</th><th>Différence</th></tr>
${lignes.map((l) => `<tr><td><b>${esc(l.cle)}</b><br><code>${esc(l.url)}</code></td><td class="${l.etat === "identique" ? "ok" : "ko"}">${esc(l.etat)}</td><td>${esc(l.pixels)}</td><td>${(l.seo || []).map((s) => `${esc(s.champ)} : <code>${esc(JSON.stringify(s.ref))}</code> → <code>${esc(JSON.stringify(s.cur))}</code>`).join("<br>")}</td><td>${esc((l.contraste || []).join(" → "))}</td><td>${l.refPng ? `<a href="${href(l.refPng)}"><img loading="lazy" src="${href(l.refPng)}"></a>` : ""}</td><td>${l.curPng ? `<a href="${href(l.curPng)}"><img loading="lazy" src="${href(l.curPng)}"></a>` : ""}</td><td>${l.diff ? `<a href="${l.diff}"><img loading="lazy" src="${l.diff}"></a>` : ""}</td></tr>`).join("\n")}
</table></body></html>`;
fs.writeFileSync(path.join(OUT, "rapport.html"), html);
for (const l of diff) console.log(`DIFF ${l.cle} ${l.etat} pixels=${l.pixels ?? "?"} ${l.seo && l.seo.length ? "seo=" + l.seo.map((s) => s.champ).join(",") : ""}`);
console.log(`\n${lignes.length} captures comparées, ${diff.length} différence(s). Rapport : ${path.join(OUT, "rapport.html")}`);
process.exit(diff.length ? 1 : 0);
