/**
 * scripts/lib/revue-periodique.mjs — robot R14 « revue périodique » (lot Z6, 10/10/2026).
 *
 * Le 1er de chaque mois (workflow .github/workflows/revue-periodique.yml, lancé par le Gardien), un ticket PRIVÉ liste tout
 * ce qui dépasse son seuil « vérifié le » (lib/fraicheur.ts, composant <VerifieLe>) parmi les données qu'AUCUN robot ne
 * relit : les familles « H » de l'architecture 0 € (support client, événements, airdrops, roadmaps, scores de décentralisation,
 * tarifs des partenaires, statut MiCA des wallets, textes éditoriaux, lignes de rendements éditoriales).
 * Rien n'est corrigé ni publié par le robot : il rappelle que des dates affichées vieillissent.
 *
 * Réutilise les listes fermées de scripts/lib/inventaire-dates.mjs (CHAMPS, CONSTANTES, SEUILS = mêmes champs, mêmes seuils que
 * la sentinelle) : un champ de date ajouté là entre ici. Fonctions pures + lecture locale des fichiers du dépôt (aucun
 * réseau), testées dans tests/lib/revue-periodique-z6.test.ts.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { CHAMPS, CONSTANTES, SEUILS } from "./inventaire-dates.mjs";

/** Familles de seuils « VerifieLe » dont la donnée est tenue à la main (aucun robot ne relit la source). */
export const FAMILLES_H = {
  support: "Support client (n° 23)",
  evenements: "Événements (n° 34 à 36)",
  airdrops: "Airdrops (n° 37)",
  roadmaps: "Roadmaps (n° 38)",
  decentralisation: "Scores de décentralisation (n° 39)",
  wallets: "Statut MiCA des wallets (n° 29)",
  editorial: "Textes éditoriaux (n° 15 et 41)",
  rendements: "Lignes de rendements éditoriales (n° 32 et 33)",
  "tarifs-partenaires": "Tarifs des partenaires fiscaux (n° 30)",
};

/** Champs tenus par un robot, donc hors revue : [fichier, chemin]. */
const TENUS_PAR_ROBOT = new Set(["data/rendements.json lido.date"]);

const ISO = /^\d{4}-\d{2}(-\d{2})?/;
const JOUR_MS = 86_400_000;
const instant = (d) => Date.parse(d.length === 7 ? `${d}-01T00:00:00Z` : `${d.slice(0, 10)}T00:00:00Z`);

/** Dates d'un chemin « a.b[].c » avec une étiquette lisible par élément de tableau (nom, sinon identifiant, sinon rang). */
export function valeursEtiquetees(obj, chemin) {
  let cur = [{ v: obj, label: "" }];
  for (const part of chemin.split(".")) {
    const tableau = part.endsWith("[]");
    const cle = tableau ? part.slice(0, -2) : part;
    cur = cur.flatMap(({ v, label }) => {
      const x = v && typeof v === "object" ? v[cle] : undefined;
      if (!tableau) return x === undefined ? [] : [{ v: x, label }];
      return (Array.isArray(x) ? x : []).map((el, i) => ({ v: el, label: el?.name ?? el?.id ?? `n°${i + 1}` }));
    });
  }
  return cur.filter(({ v }) => typeof v === "string" && ISO.test(v)).map(({ v, label }) => ({ date: v.slice(0, 10), label }));
}

/**
 * Éléments datés à passer en revue : [{ famille, champ, label, date, seuilJours }].
 * @param {string} root racine du dépôt
 */
export function lireElements(root) {
  const out = [];
  const pousser = (famille, champ, label, date) => out.push({ famille, champ, label, date, seuilJours: SEUILS[famille] });
  for (const [f, chemin, famille] of CHAMPS) {
    if (!FAMILLES_H[famille] || TENUS_PAR_ROBOT.has(`${f} ${chemin}`)) continue;
    let j;
    try { j = JSON.parse(readFileSync(path.join(root, f), "utf8")); } catch { pousser(famille, `${f} ${chemin}`, "fichier illisible", ""); continue; }
    const vals = valeursEtiquetees(j, chemin);
    if (!vals.length) pousser(famille, `${f} ${chemin}`, "aucune date", "");
    for (const { date, label } of vals) pousser(famille, `${f} ${chemin}`, label || "fichier entier", date);
  }
  for (const [f, re, famille] of CONSTANTES) {
    if (!FAMILLES_H[famille] || TENUS_PAR_ROBOT.has(f)) continue;
    let src = "";
    try { src = readFileSync(path.join(root, f), "utf8"); } catch { pousser(famille, f, "fichier illisible", ""); continue; }
    const dates = re.global ? [...src.matchAll(re)].map((m) => m[1]) : src.match(re) ? [src.match(re)[1]] : [];
    if (!dates.length) pousser(famille, f, "aucune date", "");
    dates.forEach((d, i) => pousser(famille, f, dates.length > 1 ? `ligne n°${i + 1}` : "date unique", String(d).slice(0, 10)));
  }
  // articles de fond : date « mis à jour » de chaque article (à défaut sa date de publication)
  try {
    const dossier = path.join(root, "content/articles");
    for (const n of readdirSync(dossier).filter((x) => /\.mdx?$/.test(x))) {
      const tete = readFileSync(path.join(dossier, n), "utf8").slice(0, 3000);
      const d = tete.match(/^lastUpdated:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1] ?? tete.match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1];
      pousser("editorial", "content/articles", n.replace(/\.mdx?$/, ""), d ?? "");
    }
  } catch { pousser("editorial", "content/articles", "dossier illisible", ""); }
  return out;
}

/**
 * Éléments qui dépassent leur seuil à l'instant `maintenant` (ms). Un élément sans date lisible compte comme dépassé
 * (on ne prouve pas la fraîcheur). Une date postérieure à aujourd'hui n'est jamais en retard.
 * @returns {Array<{ famille:string, champ:string, label:string, date:string, seuilJours:number, ageJours:number|null }>}
 */
export function elementsEnRetard(elements, maintenant) {
  const res = [];
  for (const e of elements) {
    const ok = e.date && ISO.test(e.date);
    const age = ok ? Math.floor((maintenant - instant(e.date)) / JOUR_MS) : null;
    if (age === null || age > e.seuilJours) res.push({ ...e, ageJours: age });
  }
  // plus vieux d'abord (les éléments sans date en tête)
  return res.sort((a, b) => (b.ageJours ?? Infinity) - (a.ageJours ?? Infinity));
}

const jourFr = (d) => (d ? d.split("-").reverse().join("/") : "date illisible");

/** Titre stable : un seul ticket par mois (anti-doublon du workflow). */
export function titreRevue(maintenant) {
  return `[Revue périodique] ${new Date(maintenant).toISOString().slice(0, 7)}`;
}

/**
 * Corps du ticket mensuel, ou null si rien ne dépasse son seuil.
 * @param {ReturnType<typeof elementsEnRetard>} retard
 * @param {number} total nombre d'éléments passés en revue
 */
export function corpsRevue(retard, total, maintenant, { limiteParFamille = 12 } = {}) {
  if (!retard.length) return null;
  const lignes = [
    `Revue périodique du ${new Date(maintenant).toISOString().slice(0, 10).split("-").reverse().join("/")} : **${retard.length} élément(s) sur ${total}** dépassent le seuil « vérifié le » de leur famille. Aucun robot ne relit ces données : à relire à la source officielle (en session), puis à redater.`,
    "",
  ];
  for (const [id, titre] of Object.entries(FAMILLES_H)) {
    const dans = retard.filter((e) => e.famille === id);
    if (!dans.length) continue;
    lignes.push(`### ${titre} — ${dans.length} en retard (seuil : ${SEUILS[id]} jours)`, "");
    for (const e of dans.slice(0, limiteParFamille)) {
      lignes.push(`- ${e.label} · ${e.champ} · ${e.ageJours === null ? "sans date lisible" : `${jourFr(e.date)} (${e.ageJours} jours)`}`);
    }
    if (dans.length > limiteParFamille) lignes.push(`- … et ${dans.length - limiteParFamille} autre(s) de la même famille`);
    lignes.push("");
  }
  lignes.push("_Ticket créé par le robot R14 (`scripts/revue-periodique.mjs`, lot Z6). Seuils : `lib/fraicheur.ts`._");
  return lignes.join("\n") + "\n";
}
