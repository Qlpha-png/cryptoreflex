#!/usr/bin/env node
/**
 * scripts/refresh-fomc.mjs — robot FOMC (lot fraîcheur A, 08/10/2026).
 *
 * Lit le calendrier officiel de la Fed (https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm) et réécrit
 * SEULEMENT le bloc <fomc-auto> de lib/events-seed.ts (les entrées category « FOMC »). Rien n'est écrit si les réunions
 * n'ont pas changé. Échoue (code 1) si la page est injoignable, si sa structure a changé, ou si elle donne moins de 8
 * réunions programmées pour l'année en cours : un calendrier faux n'est jamais publié en silence.
 *
 * Lancé chaque lundi par .github/workflows/refresh-fomc.yml (horloge Vercel du Gardien + filet GitHub), qui lance
 * ensuite les tests puis commite « chore(events): FOMC ».
 *
 * Usage : node scripts/refresh-fomc.mjs [--html=<fichier>] [--aujourdhui=AAAA-MM-JJ] [--verifier]
 *   --html        lit un fichier local au lieu de la page de la Fed (tests, rejeu)
 *   --aujourdhui  date du jour (Paris) imposée (tests) ; par défaut la date du jour à Paris
 *   --verifier    n'écrit rien : code 1 si le seed diffère de la page
 * Zéro dépendance (Node ≥ 20).
 */
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FOMC_URL, entreesDuBloc, extraitReference, fenetre, lireCalendrierFed, releveActuel, remplacerBloc, texteBloc, verifierAnnee, versEvenement } from "./lib/fomc.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SEED = path.join(ROOT, "lib", "events-seed.ts");
const REFERENCE = path.join(ROOT, "tests", "fixtures", "fomc", "reference.html");
const arg = (nom) => process.argv.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3);
const VERIFIER = process.argv.includes("--verifier");
const UA = "cryptoreflex-robot-fomc/1.0 (+https://www.cryptoreflex.fr)";

const resume = (ligne) => {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, ligne + "\n");
};
const sortie = (cle, valeur) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${cle}=${valeur}\n`);
};

async function lirePage() {
  const fichier = arg("html");
  if (fichier) return readFileSync(path.resolve(fichier), "utf8");
  let derniere;
  for (let essai = 0; essai < 3; essai++) {
    if (essai) await new Promise((r) => setTimeout(r, 5000 * essai));
    try {
      const res = await fetch(FOMC_URL, { headers: { "user-agent": UA, accept: "text/html" }, signal: AbortSignal.timeout(20_000) });
      if (res.ok) return await res.text();
      derniere = new Error(`HTTP ${res.status}`);
      await res.body?.cancel().catch(() => {});
    } catch (e) {
      derniere = e;
    }
  }
  throw new Error(`page de la Fed injoignable après 3 essais (${derniere?.message ?? derniere})`);
}

async function main() {
  const aujourdhui = arg("aujourdhui") ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(aujourdhui)) throw new Error(`--aujourdhui invalide : ${aujourdhui}`);
  const annee = Number(aujourdhui.slice(0, 4));

  const page = await lirePage();
  const { reunions, ignorees } = lireCalendrierFed(page);
  const n = verifierAnnee(reunions, annee);
  const gardees = fenetre(reunions, aujourdhui).map(versEvenement);
  console.log(`[fomc] page de la Fed : ${reunions.length} réunions lues (${n} en ${annee}), ${ignorees.length} ligne(s) hors calendrier ignorée(s) : ${ignorees.join(" ; ") || "aucune"}`);
  console.log(`[fomc] ${gardees.length} réunion(s) gardée(s) (décision depuis 12 mois ou à venir) : ${gardees.map((e) => e.date).join(", ")}`);

  const seed = readFileSync(SEED, "utf8");
  const avant = entreesDuBloc(seed);
  const identique =
    avant.length === gardees.length && avant.every((a, i) => a.id === gardees[i].id && a.date === gardees[i].date && a.description === gardees[i].description);

  if (identique) {
    console.log(`[fomc] aucun changement (relevé précédent : ${releveActuel(seed) ?? "inconnu"}).`);
    resume(`## FOMC : aucun changement\n\n${n} réunions ${annee} lues sur federalreserve.gov, identiques au calendrier du site.`);
    sortie("changed", "false");
    return;
  }

  const ajouts = gardees.filter((g) => !avant.some((a) => a.id === g.id && a.date === g.date));
  const retraits = avant.filter((a) => !gardees.some((g) => g.id === a.id && g.date === a.date));
  const detail = [...ajouts.map((e) => `+ ${e.id} (${e.date})`), ...retraits.map((e) => `- ${e.id} (${e.date})`)];
  if (VERIFIER) {
    console.error(`[fomc] le seed diffère de la page de la Fed :\n${detail.join("\n") || "(textes seulement)"}`);
    process.exitCode = 1;
    return;
  }
  // la ligne « Relevé … » ne change qu'avec les réunions : pas de commit hebdomadaire pour rien
  writeFileSync(SEED, remplacerBloc(seed.replace(/\r\n/g, "\n"), texteBloc(gardees, aujourdhui)).replace(/\n/g, seed.includes("\r\n") ? "\r\n" : "\n"));
  // extrait de la page lue, relu par le test « FOMC du seed = Fed » (tests/lib/events-fomc.test.ts)
  writeFileSync(REFERENCE, extraitReference(page, FOMC_URL, aujourdhui));
  console.log(`[fomc] lib/events-seed.ts et ${path.relative(ROOT, REFERENCE).replace(/\\/g, "/")} réécrits :\n${detail.join("\n") || "(textes seulement)"}`);
  resume(`## FOMC : calendrier mis à jour\n\n${detail.map((d) => `- \`${d}\``).join("\n") || "- textes seulement"}`);
  sortie("changed", "true");
}

main().catch((e) => {
  console.error(`[fomc] ÉCHEC : ${e.message}`);
  resume(`## ❌ FOMC : échec\n\n${e.message}\n\nLe calendrier du site n'a pas été modifié.`);
  process.exit(1);
});
