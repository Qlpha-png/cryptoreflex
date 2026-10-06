#!/usr/bin/env node
/**
 * Banc de design (lot A0) — captures PAR CLASSE de page + mesures au rendu (contraste, débordement, SEO, polices, textes
 * interdits de C0), dans le même chargement de page.
 *
 *   node scripts/design/captures.mjs --base http://127.0.0.1:3180 --sortie <DOSSIER HORS DÉPÔT> [options]
 *
 * Options :
 *   --largeurs 390,1440       largeurs capturées (défaut 390,1440)
 *   --pages accueil,avis      sous-ensemble d'identifiants (voir lib/echantillon.mjs)
 *   --echantillon <json>      réutilise un échantillon épinglé (pages résolues d'une référence) : OBLIGATOIRE pour comparer
 *   --prod                    production : 6 pages seulement, UNE visite par page (redimensionnement), pause entre pages
 *   --pause <ms>              pause entre deux pages (défaut 0 en local, 20000 en --prod)
 *   --donnees <dir>           magasin des données figées (défaut <references>/donnees-figees), local seulement
 *   --dpr 1                   densité de pixels des captures
 *   --port-embed 3189         port du petit serveur qui sert la page hôte de l'iframe d'embed
 *
 * Sorties : <sortie>/<id>@<largeur>.png, <sortie>/captures.json (statut, masques, mesures), <sortie>/echantillon.json.
 * En local, les données externes et l'horloge sont figées (navigateur ici, serveur via scripts/design/serveur.mjs).
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { args, sortieHorsDepot, dossierDonnees, horlogeFigee, lancerNavigateur, contexteBanc, stabiliser, marquerZonesVivantes, ecrireJson, sha256, pause } from "./lib/commun.mjs";
import { resoudreEchantillon, chargerEchantillon } from "./lib/echantillon.mjs";
import { mesurerPage, debordements } from "./lib/mesures-page.mjs";

const a = args();
if (!a.base || !a.sortie) { console.error("usage : --base <url> --sortie <dossier hors dépôt>"); process.exit(2); }
const BASE = String(a.base).replace(/\/$/, "");
const LOCALE = /^https?:\/\/(localhost|127\.)/.test(BASE);
const PROD = !!a.prod;
if (!LOCALE && !PROD) { console.error("banc : base distante sans --prod refusée (Vercel bloque l'IP après trop de requêtes)"); process.exit(2); }
const OUT = sortieHorsDepot(a.sortie);
const LARGEURS = String(a.largeurs || "390,1440").split(",").map(Number);
const PAUSE = a.pause !== undefined ? Number(a.pause) : PROD ? 20000 : 0;
const DPR = Number(a.dpr || 1);
const FIGER = LOCALE;
const DONNEES = FIGER ? dossierDonnees(a) : null;
const HORLOGE = FIGER ? horlogeFigee(DONNEES) : null;
if (FIGER && !HORLOGE) console.warn("banc : magasin sans horloge (manifest.json absent) : le serveur a-t-il été lancé par serveur.mjs ?");

// --- échantillon
const filtre = a.pages ? String(a.pages).split(",") : null;
let pages = a.echantillon ? chargerEchantillon(a.echantillon) : await resoudreEchantillon(BASE, { seulementProd: PROD, filtre });
if (filtre) pages = pages.filter((p) => filtre.includes(p.id));
if (PROD) pages = pages.filter((p) => p.prod).slice(0, 6);
ecrireJson(path.join(OUT, "echantillon.json"), { base: BASE, date: new Date().toISOString(), pages });

// --- page hôte de l'embed (iframe servie par un vrai serveur local, comme chez un site tiers)
let hote = null;
if (pages.some((p) => p.iframe && !p.absente) && LOCALE) {
  const port = Number(a["port-embed"] || 3189);
  hote = http.createServer((req, res) => {
    const src = BASE + decodeURIComponent((req.url.split("?src=")[1] || "/embed/convertisseur"));
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Site tiers (banc)</title>
<style>body{margin:0;padding:24px;background:#f4f4f5;font:16px/1.5 system-ui,sans-serif;color:#18181b}iframe{display:block;width:100%;max-width:720px;height:640px;border:0;margin:16px auto;background:transparent}</style></head>
<body><p>Article d'un site tiers. Widget ci-dessous :</p><iframe src="${src}" title="Widget Cryptoreflex" loading="eager"></iframe><p>Suite de l'article.</p></body></html>`);
  });
  await new Promise((r) => hote.listen(port, "127.0.0.1", r));
  hote.urlDe = (u) => `http://127.0.0.1:${port}/?src=${encodeURIComponent(u)}`;
}

const browser = await lancerNavigateur();
const resultats = [];
const t0 = Date.now();
let premiere = true;

async function capturer(page, p, w) {
  let nMasques = await marquerZonesVivantes(page, { iframes: !p.iframe });
  const masques = [page.locator("[data-banc-masque]")];
  if (p.iframe) {
    for (const f of page.frames()) if (f !== page.mainFrame()) nMasques += await marquerZonesVivantes(f).catch(() => 0);
    masques.push(page.frameLocator("iframe").locator("[data-banc-masque]"));
  }
  const fichier = `${p.id}@${w}.png`;
  const buf = await page.screenshot({ path: path.join(OUT, fichier), fullPage: true, animations: "disabled", caret: "hide", scale: "css", mask: masques, maskColor: "#FF00FF" });
  return { fichier, sha256: sha256(buf), masques: nMasques };
}

for (const p of pages) {
  if (p.absente) { resultats.push({ id: p.id, classe: p.classe, absente: true }); console.log(`-- ${p.id} : page non résolue (absente)`); continue; }
  if (!premiere && PAUSE) await pause(PAUSE);
  premiere = false;
  const cible = p.iframe && hote ? hote.urlDe(p.url) : BASE + p.url;
  const visites = PROD ? [LARGEURS.slice().sort((x, y) => y - x)] : LARGEURS.map((w) => [w]);
  for (const groupe of visites) {
    const w0 = groupe[0];
    const ctx = await contexteBanc(browser, { largeur: w0, dpr: DPR, figer: FIGER, donnees: DONNEES, horloge: HORLOGE, consentement: !p.banniere });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(String(e.message || e).slice(0, 200)));
    let statut = 0;
    try { const r = await page.goto(cible, { waitUntil: "load", timeout: 90000 }); statut = r ? r.status() : 0; }
    catch (e) { erreurs.push("navigation : " + String(e.message || e).slice(0, 160)); }
    for (const w of groupe) {
      if (w !== w0) await page.setViewportSize({ width: w, height: w < 768 ? 844 : 900 });
      await stabiliser(page);
      const cap = await capturer(page, p, w);
      let mesures = null;
      const cadre = p.iframe ? (page.frames().find((f) => f !== page.mainFrame()) || page) : page; // embed : on mesure le widget, pas la page hôte
      try { mesures = await mesurerPage(cadre); } catch (e) { erreurs.push("mesures : " + String(e.message || e).slice(0, 160)); }
      resultats.push({ id: p.id, classe: p.classe, url: p.url, largeur: w, statut, statutAttendu: p.statut || 200, ...cap, mesures, erreursJs: erreurs.slice() });
      const m = mesures || {};
      console.log(`${String(statut).padEnd(3)} ${p.id}@${w} masques=${cap.masques} h=${m.hauteur} débord=${m.debordement} contraste:échecs=${m.contraste?.echecs} BreadcrumbList=${m.seo?.breadcrumbList} varsManquantes=${m.polices?.classesManquantes?.length} interdits=${(m.interdits || []).map((x) => x.id + "×" + x.n).join(",") || "0"}`);
    }
    // débordement à d'autres largeurs (même page, sans recharger) — pas en production (aucune requête de plus, mais inutile)
    if (!PROD && resultats.length) {
      const extra = w0 < 768 ? [280, 320] : [768, 1024];
      try { resultats[resultats.length - 1].debordementAutres = await debordements(page, extra); } catch { /* rien */ }
    }
    await ctx.close();
  }
}
await browser.close();
if (hote) hote.close();

const synthese = {
  base: BASE, date: new Date().toISOString(), dureeS: Math.round((Date.now() - t0) / 1000), horlogeFigee: HORLOGE, largeurs: LARGEURS,
  captures: resultats.filter((r) => !r.absente).length,
  statutsInattendus: resultats.filter((r) => !r.absente && r.statut !== r.statutAttendu).map((r) => `${r.id}@${r.largeur}:${r.statut}`),
  debordements: resultats.filter((r) => r.mesures && (r.mesures.debordement > 0 || Object.values(r.debordementAutres || {}).some((d) => d.px > 0))).map((r) => ({ id: r.id, largeur: r.largeur, px: r.mesures.debordement, autres: r.debordementAutres })),
  contrasteEchecs: resultats.filter((r) => r.mesures && r.mesures.contraste.echecs).map((r) => `${r.id}@${r.largeur}:${r.mesures.contraste.echecs}`),
  breadcrumbListPlusieurs: resultats.filter((r) => r.mesures && r.mesures.seo.breadcrumbList > 1).map((r) => `${r.id}:${r.mesures.seo.breadcrumbList}`),
  policesManquantes: resultats.filter((r) => r.mesures && (r.mesures.polices.classesManquantes.length || !r.mesures.polices.corpsChargee || r.mesures.polices.corpsSysteme)).map((r) => `${r.id}@${r.largeur}`),
  interdits: resultats.filter((r) => r.mesures && r.mesures.interdits.length).map((r) => `${r.id}@${r.largeur}:${r.mesures.interdits.map((x) => x.id + "×" + x.n).join("+")}`),
  absentes: resultats.filter((r) => r.absente).map((r) => r.id),
};
ecrireJson(path.join(OUT, "captures.json"), { synthese, resultats });
console.log("\nSYNTHÈSE " + JSON.stringify(synthese, null, 1));
