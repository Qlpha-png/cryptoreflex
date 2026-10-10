#!/usr/bin/env node
/**
 * scripts/fx-bce.mjs — robot R6 « taux BCE » (lot Z4, 10/10/2026).
 *
 * Lit https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml, contrôle la publication (scripts/lib/fx-bce.mjs)
 * et écrit data/fx-bce.json SEULEMENT si la date ou les valeurs changent (un commit = un déploiement : rien n'est écrit
 * pour un simple passage sans nouveauté, ni le week-end). Le site lit ce fichier partout où un taux USD↔EUR sert
 * (lib/fx-bce.ts, lib/fx.ts).
 *
 * Sorties GitHub : changed=true|false, alerte=true|false (ticket privé dans .github/workflows/fx-bce.yml).
 * Codes : 0 = passage normal (même avec alerte de variation : l'étape finale du workflow le rend rouge) ;
 *         2 = source injoignable ou structure changée : rien n'est écrit, le fichier en place reste servi avec son âge.
 *
 * Usage : node scripts/fx-bce.mjs [--xml=<fichier>] [--aujourdhui=AAAA-MM-JJ] [--sortie=<fichier json>]
 * Une requête (une seule reprise après 30 s) : bien en dessous d'une requête par seconde. Zéro dépendance (Node ≥ 20).
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BCE_URL, analyserXmlBce, deciderFx } from "./lib/fx-bce.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (nom) => process.argv.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3);
const FICHIER = arg("sortie") ? path.resolve(arg("sortie")) : path.join(ROOT, "data", "fx-bce.json");
const UA = "cryptoreflex-robot-fx-bce/1.0 (+https://www.cryptoreflex.fr)";

const resume = (ligne) => {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, ligne + "\n");
  console.log(ligne);
};
const sortie = (cle, valeur) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${cle}=${valeur}\n`);
};

async function lireXml() {
  const fichier = arg("xml");
  if (fichier) return { xml: readFileSync(path.resolve(fichier), "utf8"), lastModified: null };
  let derniere;
  for (let essai = 0; essai < 2; essai++) {
    if (essai) await new Promise((r) => setTimeout(r, 30_000));
    try {
      const res = await fetch(BCE_URL, { headers: { "user-agent": UA, accept: "text/xml,application/xml" }, signal: AbortSignal.timeout(20_000) });
      if (res.ok) return { xml: await res.text(), lastModified: res.headers.get("last-modified") };
      derniere = new Error(`HTTP ${res.status}`);
      await res.body?.cancel().catch(() => {});
    } catch (e) {
      derniere = e;
    }
  }
  throw derniere ?? new Error("réponse vide");
}

const jourUtc = (d = new Date()) => d.toISOString().slice(0, 10);

async function main() {
  sortie("changed", "false");
  sortie("alerte", "false");
  let actuel = null;
  if (existsSync(FICHIER)) {
    try { actuel = JSON.parse(readFileSync(FICHIER, "utf8")); } catch { actuel = null; }
  }
  let lu;
  try {
    const { xml, lastModified } = await lireXml();
    const a = analyserXmlBce(xml);
    if (a.erreur) {
      resume(`## ❌ Taux BCE : structure inattendue (${a.erreur})`);
      resume("Rien n'est écrit : le site garde le fichier en place, avec son âge affiché.");
      sortie("alerte", "true");
      process.exit(2);
    }
    lu = { ...a, lastModified };
  } catch (e) {
    resume(`## ❌ Taux BCE injoignable (${String(e?.message ?? e).slice(0, 120)})`);
    resume("Rien n'est écrit : le site garde le fichier en place, avec son âge affiché.");
    sortie("alerte", "true");
    process.exit(2);
  }
  const maintenant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const d = deciderFx(actuel, { date: lu.date, parEuro: lu.parEuro }, { aujourdhui: arg("aujourdhui") ?? jourUtc(), maintenant, lastModified: lu.lastModified });
  resume(`${d.alerte ? "## ⚠️" : "##"} Taux BCE : ${d.message}`);
  if (d.ecrire && d.contenu) {
    writeFileSync(FICHIER, JSON.stringify(d.contenu, null, 2) + "\n");
    sortie("changed", "true");
  }
  if (d.alerte) sortie("alerte", "true");
}

main().catch((e) => {
  resume(`## ❌ Robot taux BCE interrompu (${String(e?.message ?? e).slice(0, 160)})`);
  sortie("alerte", "true");
  process.exit(2);
});
