#!/usr/bin/env node
/**
 * scripts/proposeur-lecture.mjs — relit UNE fois les pages de frais suivies de quelques plateformes et écrit leur texte sur le
 * disque du runner (lot Z7, reprise du 10/10/2026). Utilisé par le lancement MANUEL du workflow « Proposeur » ; la veille de
 * nuit, elle, fournit déjà le texte qu'elle vient de lire. Règles : scripts/lib/proposeur-lecture.mjs.
 *
 * Usage : node scripts/proposeur-lecture.mjs --plateformes="kraken coinbase" --sortie="$RUNNER_TEMP/veille-frais-textes.json"
 * Sortie : le fichier (même forme que celui de la veille : { date, pages: [{ plateforme, nom, url, texte, releve }] }) s'il y a au
 * moins une page lue ; le décompte et les raisons des pages ignorées dans le journal (jamais le texte). Code 1 si les
 * identifiants sont invalides.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lireIdentifiants, lirePages } from "./lib/proposeur-lecture.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (nom, defaut = "") => { const a = process.argv.slice(2).find((x) => x.startsWith(`--${nom}=`)); return a ? a.slice(nom.length + 3) : defaut; };
const sortie = arg("sortie");
if (!sortie) { console.error("--sortie= obligatoire"); process.exit(1); }
const { platforms } = JSON.parse(readFileSync(process.env.PROPOSEUR_PLATEFORMES || path.join(ROOT, "data/platforms.json"), "utf8"));
const F = JSON.parse(readFileSync(path.join(ROOT, "data/veille/sources.json"), "utf8")).frais || {};
const { ids, erreurs } = lireIdentifiants(arg("plateformes"), platforms);
if (erreurs.length) { for (const e of erreurs) console.error(`Refus : ${e}`); process.exit(1); }
const aujourdhui = new Date().toISOString().slice(0, 10);
const { pages, ignorees } = await lirePages({ platforms, ids, F, aujourdhui });
for (const i of ignorees) console.log(`Ignorée : ${i.plateforme} ${i.url} : ${i.raison}`);
if (pages.length) writeFileSync(sortie, JSON.stringify({ date: aujourdhui, pages }));
console.log(`Relecture manuelle : ${pages.length} page(s) lue(s), ${ignorees.length} ignorée(s), pour ${ids.join(", ")}.`);
