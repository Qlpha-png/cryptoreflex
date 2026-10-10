#!/usr/bin/env node
/**
 * scripts/fiches-defauts-changement.mjs — le robot de nuit des fiches doit-il publier son résultat ? (finitions Z3, M6)
 *
 * Appelé par .github/workflows/fiches-liens.yml avant le commit de data/fiches/defauts.json. Compare le fichier publié
 * (git show HEAD:data/fiches/defauts.json) et celui du passage en ignorant passeLe et dureeS (règle :
 * scripts/lib/fiches-defauts.mjs → changementUtile). Rien d'utile n'a changé → aucun commit, donc aucun déploiement
 * Vercel ni remise à zéro du cache des pages.
 *
 * Usage : node scripts/fiches-defauts-changement.mjs --ancien <fichier publié> --nouveau <fichier du passage> [--sans-garde]
 * --sans-garde coupe la publication « une fois par date UTC » (à passer seulement quand la carte de fraîcheur n° 52 ne
 * lira plus passeLe dans le fichier). Ancien nom accepté : --age-max-h 0.
 * Codes : 0 = publier ; 10 = rien à publier. Toute autre issue (erreur) = publier par prudence (le workflow ne traite que
 * le code 10 comme « inchangé »).
 */
import { existsSync, readFileSync } from "node:fs";
import { changementUtile } from "./lib/fiches-defauts.mjs";

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i > 0 ? process.argv[i + 1] : d;
};
const lireJson = (f) => {
  if (!f || !existsSync(f)) return null;
  try {
    return JSON.parse(readFileSync(f, "utf8"));
  } catch {
    return null;
  }
};

const sansGarde = process.argv.includes("--sans-garde") || arg("--age-max-h") === "0";
const d = changementUtile(lireJson(arg("--ancien")), lireJson(arg("--nouveau")), { garde: !sansGarde });
console.log(`[fiches-defauts-changement] ${d.publier ? "publier" : "rien à publier"} : ${d.raison}`);
process.exit(d.publier ? 0 : 10);
