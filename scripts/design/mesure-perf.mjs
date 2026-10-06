#!/usr/bin/env node
/**
 * Banc de design (lot A0) — mesure de performance simple (dérivée de migration/mesure-perf.mjs du plan, §5).
 *
 *   node scripts/design/mesure-perf.mjs --base http://127.0.0.1:3180 --sortie <dossier HORS DÉPÔT> [--bridage] [--pages accueil,…]
 *
 * Par page et par profil (mobile 390 / bureau 1440) : octets transférés et décodés HTML / CSS / JS / polices / images,
 * nombre de requêtes, CLS, LCP, FCP, TBT (somme des tâches > 50 ms), nœuds DOM, octets de <style> et de <script> en ligne.
 * --bridage : réseau 4G simulé + CPU ×4 en mobile (comme la mesure de production du 06/10/2026).
 * Pages par défaut : les 6 du budget (§5.1). En production, ajouter --prod (pause de 20 s entre visites).
 */
import path from "node:path";
import { args, sortieHorsDepot, lancerNavigateur, contexteBanc, dossierDonnees, horlogeFigee, ecrireJson, pause } from "./lib/commun.mjs";
import { CLASSES } from "./lib/echantillon.mjs";

const a = args();
if (!a.base || !a.sortie) { console.error("usage : --base <url> --sortie <dossier hors dépôt>"); process.exit(2); }
const BASE = String(a.base).replace(/\/$/, "");
const LOCALE = /^https?:\/\/(localhost|127\.)/.test(BASE);
if (!LOCALE && !a.prod) { console.error("banc : base distante sans --prod refusée"); process.exit(2); }
const OUT = sortieHorsDepot(a.sortie);
const ids = a.pages ? String(a.pages).split(",") : CLASSES.filter((c) => c.prod).map((c) => c.id);
const PAGES = CLASSES.filter((c) => ids.includes(c.id) && c.url);
const PAUSE = a.prod ? 20000 : 0;
const DONNEES = LOCALE ? dossierDonnees(a) : null;
const HORLOGE = LOCALE ? horlogeFigee(DONNEES) : null;
const PROFILS = [
  { nom: "mobile", largeur: 390, hauteur: 844, dpr: 3, mobile: true, cpu: a.bridage ? 4 : 1, net: a.bridage ? { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 } : null },
  { nom: "bureau", largeur: 1440, hauteur: 900, dpr: 1, mobile: false, cpu: 1, net: null },
];

const browser = await lancerNavigateur();
const lignes = [];
let n = 0;
for (const prof of PROFILS) {
  for (const p of PAGES) {
    if (n++ && PAUSE) await pause(PAUSE);
    const ctx = await contexteBanc(browser, { largeur: prof.largeur, hauteur: prof.hauteur, dpr: prof.dpr, mobile: prof.mobile, figer: LOCALE, donnees: DONNEES, horloge: HORLOGE });
    await ctx.addInitScript(() => {
      window.__m = { cls: 0, lcp: 0, tbt: 0, longues: 0 };
      try {
        new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__m.longues++; window.__m.tbt += Math.max(0, e.duration - 50); } }).observe({ type: "longtask", buffered: true });
      } catch { /* navigateur sans ces API */ }
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    if (prof.net) await cdp.send("Network.emulateNetworkConditions", { offline: false, ...prof.net });
    if (prof.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: prof.cpu });
    const res = new Map();
    cdp.on("Network.responseReceived", (e) => res.set(e.requestId, { url: e.response.url, type: e.type, enc: 0, dec: 0 }));
    cdp.on("Network.dataReceived", (e) => { const r = res.get(e.requestId); if (r) r.dec += e.dataLength; });
    cdp.on("Network.loadingFinished", (e) => { const r = res.get(e.requestId); if (r) r.enc = e.encodedDataLength; });
    let statut = 0;
    try { const r = await page.goto(BASE + p.url, { waitUntil: "load", timeout: 90000 }); statut = r ? r.status() : 0; } catch (e) { console.log("ÉCHEC", p.id, prof.nom, String(e.message).slice(0, 100)); }
    await page.waitForTimeout(4000);
    const m = await page.evaluate(() => {
      const fcp = performance.getEntriesByName("first-contentful-paint")[0];
      return {
        ...window.__m,
        fcp: fcp ? fcp.startTime : 0,
        dom: document.getElementsByTagName("*").length,
        styleEnLigne: [...document.querySelectorAll("style")].reduce((s, x) => s + x.textContent.length, 0),
        scriptEnLigne: [...document.querySelectorAll("script:not([src])")].reduce((s, x) => s + x.textContent.length, 0),
      };
    });
    const agg = { html: [0, 0], css: [0, 0], js: [0, 0], police: [0, 0], image: [0, 0], autre: [0, 0], requetes: 0 };
    for (const r of res.values()) {
      agg.requetes++;
      const k = r.type === "Document" ? "html" : r.type === "Stylesheet" ? "css" : r.type === "Script" ? "js" : r.type === "Font" ? "police" : r.type === "Image" ? "image" : "autre";
      agg[k][0] += r.enc; agg[k][1] += r.dec;
    }
    const ko = (x) => Math.round(x / 1024);
    lignes.push({ page: p.id, url: p.url, profil: prof.nom, statut, octets: agg, cls: +m.cls.toFixed(4), lcp: Math.round(m.lcp), fcp: Math.round(m.fcp), tbt: Math.round(m.tbt), noeudsDom: m.dom, styleEnLigne: m.styleEnLigne, scriptEnLigne: m.scriptEnLigne });
    console.log(`${prof.nom.padEnd(6)} ${p.id.padEnd(13)} ${statut} HTML ${ko(agg.html[0])}/${ko(agg.html[1])} Ko · CSS ${ko(agg.css[0])}/${ko(agg.css[1])} · JS ${ko(agg.js[0])}/${ko(agg.js[1])} · polices ${ko(agg.police[0])} · img ${ko(agg.image[0])} · req ${agg.requetes} · CLS ${m.cls.toFixed(3)} · LCP ${Math.round(m.lcp)} · TBT ${Math.round(m.tbt)} · DOM ${m.dom}`);
    await ctx.close();
  }
}
await browser.close();
ecrireJson(path.join(OUT, "mesure-perf.json"), { base: BASE, date: new Date().toISOString(), bridage: !!a.bridage, note: "octets = [transférés (compressés), décodés]", lignes });
