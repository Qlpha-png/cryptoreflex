// Banc de design (lot A0) — échantillon de pages PAR CLASSE (plan de migration §4.1).
// Les pages « choisies par le banc » (gemme, fiches générées, actu, comparatif) sont résolues une fois puis ÉPINGLÉES dans
// echantillon.json : les lots suivants réutilisent exactement les mêmes URL (--echantillon <ref>/echantillon.json).
import fs from "node:fs";
import path from "node:path";
import { ROOT, lireJson } from "./commun.mjs";

/** classes fixes ; `prod: true` = les 6 pages autorisées en production (mêmes que mesure-perf) */
export const CLASSES = [
  { id: "accueil", classe: "Accueil", url: "/", prod: true },
  { id: "accueil-cookies", classe: "Bandeau cookies (premier passage)", url: "/", banniere: true },
  { id: "marche", classe: "Marché", url: "/marche", prod: true },
  { id: "marche-heatmap", classe: "Marché", url: "/marche/heatmap" },
  { id: "fiche-top", classe: "Fiche crypto « top »", url: "/cryptos/bitcoin", prod: true },
  { id: "fiche-stablecoin", classe: "Fiche stablecoin", url: "/cryptos/tether" },
  { id: "fiche-gemme", classe: "Fiche « gemme »", resoudre: "gemme" },
  { id: "fiche-generee", classe: "Fiche générée (LLM, meilleur rang)", resoudre: "llm-rang" },
  { id: "fiche-recente", classe: "Fiche récente (LLM, dernière mise à jour)", resoudre: "llm-recente" },
  { id: "article", classe: "Article MDX", url: "/blog/bareme-progressif-vs-pfu-crypto-2026", prod: true },
  { id: "actu", classe: "Actualité", resoudre: "actu" },
  { id: "avis", classe: "Avis", url: "/avis/kraken", prod: true },
  { id: "avis-hub", classe: "Avis", url: "/avis" },
  { id: "comparatif", classe: "Comparatif", url: "/comparatif" },
  { id: "comparatif-slug", classe: "Comparatif", resoudre: "comparatif" },
  { id: "outil-fiscal", classe: "Outil fiscal", url: "/outils/calculateur-fiscalite", prod: true },
  { id: "outil-cerfa", classe: "Outil fiscal", url: "/outils/cerfa-2086-auto" },
  { id: "hub-outils", classe: "Hub", url: "/outils" },
  { id: "hub-academie", classe: "Hub", url: "/academie" },
  { id: "hub-impots", classe: "Hub", url: "/impots", siExiste: true },
  { id: "plan-du-site", classe: "Hub", url: "/plan-du-site", siExiste: true },
  { id: "cartes", classe: "Cartes (site)", url: "/cartes" },
  { id: "carte-mythique", classe: "Cartes (site)", resoudre: "mythique" },
  { id: "embed", classe: "Embed", url: "/embed/convertisseur", iframe: true },
  { id: "erreur-404", classe: "Erreur", url: "/banc-design-page-inexistante", statut: 404 },
  { id: "hors-ligne", classe: "Hors ligne", url: "/offline" },
  { id: "jeu", classe: "Jeu (invariance)", url: "/cartes/jouer" },
];

const ids = (f, pick) => { const j = lireJson(path.join(ROOT, f), {}); return pick(j); };

async function texte(base, url) {
  const r = await fetch(base + url, { redirect: "follow", signal: AbortSignal.timeout(60000) });
  return { statut: r.status, corps: await r.text() };
}

async function sitemap(base) {
  const { corps } = await texte(base, "/sitemap.xml");
  const out = [];
  for (const m of corps.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = (m[1].match(/<loc>([^<]+)<\/loc>/) || [])[1];
    const lastmod = (m[1].match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1] || "";
    if (loc) out.push({ chemin: new URL(loc).pathname, lastmod });
  }
  return out;
}

export async function resoudreEchantillon(base, { seulementProd = false, filtre = null } = {}) {
  let liste = CLASSES.filter((c) => (!seulementProd || c.prod) && (!filtre || filtre.includes(c.id)));
  const besoinSitemap = liste.some((c) => c.resoudre === "llm-rang" || c.resoudre === "llm-recente" || c.resoudre === "comparatif");
  const sm = besoinSitemap ? await sitemap(base) : [];
  const redigees = new Set([
    ...ids("data/top-cryptos.json", (j) => (Array.isArray(j) ? j : j.cryptos || j.topCryptos || []).map((x) => x.id)),
    ...ids("data/hidden-gems.json", (j) => (j.hiddenGems || j.cryptos || j.gems || []).map((x) => x.id)),
  ]);
  const llm = sm.filter((u) => /^\/cryptos\/[^/]+$/.test(u.chemin) && !redigees.has(u.chemin.split("/")[2]));
  const out = [];
  for (const c of liste) {
    const e = { ...c };
    delete e.resoudre;
    if (c.resoudre === "gemme") {
      const g = ids("data/hidden-gems.json", (j) => (j.hiddenGems || j.cryptos || j.gems || []).map((x) => x.id));
      e.url = g[0] ? `/cryptos/${g[0]}` : null;
    } else if (c.resoudre === "llm-rang") {
      e.url = llm[0] ? llm[0].chemin : null; // le sitemap liste les fiches générées par rang de capitalisation
    } else if (c.resoudre === "llm-recente") {
      const tri = llm.slice().sort((a, b) => (b.lastmod || "").localeCompare(a.lastmod || "") || a.chemin.localeCompare(b.chemin));
      const autre = tri.find((u) => !llm[0] || u.chemin !== llm[0].chemin);
      e.url = autre ? autre.chemin : null;
    } else if (c.resoudre === "comparatif") {
      // une vraie page [slug] : on écarte les sous-pages fixes (app/comparatif/frais, app/comparatif/securite…)
      const fixes = new Set(fs.readdirSync(path.join(ROOT, "app/comparatif"), { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith("[")).map((d) => d.name));
      const s = sm.find((u) => /^\/comparatif\/[^/]+$/.test(u.chemin) && !fixes.has(u.chemin.split("/")[2]));
      e.url = s ? s.chemin : null;
    } else if (c.resoudre === "actu") {
      const { corps } = await texte(base, "/actualites");
      const m = [...corps.matchAll(/href="(\/actualites\/[a-z0-9][a-z0-9-]{12,})"/g)].map((x) => x[1]).find((u) => !/\/(page|categorie|category|tag)\b/.test(u));
      e.url = m || null;
    } else if (c.resoudre === "mythique") {
      const r = lireJson(path.join(ROOT, "data/reflex-cards-rules.json"), {});
      const list = (r.ed && r.ed.myth && r.ed.myth.list) || [];
      e.url = null;
      for (const id of list.slice(0, 5)) { const { statut } = await texte(base, `/cartes/${id}`); if (statut === 200) { e.url = `/cartes/${id}`; break; } }
    }
    if (c.siExiste && e.url) { const { statut } = await texte(base, e.url); if (statut !== 200) e.url = null; }
    if (!e.url) { e.absente = true; }
    out.push(e);
  }
  return out;
}

export function chargerEchantillon(f) {
  return JSON.parse(fs.readFileSync(f, "utf8")).pages;
}
