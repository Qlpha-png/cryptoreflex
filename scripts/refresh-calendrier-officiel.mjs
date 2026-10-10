#!/usr/bin/env node
/**
 * scripts/refresh-calendrier-officiel.mjs — robot R7 étendu (lot Z4, 10/10/2026) : réunions de politique monétaire de la
 * BCE et prochain halving de Bitcoin en fourchette. Lancé par .github/workflows/refresh-fomc.yml APRÈS la lecture de la
 * Fed (scripts/refresh-fomc.mjs) : s'il tourne, la Fed vient d'être relue avec succès dans le même passage.
 *
 * Écrit data/calendrier-officiel.json (lu au rendu : /calendrier, /halving-bitcoin, fiche Bitcoin) et l'extrait de
 * référence tests/fixtures/bce/reference.html. Une partie en échec garde ses anciennes données (avec leur date) : rouge
 * (code 1), les autres parties sont quand même écrites.
 *
 * Requêtes (une par seconde au plus) : BCE 1 (+2 au premier remplissage des décisions passées), mempool.space 3,
 * blockstream.info 1 (recoupement de la hauteur).
 * Sorties GitHub : changed=true|false.
 *
 * Usage : node scripts/refresh-calendrier-officiel.mjs [--bce=<html>] [--mesures=<json>] [--aujourdhui=AAAA-MM-JJ]
 *         [--sortie=<json>] [--sans-reference]
 *   --mesures : { hauteur, horodatageBloc, tempsEpoqueS, hauteurRecoupement } (rejeu sans réseau)
 * Zéro dépendance (Node ≥ 20).
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BCE_CALENDRIER_URL, bceDecisionsUrl, fusionnerDecisions, lireCalendrierBce, lireDecisionsPassees, verifierBce } from "./lib/bce-calendrier.mjs";
import { calculerHalving, verifierMesures } from "./lib/halving.mjs";
import { FOMC_URL } from "./lib/fomc.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (nom) => process.argv.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3);
const FICHIER = arg("sortie") ? path.resolve(arg("sortie")) : path.join(ROOT, "data", "calendrier-officiel.json");
const REFERENCE = path.join(ROOT, "tests", "fixtures", "bce", "reference.html");
const UA = "cryptoreflex-robot-calendrier/1.0 (+https://www.cryptoreflex.fr)";
const MEMPOOL = "https://mempool.space/api";
const BLOCKSTREAM = "https://blockstream.info/api";

const resume = (ligne) => {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, ligne + "\n");
  console.log(ligne);
};
const sortie = (cle, valeur) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${cle}=${valeur}\n`);
};
let derniere = 0;
async function lire(url, type = "text") {
  const attente = derniere + 1100 - Date.now();
  if (attente > 0) await new Promise((r) => setTimeout(r, attente));
  derniere = Date.now();
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) {
    await res.body?.cancel().catch(() => {});
    throw new Error(`HTTP ${res.status} sur ${new URL(url).hostname}`);
  }
  return type === "json" ? res.json() : res.text();
}

async function main() {
  sortie("changed", "false");
  const aujourdhui = arg("aujourdhui") ?? new Date().toISOString().slice(0, 10);
  let actuel = null;
  if (existsSync(FICHIER)) {
    try { actuel = JSON.parse(readFileSync(FICHIER, "utf8")); } catch { actuel = null; }
  }
  const nouveau = {
    version: 1,
    releveLe: actuel?.releveLe ?? null,
    fed: { source: FOMC_URL, releveLe: aujourdhui },
    bce: actuel?.bce ?? null,
    halving: actuel?.halving ?? null,
  };
  let echec = false;

  /* ---------------- BCE */
  try {
    const html = arg("bce") ? readFileSync(path.resolve(arg("bce")), "utf8") : await lire(BCE_CALENDRIER_URL);
    const lu = lireCalendrierBce(html);
    if (lu.erreur) throw new Error(lu.erreur);
    const raison = verifierBce(lu.decisions, aujourdhui);
    if (raison) throw new Error(raison);
    let anciennes = actuel?.bce?.decisions ?? [];
    // premier remplissage : décisions passées des 12 derniers mois (fragment interne de la BCE, une seule fois)
    if (!arg("bce") && !anciennes.some((d) => d.date < aujourdhui)) {
      const annee = Number(aujourdhui.slice(0, 4));
      for (const a of [annee - 1, annee]) {
        const passees = lireDecisionsPassees(await lire(bceDecisionsUrl(a)));
        if (passees.length < 4 && a < annee) throw new Error(`décisions passées de ${a} illisibles (${passees.length})`);
        anciennes = [...anciennes, ...passees.filter((d) => d.date < aujourdhui)];
      }
    }
    const { decisions, changements } = fusionnerDecisions(anciennes, lu.decisions, aujourdhui);
    for (const c of changements) resume(`- ⚠️ BCE : ${c}`);
    nouveau.bce = { source: BCE_CALENDRIER_URL, releveLe: aujourdhui, decisions };
    const suivante = String(Number(aujourdhui.slice(0, 4)) + 1);
    resume(`- ✅ BCE : ${lu.decisions.filter((d) => d.date >= aujourdhui).length} décisions à venir, dont ${lu.decisions.filter((d) => d.date.startsWith(suivante)).length} en ${suivante}`);
    if (!arg("sans-reference") && !arg("sortie")) {
      mkdirSync(path.dirname(REFERENCE), { recursive: true });
      const dl = html.match(/<div class="definition-list[^"]*">\s*<dl>[\s\S]*?<\/dl>\s*<\/div>/)?.[0] ?? "";
      writeFileSync(REFERENCE, `<!-- Extrait de ${BCE_CALENDRIER_URL}, relu le ${aujourdhui} par scripts/refresh-calendrier-officiel.mjs -->\n${dl}\n`);
    }
  } catch (e) {
    echec = true;
    resume(`- ❌ BCE : ${String(e?.message ?? e).slice(0, 160)} ; anciennes données gardées${actuel?.bce?.releveLe ? ` (relevé du ${actuel.bce.releveLe})` : ""}`);
  }

  /* ---------------- halving */
  try {
    let m;
    if (arg("mesures")) m = JSON.parse(readFileSync(path.resolve(arg("mesures")), "utf8"));
    else {
      const hauteur = Number(String(await lire(`${MEMPOOL}/blocks/tip/height`)).trim());
      const blocs = await lire(`${MEMPOOL}/v1/blocks/${hauteur}`, "json");
      const tip = Array.isArray(blocs) ? blocs.find((b) => b.height === hauteur) : null;
      if (!tip) throw new Error("dernier bloc introuvable sur mempool.space");
      const diff = await lire(`${MEMPOOL}/v1/difficulty-adjustment`, "json");
      const hauteurRecoupement = Number(String(await lire(`${BLOCKSTREAM}/blocks/tip/height`)).trim());
      m = { hauteur, horodatageBloc: tip.timestamp, tempsEpoqueS: Number(diff?.timeAvg) / 1000, hauteurRecoupement };
    }
    const horodatagePrecedentS = actuel?.halving?.horodatageBloc ? Date.parse(actuel.halving.horodatageBloc) / 1000 : undefined;
    const raison = verifierMesures({ ...m, reseau: !arg("mesures"), maintenantS: arg("mesures") ? undefined : Date.now() / 1000, hauteurPrecedente: actuel?.halving?.hauteur, horodatagePrecedentS });
    if (raison) throw new Error(raison);
    const h = calculerHalving(m);
    if (h.erreur) throw new Error(h.erreur);
    nouveau.halving = { ...h, source: "https://mempool.space", recoupement: Number.isInteger(m.hauteurRecoupement) ? { source: "https://blockstream.info", hauteur: m.hauteurRecoupement } : null, calculeLe: aujourdhui };
    resume(`- ✅ Halving : hauteur ${h.hauteur}, ${h.blocsRestants} blocs restants, estimation ${h.estimation.slice(0, 10)} (du ${h.fourchette.debut.slice(0, 10)} au ${h.fourchette.fin.slice(0, 10)})`);
  } catch (e) {
    echec = true;
    resume(`- ❌ Halving : ${String(e?.message ?? e).slice(0, 160)} ; ancien calcul gardé${actuel?.halving?.calculeLe ? ` (du ${actuel.halving.calculeLe})` : ""}`);
  }

  // date commune du relevé automatique : seulement quand la BCE ET le halving ont été relus dans ce passage
  if (!echec) nouveau.releveLe = aujourdhui;
  const texte = JSON.stringify(nouveau, null, 2) + "\n";
  if (!actuel || texte !== JSON.stringify(actuel, null, 2) + "\n") {
    writeFileSync(FICHIER, texte);
    sortie("changed", "true");
  }
  if (echec) process.exitCode = 1;
}

main().catch((e) => {
  resume(`- ❌ Robot calendrier officiel interrompu (${String(e?.message ?? e).slice(0, 160)})`);
  process.exit(1);
});
