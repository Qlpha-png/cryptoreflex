#!/usr/bin/env node
/**
 * scripts/revue-periodique.mjs — robot R14 « revue périodique » (lot Z6, 10/10/2026).
 *
 * Lit les dates « vérifié le » des données tenues à la main (familles H, scripts/lib/revue-periodique.mjs) et écrit, si des
 * éléments dépassent leur seuil, le corps d'un ticket PRIVÉ mensuel dans le fichier donné par --ticket=<chemin>.
 * Ne modifie aucun fichier du dépôt, ne fait aucune requête réseau. Code de sortie 0 (un retard n'est pas une panne).
 * Sorties GITHUB_OUTPUT : en_retard=<nombre>, total=<nombre>, titre=<titre du ticket>.
 *
 * Usage : node scripts/revue-periodique.mjs [--ticket=revue-periodique-ticket.md]
 */
import { appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { corpsRevue, elementsEnRetard, lireElements, titreRevue } from "./lib/revue-periodique.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const TICKET = process.argv.find((a) => a.startsWith("--ticket="))?.slice("--ticket=".length) ?? "";
const maintenant = Date.now();

const elements = lireElements(ROOT);
const retard = elementsEnRetard(elements, maintenant);
const corps = corpsRevue(retard, elements.length, maintenant);
const titre = titreRevue(maintenant);

console.log(`Revue périodique : ${elements.length} élément(s) passé(s) en revue, ${retard.length} au-delà de leur seuil.`);
if (corps) console.log(corps);
if (corps && TICKET) writeFileSync(TICKET, corps, "utf8");
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `en_retard=${retard.length}\ntotal=${elements.length}\ntitre=${titre}\n`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Revue périodique\n\n${retard.length} élément(s) sur ${elements.length} au-delà de leur seuil « vérifié le ».\n`);
