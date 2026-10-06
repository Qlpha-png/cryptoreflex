#!/usr/bin/env node
/**
 * Banc de design (lot A0) — contrôle APRÈS DÉPLOIEMENT (plan §4.0-5, dérivé de lot0/diag-deploy.mjs, incident « Times New
 * Roman » du 06/10/2026 : cache de build Vercel → classes __variable_ du HTML absentes du CSS servi).
 *
 *   node scripts/design/post-deploy.mjs [--base https://www.cryptoreflex.fr] --sortie <dossier HORS DÉPÔT>
 *        [--pages /,/blog/bareme-progressif-vs-pfu-crypto-2026,/cryptos/bitcoin] [--polices "Inter 400,Inter 600"]
 *
 * (a) chaque classe __variable_ du HTML définie dans le CSS servi (HTML lu avec un paramètre anti-cache) ;
 * (b) faces de police chargées : la 1re famille calculée du body et du h1 a une face chargée ; --polices « Nom poids »
 *     exige une face chargée dont la famille contient Nom (next/font renomme « Inter » en « __Inter_xxxx » :
 *     document.fonts.check("16px Inter") répondrait VRAI sans rien vérifier) ;
 * (c) police calculée du body et du h1 ≠ police système (Times New Roman, Arial…) ;
 * (d) fichiers de police servis en 200 avec Cache-Control « immutable » ;
 * (e) une capture par page (à regarder) ; (f) au plus 1 BreadcrumbList par page.
 * 3 pages par défaut = 3 visites (+ CSS et polices) : compatible avec la limite de requêtes de Vercel.
 * Code de sortie 1 si un contrôle échoue (→ rollback immédiat, voir plan §4.0-5).
 */
import path from "node:path";
import { args, sortieHorsDepot, lancerNavigateur, contexteBanc, stabiliser, ecrireJson, pause } from "./lib/commun.mjs";
import { mesurerPage } from "./lib/mesures-page.mjs";

const a = args();
const BASE = String(a.base || "https://www.cryptoreflex.fr").replace(/\/$/, "");
if (!a.sortie) { console.error("usage : --sortie <dossier hors dépôt>"); process.exit(2); }
const OUT = sortieHorsDepot(a.sortie);
const PAGES = String(a.pages || "/,/blog/bareme-progressif-vs-pfu-crypto-2026,/cryptos/bitcoin").split(",");
const POLICES = a.polices ? String(a.polices).split(",").map((s) => { const [nom, poids] = s.trim().split(/\s+/); return { nom, poids: poids || "400" }; }) : [];
const PAUSE = a.pause !== undefined ? Number(a.pause) : /^https?:\/\/(localhost|127\.)/.test(BASE) ? 0 : 8000;

const echecs = [];
const avertissements = [];
const pagesRes = [];
const browser = await lancerNavigateur();
for (const [i, route] of PAGES.entries()) {
  if (i && PAUSE) await pause(PAUSE);
  const ctx = await contexteBanc(browser, { largeur: 1440 });
  const page = await ctx.newPage();
  const fontes = [];
  page.on("response", (r) => { if (r.request().resourceType() === "font") fontes.push({ url: r.url(), statut: r.status(), cache: r.headers()["cache-control"] || "" }); });
  const sep = route.includes("?") ? "&" : "?";
  const r = await page.goto(`${BASE}${route}${sep}v=${Date.now()}`, { waitUntil: "load", timeout: 90000 }).catch((e) => { echecs.push(`${route} : navigation ${String(e.message).slice(0, 100)}`); return null; });
  const statut = r ? r.status() : 0;
  await stabiliser(page, { defiler: false });
  const m = await mesurerPage(page);
  const facesCherchees = await page.evaluate((pol) => pol.map(({ nom, poids }) => ({ nom, poids, ok: [...document.fonts].some((f) => f.status === "loaded" && f.family.replace(/["']/g, "").toLowerCase().includes(nom.toLowerCase()) && (f.weight === poids || (/\d+ \d+/.test(f.weight) && +f.weight.split(" ")[0] <= +poids && +poids <= +f.weight.split(" ")[1]))) })), POLICES);
  const fichier = `post-deploy-${route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "accueil"}.png`;
  await page.screenshot({ path: path.join(OUT, fichier), fullPage: false, animations: "disabled", caret: "hide" });
  const p = { route, statut, fichier, classesHtml: m.polices.classesHtml, classesManquantes: m.polices.classesManquantes, familleCorps: m.polices.familleCorps, familleH1: m.polices.familleH1, corpsChargee: m.polices.corpsChargee, h1Chargee: m.polices.h1Chargee, corpsSysteme: m.polices.corpsSysteme, facesCherchees, fontes, breadcrumbList: m.seo.breadcrumbList };
  pagesRes.push(p);
  if (statut !== 200) echecs.push(`${route} : HTTP ${statut}`);
  if (m.polices.classesManquantes.length) echecs.push(`${route} : (a) classes __variable_ absentes du CSS : ${m.polices.classesManquantes.join(" ")}`);
  if (!m.polices.corpsChargee) echecs.push(`${route} : (b) aucune face chargée pour la police du body « ${m.polices.familleCorps} »`);
  if (m.polices.familleH1 && !m.polices.h1Chargee) echecs.push(`${route} : (b) aucune face chargée pour la police du h1 « ${m.polices.familleH1} »`);
  for (const f of facesCherchees) if (!f.ok) echecs.push(`${route} : (b) face « ${f.nom} ${f.poids} » non chargée`);
  if (m.polices.corpsSysteme) echecs.push(`${route} : (c) police du body = police système « ${m.polices.familleCorps} »`);
  for (const f of fontes) {
    // immutable EXIGÉ pour les fichiers hachés (/_next/static/) et versionnés (/fonts/cplus-v1/, règle ajoutée au lot B1) ;
    // ailleurs (ex. /fonts/cr-nnbsp.woff2 avant B1) : avertissement seulement, pas de retour arrière.
    const nom = f.url.split("/").pop();
    const exige = /\/_next\/static\/|\/fonts\/cplus-v\d+\//.test(f.url);
    if (f.statut !== 200 && f.statut !== 304) echecs.push(`${route} : (d) police ${nom} en HTTP ${f.statut}`);
    else if (!/immutable/.test(f.cache)) (exige ? echecs : avertissements).push(`${route} : (d) police ${nom} sans « immutable » (${f.cache || "aucun Cache-Control"})`);
  }
  if (m.seo.breadcrumbList > 1) echecs.push(`${route} : (f) ${m.seo.breadcrumbList} BreadcrumbList (1 au plus)`);
  console.log(`${statut} ${route} · classes ${m.polices.classesHtml - m.polices.classesManquantes.length}/${m.polices.classesHtml} définies · body « ${m.polices.familleCorps} » ${m.polices.corpsChargee ? "chargée" : "NON chargée"} · h1 « ${m.polices.familleH1} » · polices servies ${fontes.length} · BreadcrumbList ${m.seo.breadcrumbList}`);
  await ctx.close();
}
await browser.close();
ecrireJson(path.join(OUT, "post-deploy.json"), { base: BASE, date: new Date().toISOString(), ok: !echecs.length, echecs, avertissements, pages: pagesRes });
if (avertissements.length) console.log("\nAvertissements (non bloquants) :\n- " + avertissements.join("\n- "));
if (echecs.length) { console.log("\nÉCHEC du contrôle post-déploiement :\n- " + echecs.join("\n- ") + "\n→ plan §4.0-5 : npx vercel rollback, puis redéploiement sans cache de build."); process.exit(1); }
console.log("\nContrôle post-déploiement : tout est conforme (captures à regarder dans " + OUT + ").");
