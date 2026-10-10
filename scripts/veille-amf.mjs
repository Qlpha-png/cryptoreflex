#!/usr/bin/env node
/**
 * scripts/veille-amf.mjs — listes de l'AMF, étape de la veille de nuit R5 (lot Z4, 10/10/2026). Lancé par
 * .github/workflows/veille-officielle.yml après la veille, sur le même passage (pas de nouveau robot).
 *
 * 1. Liste blanche (data.gouv.fr, adresse stable) : format exact (19 colonnes), au moins 1 000 lignes, au plus 10 % de lignes
 *    en moins, écart des entités autorisées de moins de 10 % ; sinon RIEN n'est écrit (le site garde la donnée en place,
 *    avec sa date) et un ticket privé est ouvert. Sinon : data/psan-registry.json reçoit SEULEMENT des champs machine
 *    (_meta.amf, et « amf » sur chaque fiche rapprochée) ; les fiches éditoriales (notes, alias, passeports) ne sont pas
 *    touchées. Les numéros AMF affichés par le site sont contrôlés (absent ou sans autorisation en vigueur = ticket).
 * 2. Liste noire : lue en mémoire, comparée aux domaines officiels et marques des plateformes suivies ; une
 *    correspondance part dans un fichier d'alertes (jamais commité) que l'étape suivante transmet au dépôt PRIVÉ. Dans le
 *    dépôt public, seuls le nombre de lignes, la date maximale et la date du contrôle sont écrits. Aucun e-mail, jamais.
 *
 * 3. Recul (reprise Z4) : une liste blanche dont la date de publication recule, ou une liste noire dont l'inscription la
 *    plus récente recule (ancien export), est refusée comme un format changé : rien n'est écrit, la date du contrôle
 *    n'avance pas, alerte.
 *
 * Le rapport (console, GITHUB_STEP_SUMMARY : publics) ne contient que des décomptes ; chaque ligne passe par le même
 * garde-fou e-mail / téléphone que le fichier écrit.
 * Sorties GitHub : changed=true|false, alerte=true|false. Code 1 si une liste est refusée (format, volume, recul,
 * injoignable) ou si un numéro AMF affiché est en écart ; une simple correspondance de liste noire = ticket seul.
 *
 * Usage : node scripts/veille-amf.mjs [--blanche=<csv>] [--noire=<csv>] [--aujourdhui=AAAA-MM-JJ] [--registre=<json>]
 *         [--alertes=<json>]   (fichiers locaux = rejeu sans réseau)
 * Deux requêtes, espacées d'au moins une seconde. Zéro dépendance (Node ≥ 20).
 */
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AMF_BLANCHE_URL, AMF_NOIRE_URL, AMF_BLANCHE_JEU, analyserBlanche, analyserNoire, contientDonneePersonnelle, controlerActifs,
  controlerRecul, controlerVolume, detecterListeNoire, domainesFiche, domaineDe, marquesFiche, numerosEnEcart, rapprocher,
} from "./lib/amf-listes.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (nom) => process.argv.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3);
const REGISTRE = arg("registre") ? path.resolve(arg("registre")) : path.join(ROOT, "data", "psan-registry.json");
const PLATEFORMES = path.join(ROOT, "data", "platforms.json");
const ALERTES = arg("alertes") ? path.resolve(arg("alertes")) : path.join(ROOT, "veille-amf-alertes.json");
const UA = "cryptoreflex-veille-amf/1.0 (+https://www.cryptoreflex.fr)";
/* marques de moins de 4 lettres, déclarées à la main */
const MARQUES_EXTRA = { okx: ["okx"] };

const resume = (brut) => {
  // résumé PUBLIC : jamais d'adresse e-mail ni de téléphone, même recopiés par erreur dans un message
  const ligne = contientDonneePersonnelle(brut) ? "- ❌ AMF : ligne de rapport masquée (donnée personnelle détectée)" : brut;
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, ligne + "\n");
  console.log(ligne);
};
const sortie = (cle, valeur) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${cle}=${valeur}\n`);
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function lire(url, fichier) {
  if (fichier) return { texte: readFileSync(path.resolve(fichier), "utf8"), lastModified: null };
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/csv,*/*" }, redirect: "follow", signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    await res.body?.cancel().catch(() => {});
    throw new Error(`HTTP ${res.status}`);
  }
  return { texte: await res.text(), lastModified: res.headers.get("last-modified") };
}

async function main() {
  sortie("changed", "false");
  sortie("alerte", "false");
  const aujourdhui = arg("aujourdhui") ?? new Date().toISOString().slice(0, 10);
  const brut = readFileSync(REGISTRE, "utf8");
  const reg = JSON.parse(brut);
  const prec = reg._meta?.amf ?? null;
  const alertes = { date: aujourdhui, blanche: [], numeros: [], noire: [] };
  let alerte = false;

  /* ---------------- liste blanche */
  let blanche = null;
  try {
    const { texte, lastModified } = await lire(AMF_BLANCHE_URL, arg("blanche"));
    const a = analyserBlanche(texte);
    if (a.erreur) {
      alertes.blanche.push(`format : ${a.erreur}`);
      resume(`- ❌ AMF, liste blanche : format refusé (${a.erreur}) ; donnée en place gardée`);
    } else {
      const v = controlerVolume(prec, a, "lignes");
      const act = controlerActifs(prec, a);
      const rec = controlerRecul(prec, a, "publication");
      if (!v.ok || !act.ok || !rec.ok) {
        const raisons = [v.raison, act.raison, rec.raison].filter(Boolean);
        for (const r of raisons) alertes.blanche.push(r);
        resume(`- ❌ AMF, liste blanche refusée (${raisons.join(" ; ")}) ; donnée en place gardée`);
      } else {
        blanche = { ...a, lastModified };
      }
    }
  } catch (e) {
    alertes.blanche.push(`injoignable (${String(e?.message ?? e).slice(0, 80)})`);
    resume(`- ❌ AMF, liste blanche injoignable (${String(e?.message ?? e).slice(0, 80)}) ; donnée en place gardée`);
  }

  if (!arg("blanche") || !arg("noire")) await pause(1200);

  /* ---------------- liste noire (mémoire seulement) */
  let noire = null;
  try {
    const { texte, lastModified } = await lire(AMF_NOIRE_URL, arg("noire"));
    const n = analyserNoire(texte);
    if (n.erreur) {
      resume(`- ❌ AMF, liste noire : format refusé (${n.erreur})`);
      alertes.noire.push({ type: "format", detail: n.erreur });
    } else {
      const v = controlerVolume(prec?.listeNoire, n, "lignes");
      const rec = controlerRecul(prec?.listeNoire, n, "inscriptionMax");
      if (!v.ok) {
        resume(`- ❌ AMF, liste noire : volume refusé (${v.raison})`);
        alertes.noire.push({ type: "volume", detail: v.raison });
      } else if (!rec.ok) {
        // ancien export : la date du contrôle n'avance pas (le registre de fraîcheur, famille 18b, le verra)
        resume(`- ❌ AMF, liste noire refusée (${rec.raison})`);
        alertes.noire.push({ type: "recul", detail: rec.raison });
      } else noire = { ...n, lastModified };
    }
  } catch (e) {
    resume(`- ❌ AMF, liste noire injoignable (${String(e?.message ?? e).slice(0, 80)})`);
    alertes.noire.push({ type: "injoignable", detail: String(e?.message ?? e).slice(0, 80) });
  }

  /* ---------------- écriture des champs machine de data/psan-registry.json */
  const meta = { ...(reg._meta ?? {}) };
  const amf = { ...(prec ?? {}) };
  if (blanche) {
    let rapprochees = 0;
    for (const f of reg.platforms) {
      const r = rapprocher(f, blanche.autorisations);
      if (r) {
        f.amf = { noAmf: r.noAmf, passeport: r.passeport, entite: r.nom, nature: r.nature, statut: r.statut, debut: r.debut, rapprochement: r.par, controle: aujourdhui };
        rapprochees++;
      } else if (f.amf) delete f.amf;
    }
    alertes.numeros = numerosEnEcart(reg.platforms, blanche.autorisations);
    for (const n of alertes.numeros) resume(`- ❌ AMF : numéro affiché par le site en écart (${n.id})`);
    Object.assign(amf, {
      source: "AMF, liste blanche des prestataires sur crypto-actifs (data.gouv.fr, Licence Ouverte 2.0)",
      url: AMF_BLANCHE_JEU,
      ressource: AMF_BLANCHE_URL,
      publication: blanche.publication,
      lastModified: blanche.lastModified ?? null,
      controle: aujourdhui,
      lignes: blanche.lignes,
      entitesActives: blanche.entitesActives,
      autorisationsActives: blanche.autorisationsActives,
      fichesRapprochees: rapprochees,
    });
    resume(`- ✅ AMF, liste blanche du ${blanche.publication} : ${blanche.lignes} lignes, ${blanche.entitesActives} entités autorisées, ${rapprochees} fiche(s) rapprochée(s)`);
  }

  if (noire) {
    const plateformes = JSON.parse(readFileSync(PLATEFORMES, "utf8")).platforms ?? [];
    const parId = new Map();
    for (const f of reg.platforms) parId.set(f.id, { id: f.id, nom: f.name, domaines: new Set(domainesFiche(f)), marques: new Set(marquesFiche(f, MARQUES_EXTRA[f.id] ?? [])), autorisee: f.micaStatus === "authorized" });
    for (const p of plateformes) {
      if (p.category === "wallet") continue;
      const c = parId.get(p.id) ?? { id: p.id, nom: p.name, domaines: new Set(), marques: new Set(), autorisee: false };
      const d = domaineDe(p.websiteUrl);
      if (d) c.domaines.add(d);
      for (const m of marquesFiche({ websiteUrl: p.websiteUrl }, MARQUES_EXTRA[p.id] ?? [])) c.marques.add(m);
      if (p.mica?.micaCompliant === true) c.autorisee = true;
      parId.set(p.id, c);
    }
    const cibles = [...parId.values()].map((c) => ({ ...c, domaines: [...c.domaines], marques: [...c.marques] }));
    alertes.noire.push(...detecterListeNoire(noire.entrees, cibles, aujourdhui));
    amf.listeNoire = { lastModified: noire.lastModified ?? null, lignes: noire.lignes, inscriptionMax: noire.inscriptionMax, controle: aujourdhui };
    const urgentes = alertes.noire.filter((x) => x.urgent).length;
    resume(`- ${urgentes ? "❌" : "✅"} AMF, liste noire : ${noire.lignes} lignes lues ; ${alertes.noire.length} correspondance(s) avec les plateformes suivies, dont ${urgentes} urgente(s) (détail : ticket privé uniquement)`);
  }

  if (blanche || noire) {
    meta.amf = amf;
    reg._meta = meta;
    const texte = JSON.stringify(reg, null, 2) + "\n";
    // garde-fou du dépôt public : aucune adresse e-mail ni téléphone ne doit entrer dans le fichier commité
    if (contientDonneePersonnelle(texte)) {
      resume("- ❌ AMF : donnée personnelle détectée dans la sortie, rien n'est écrit");
      alertes.blanche.push("donnée personnelle détectée dans la sortie : écriture refusée");
    } else if (texte !== brut) {
      writeFileSync(REGISTRE, texte);
      sortie("changed", "true");
    }
  }

  alerte = alertes.blanche.length > 0 || alertes.numeros.length > 0 || alertes.noire.length > 0;
  writeFileSync(ALERTES, JSON.stringify(alertes, null, 2) + "\n");
  if (alerte) sortie("alerte", "true");
  // rouge : une liste refusée (format, volume, recul, injoignable) ou un numéro affiché en écart ; une correspondance de
  // la liste noire avec une plateforme (champ « plateforme ») reste un ticket privé seul
  if (alertes.blanche.length || alertes.numeros.length || alertes.noire.some((x) => !x.plateforme)) process.exitCode = 1;
}

main().catch((e) => {
  resume(`- ❌ Veille AMF interrompue (${String(e?.message ?? e).slice(0, 160)})`);
  sortie("alerte", "true");
  process.exit(2);
});
