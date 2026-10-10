#!/usr/bin/env node
/**
 * scripts/proposeur.mjs — R10 « proposeur » + R11 « fusion » (lot Z7, 10/10/2026).
 *
 * Lancé par .github/workflows/proposeur.yml après une veille qui a signalé un changement de TAUX sur une page de frais.
 * Lit le texte des pages changées (veille-frais-textes.json, fichier de travail de la veille, jamais dans le dépôt), demande à
 * Gemini d'EXTRAIRE les chiffres (deux lectures), applique les garde-fous déterministes (scripts/lib/proposeur.mjs), décide
 * de la suite par la table de fusion (scripts/lib/fusion-regles.mjs) et écrit, HORS du dépôt, un dossier de sortie :
 *   resultat.json        tout le passage (plateformes, champs, rejets, arrêt, appels)
 *   <id>.json / <id>.md  par plateforme ayant au moins une proposition : décision, lignes, corps de la demande de fusion
 *   plateformes.txt      identifiants (un par ligne) des plateformes à proposer
 *   ticket.md            corps du ticket privé (rejets, pannes, arrêt) ; absent s'il n'y a rien à signaler
 * Ce script n'écrit JAMAIS dans data/platforms.json en mode d'analyse. Il le fait seulement avec --appliquer=<id>, sur la
 * branche de la proposition, pour les lignes « proposées » de cette plateforme.
 * Le code du passage est dans scripts/lib/proposeur-passage.mjs (rejoué tel quel par le banc d'essai et les tests).
 *
 * Usage :
 *   node scripts/proposeur.mjs [--textes=veille-frais-textes.json] [--sortie=proposeur-sortie] [--compteur=fichier.json] [--plafond=50]
 *   node scripts/proposeur.mjs --appliquer=<id> [--sortie=proposeur-sortie]
 * Variables : GEMINI_API_KEY (jamais imprimée), GEMINI_MODELES_A / GEMINI_MODELES_B (modèles de chaque lecture, séparés par des
 * virgules ; défaut gemini-flash-latest puis gemini-3.5-flash-lite pour A, l'inverse pour B), R11_FUSION_FRAIS (« on » active la
 * fusion automatique des frais ; toute autre valeur = mode « propose »), GITHUB_OUTPUT, PROPOSEUR_PLATEFORMES (chemin du
 * fichier des fiches, pour les tests).
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lireMode } from "./lib/fusion-regles.mjs";
import { creerClientGemini } from "./lib/gemini-client.mjs";
import { passage } from "./lib/proposeur-passage.mjs";
import { PLAFOND_APPELS_JOUR, ErreurGemini, appliquerPropositions, creerCompteur, lireModeles, tauxRejet } from "./lib/proposeur.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (nom, defaut) => {
  const a = process.argv.slice(2).find((x) => x.startsWith(`--${nom}=`));
  return a ? a.slice(nom.length + 3) : defaut;
};
const SORTIE = path.resolve(arg("sortie", path.join(ROOT, "proposeur-sortie")));
const PLATEFORMES = process.env.PROPOSEUR_PLATEFORMES || path.join(ROOT, "data/platforms.json");
const AUJ = new Date().toISOString().slice(0, 10);
const sortieGh = (k, v) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };

/* ------------------------------------------------------------------ application d'une proposition (sur sa branche) */
const appliquer = arg("appliquer", "");
if (appliquer) {
  const prop = JSON.parse(readFileSync(path.join(SORTIE, `${appliquer}.json`), "utf8"));
  const lignes = prop.champs.filter((c) => c.statut === "propose").map((c) => ({ id: appliquer, champ: c.champ, nouvelle: c.nouvelle }));
  if (!lignes.length) { console.log(`${appliquer} : aucune ligne proposée, rien à écrire.`); process.exit(0); }
  const { texte, changements } = appliquerPropositions(readFileSync(PLATEFORMES, "utf8"), lignes);
  writeFileSync(PLATEFORMES, texte);
  for (const c of changements) console.log(`${c.id} fees.${c.champ} : ${c.avant} -> ${c.apres}`);
  process.exit(0);
}

/* ------------------------------------------------------------------ analyse */
const fichierTextes = path.resolve(arg("textes", path.join(ROOT, "veille-frais-textes.json")));
if (!existsSync(fichierTextes)) {
  console.log("Aucun texte de page de frais changée : rien à proposer.");
  sortieGh("plateformes", "");
  sortieGh("ticket", "false");
  sortieGh("arret", "");
  process.exit(0);
}
const textes = JSON.parse(readFileSync(fichierTextes, "utf8"));
const { platforms } = JSON.parse(readFileSync(PLATEFORMES, "utf8"));
const { mode } = lireMode(process.env);

// compteur du jour : fichier {date, appels} conservé d'un passage à l'autre par le cache du workflow
const fichierCompteur = arg("compteur", "");
let deja = 0;
if (fichierCompteur && existsSync(fichierCompteur)) {
  try { const c = JSON.parse(readFileSync(fichierCompteur, "utf8")); if (c.date === AUJ) deja = Number(c.appels) || 0; } catch { /* compteur illisible : repart de zéro, le quota de Gemini reste le dernier rempart */ }
}
const compteur = creerCompteur({ plafond: Number(arg("plafond", PLAFOND_APPELS_JOUR)) || PLAFOND_APPELS_JOUR, deja });

let client;
try {
  client = creerClientGemini({ cle: process.env.GEMINI_API_KEY });
} catch (e) {
  if (!(e instanceof ErreurGemini)) throw e;
  client = { generer: async () => { throw e; } }; // clé absente : arrêt propre au premier appel, ticket motivé
}

const { resultats, arret, aProposer, ticket } = await passage({ textes, platforms, client, compteur, env: process.env, sortie: SORTIE, date: AUJ, modeles: lireModeles(process.env) });
const stats = tauxRejet(resultats);
if (fichierCompteur) writeFileSync(fichierCompteur, JSON.stringify({ date: AUJ, appels: compteur.utilises() }));

sortieGh("plateformes", aProposer.join(" "));
sortieGh("ticket", ticket ? "true" : "false");
sortieGh("arret", arret ?? "");
sortieGh("appels", String(compteur.utilises()));
sortieGh("rejet_anormal", stats.anormal ? "true" : "false");
// journal public du job : des décomptes seulement (aucune citation, aucune valeur de page)
const champs = resultats.flatMap((r) => r.champs);
console.log(`Proposeur ${AUJ} (mode ${mode}) : ${resultats.length} plateforme(s), ${champs.filter((c) => c.statut === "propose").length} proposition(s), ${champs.filter((c) => c.statut === "rejete").length} rejet(s), ${champs.filter((c) => c.statut === "identique").length} confirmée(s), ${champs.filter((c) => c.statut === "non-trouve").length} non trouvée(s) ; ${compteur.utilises()} / ${compteur.plafond} appels Gemini aujourd'hui${stats.anormal ? ` ; TAUX DE REJET ANORMAL (${stats.rejetes} / ${stats.juges})` : ""}${arret ? ` ; ARRÊT : ${arret}` : ""}.`);
