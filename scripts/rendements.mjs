#!/usr/bin/env node
/**
 * scripts/rendements.mjs — robot R8 « rendements » (lot Z5, 10/10/2026).
 *
 * Lit l'APR du stETH publié par Lido (affiché sur le site, avec sa date et sa source) et, pour le seul contrôle
 * interne, l'historique sur 7 jours d'Aave (USDC, DAI, marché principal) et l'APR de rETH publié par Rocket Pool.
 * Décision dans scripts/lib/rendements.mjs ; écrit data/rendements.json SEULEMENT si une donnée affichée change
 * (un commit = un déploiement). Les valeurs Aave et Rocket Pool ne sont jamais écrites dans le dépôt (public) ni dans
 * le résumé du run : seulement dans le fichier du ticket privé (--ticket=, hors dépôt).
 *
 * Sorties GitHub : changed=true|false, alerte=true|false.
 * Codes : 0 = passage normal (même avec alerte : l'étape finale du workflow le rend rouge) ;
 *         2 = toutes les sources en échec : rien n'est écrit, le fichier en place reste servi avec son âge.
 *
 * Usage : node scripts/rendements.mjs [--fixtures=<dossier>] [--enregistrer=<dossier>] [--aujourdhui=AAAA-MM-JJ]
 *         [--maintenant=ISO] [--sortie=<fichier json>] [--ticket=<fichier md>]
 * --fixtures : lit lido.json, aave-usdc.json, aave-dai.json, rocketpool.json (fichier absent = source muette).
 * Réseau : 4 requêtes espacées de 1,1 s (une reprise après 30 s par source). Zéro dépendance (Node ≥ 20).
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  AAVE_URL, CONTROLES, LIDO_URL, ROCKETPOOL_URL,
  analyserAave, analyserLido, analyserRocketPool, corpsTicket, deciderRendements, requeteAave,
} from "./lib/rendements.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (nom) => process.argv.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3);
const FICHIER = arg("sortie") ? path.resolve(arg("sortie")) : path.join(ROOT, "data", "rendements.json");
const TICKET = arg("ticket") ? path.resolve(arg("ticket")) : process.env.RENDEMENTS_TICKET || null;
const UA = "cryptoreflex-robot-rendements/1.0 (+https://www.cryptoreflex.fr)";
const PAUSE_MS = 1100;

const resume = (ligne) => {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, ligne + "\n");
  console.log(ligne);
};
const sortie = (cle, valeur) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${cle}=${valeur}\n`);
};
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/** Dernière version lisible de data/rendements.json dans les 10 derniers commits qui l'ont touché, ou null. */
function versionLisibleGit() {
  try {
    const commits = execFileSync("git", ["log", "-n", "10", "--format=%h", "--", "data/rendements.json"], { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().split("\n").filter(Boolean);
    for (const commit of commits) {
      try {
        const contenu = JSON.parse(execFileSync("git", ["show", `${commit}:data/rendements.json`], { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString());
        if (contenu?.lido) return { commit, contenu };
      } catch { /* version illisible : la précédente */ }
    }
  } catch { /* pas de dépôt git */ }
  return null;
}

/** Une requête JSON, une reprise après 30 s. Renvoie l'objet lu ou lève l'erreur. */
async function lireJson(url, corps) {
  let derniere;
  for (let essai = 0; essai < 2; essai++) {
    if (essai) await attendre(30_000);
    try {
      const res = await fetch(url, {
        method: corps ? "POST" : "GET",
        headers: { "user-agent": UA, accept: "application/json", ...(corps ? { "content-type": "application/json" } : {}) },
        body: corps ? JSON.stringify(corps) : undefined,
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) return await res.json();
      derniere = new Error(`HTTP ${res.status}`);
      await res.body?.cancel().catch(() => {});
    } catch (e) {
      derniere = e;
    }
  }
  throw derniere ?? new Error("réponse vide");
}

/** Lit les 4 sources (réseau ou fixtures). Renvoie { [nom]: json | { __erreur } }. */
async function lireSources() {
  const fixtures = arg("fixtures") ? path.resolve(arg("fixtures")) : null;
  const enregistrer = arg("enregistrer") ? path.resolve(arg("enregistrer")) : null;
  if (enregistrer) mkdirSync(enregistrer, { recursive: true });
  const demandes = [
    ["lido", LIDO_URL, null],
    ...CONTROLES.filter((c) => c.source === "aave").map((c) => [c.id, AAVE_URL, requeteAave(c.jeton)]),
    ["rocketpool", ROCKETPOOL_URL, null],
  ];
  const out = {};
  let premiere = true;
  for (const [nom, url, corps] of demandes) {
    if (fixtures) {
      const f = path.join(fixtures, `${nom}.json`);
      try { out[nom] = JSON.parse(readFileSync(f, "utf8")); } catch (e) { out[nom] = { __erreur: existsSync(f) ? "JSON illisible" : "fixture absente" }; }
      continue;
    }
    if (!premiere) await attendre(PAUSE_MS);
    premiere = false;
    try {
      out[nom] = await lireJson(url, corps);
      if (enregistrer) writeFileSync(path.join(enregistrer, `${nom}.json`), JSON.stringify(out[nom]));
    } catch (e) {
      out[nom] = { __erreur: String(e?.message ?? e).slice(0, 120) };
    }
  }
  return out;
}

async function main() {
  sortie("changed", "false");
  sortie("alerte", "false");
  const maintenant = arg("maintenant") ?? new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const aujourdhui = arg("aujourdhui") ?? maintenant.slice(0, 10);
  // Absent ≠ illisible (reprise Z5, piège P7) : un fichier illisible n'est JAMAIS traité comme un premier passage. La
  // référence du contrôle de variation est alors la dernière version lisible de l'historique git ; le fichier est
  // réécrit et une alerte part dans le ticket privé.
  let actuel = null;
  let opts = {};
  if (existsSync(FICHIER)) {
    try { actuel = JSON.parse(readFileSync(FICHIER, "utf8")); } catch {
      const ref = FICHIER === path.join(ROOT, "data", "rendements.json") ? versionLisibleGit() : null;
      actuel = ref?.contenu ?? null;
      opts = { illisible: true, reference: ref ? `la version du commit ${ref.commit}` : undefined };
    }
  }
  const bruts = await lireSources();
  const erreur = (b) => (b?.__erreur ? { erreur: `injoignable (${b.__erreur})` } : null);
  const lus = {
    lido: erreur(bruts.lido) ?? analyserLido(bruts.lido),
    controles: {},
  };
  const finJournee = Date.parse(`${aujourdhui}T23:59:59Z`);
  for (const c of CONTROLES) {
    const b = c.source === "aave" ? bruts[c.id] : bruts.rocketpool;
    const e = erreur(b);
    if (e) { lus.controles[c.id] = e; continue; }
    if (c.source === "aave") {
      const a = analyserAave(b, Math.min(finJournee, Date.parse(maintenant)));
      lus.controles[c.id] = a.erreur ? a : { valeurPct: a.medianePct, methode: `médiane de ${a.points} points horaires sur 7 jours` };
    } else {
      const r = analyserRocketPool(b);
      lus.controles[c.id] = r.erreur ? r : { valeurPct: r.valeurPct, methode: "APR publié par Rocket Pool" };
    }
  }
  const d = deciderRendements(actuel, lus, { aujourdhui, maintenant }, opts);
  resume(`${d.alertes.length ? "## ⚠️" : "##"} Rendements (R8) : ${d.ecrire ? "data/rendements.json mis à jour" : "rien à écrire"}`);
  for (const ligne of d.resume) resume(`- ${ligne}`);
  if (d.ecrire && d.contenu) {
    writeFileSync(FICHIER, JSON.stringify(d.contenu, null, 2) + "\n");
    sortie("changed", "true");
  }
  if (d.alertes.length) {
    sortie("alerte", "true");
    // le workflow ajoute l'adresse du run et la date au corps du ticket
    if (TICKET) writeFileSync(TICKET, corpsTicket(d, { aujourdhui }) + "\n");
  }
  if (d.codeSortie) {
    resume("Toutes les sources sont en échec : rien n'est écrit, le site garde le fichier en place avec son âge.");
    process.exit(d.codeSortie);
  }
}

main().catch((e) => {
  resume(`## ❌ Robot des rendements interrompu (${String(e?.message ?? e).slice(0, 160)})`);
  sortie("alerte", "true");
  process.exit(2);
});
