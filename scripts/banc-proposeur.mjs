#!/usr/bin/env node
/**
 * scripts/banc-proposeur.mjs — banc d'essai du proposeur R10 + de la fusion R11 (lot Z7, 10/10/2026).
 *
 * Rejoue les cas de tests/fixtures/proposeur/cas/*.json avec un client Gemini SIMULÉ (aucun appel réseau) qui reproduit des
 * comportements réels, dont des PIÈGES : chiffre inventé, citation reformulée, virgule ou point inversé, % au lieu de €,
 * deux lectures divergentes, JSON cassé, page vide, page sans chiffre, consigne cachée dans la page, quota épuisé, clé
 * invalide, panne. Les cas « reel-reconstitue » partent de VRAIS changements de frais de l'historique de data/platforms.json
 * (commit 6d1fdcbd du 05/10/2026 : fiche d'avant, relevé officiel d'après, URL officielle) ; leur page est reconstituée à partir
 * de la note de vérification du commit, pas copiée (le dépôt ne conserve pas le texte des pages).
 *
 * Deux garanties vérifiées sur CHAQUE cas, indépendamment du code testé :
 *   1. 0 valeur absente de la source acceptée : toute ligne « proposée » ou « confirmée » a une citation présente dans la page
 *      et une valeur présente dans cette citation (second contrôle, écrit ici à part) ;
 *   2. 0 fusion automatique fausse : « fusion-auto » seulement quand le cas l'attend, jamais avec une vérité différente.
 *
 * Usage :
 *   node scripts/banc-proposeur.mjs                 banc simulé (défaut) ; code de sortie 1 au moindre écart
 *   node scripts/banc-proposeur.mjs --filtre=s02    un sous-ensemble (sous-chaîne de l'identifiant)
 *   node scripts/banc-proposeur.mjs --reel [--max=20] [--filtre=r-]
 *       VRAI Gemini (offre gratuite, 2 appels par page, plafond de 50 par jour, donc 25 cas au plus, 20 par défaut). Exige
 *       GEMINI_API_KEY valide dans l'environnement (jamais imprimée) ; modèles : GEMINI_MODELES_A / GEMINI_MODELES_B (défaut :
 *       lecture A = gemini-flash-latest, lecture B = gemini-3.5-flash-lite, repli sur l'autre sur 404/503/429).
 *       Rejeu à la demande dans GitHub : workflow « Banc du proposeur » (workflow_dispatch, option réel). Ne rejoue que les cas de page (pas les pannes simulées).
 *       Les lectures scriptées sont ignorées : le modèle lit la page. Compare aux « verite » des cas ; mêmes deux garanties.
 *       DÉSACTIVÉ tant que la clé est invalide : le premier appel refusé arrête le banc (code 2) sans rien casser.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { decider, decisionPourChamps, lireMode } from "./lib/fusion-regles.mjs";
import { creerClientGemini } from "./lib/gemini-client.mjs";
import { ErreurGemini, corpsTicket, creerCompteur, lireModeles, proposerPlateforme, tauxRejet } from "./lib/proposeur.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DOSSIER_CAS = path.join(ROOT, "tests/fixtures/proposeur/cas");

export function chargerCas(dossier = DOSSIER_CAS) {
  return readdirSync(dossier).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(path.join(dossier, f), "utf8")));
}

/** Client Gemini simulé : renvoie les lectures scriptées dans l'ordre, ou lève l'erreur demandée à chaque appel. */
export function creerClientSimule(spec = {}) {
  let i = 0;
  return {
    async generer() {
      if (spec.erreur) throw new ErreurGemini(spec.erreur, `simulé : ${spec.erreur}`);
      const l = (spec.lectures || [])[i++];
      if (l === undefined) throw new ErreurGemini("panne", "simulé : plus aucune lecture scriptée");
      return typeof l === "string" ? l : JSON.stringify(l);
    },
  };
}

/** Exécute un cas : jugement, décision et ticket. `client` remplace le client simulé (mode --reel). */
export async function executerCas(cas, { client, plafond = 50, modeles } = {}) {
  if (cas.type === "decision") {
    const { mode, interrupteurFrais } = lireMode(cas.env ?? {});
    return { decision: decider({ famille: cas.famille, mode, interrupteurFrais, niveau: cas.niveau, testsVerts: cas.testsVerts }), resultat: null, ticket: false, appels: 0 };
  }
  const compteur = creerCompteur({ plafond, deja: cas.compteur?.deja ?? 0 });
  const resultat = await proposerPlateforme({ plateforme: cas.plateforme, pages: cas.pages, client: client ?? creerClientSimule(cas.client), compteur, ...(modeles ? { modeles } : {}) });
  const { decision } = decisionPourChamps(resultat.champs, cas.env ?? {}, cas.testsVerts ?? false);
  const ticket = corpsTicket({ date: "2026-10-10", resultats: [resultat], arret: resultat.arret, appels: compteur.utilises() }) !== "";
  return { resultat, decision, ticket, appels: compteur.utilises() };
}

/* ------------------------------------------------------------------ second contrôle, indépendant du code testé */
const plat = (s) => String(s).normalize("NFKC").replace(/[‘’ʼ]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
function formes(v) {
  const bases = new Set([String(v), (Math.round(v * 100) / 100).toFixed(2), (Math.round(v * 10) / 10).toFixed(1)]);
  return [...bases].flatMap((b) => [b, b.replace(".", ",")]);
}
/** La citation figure dans la page ET la valeur (avec sa virgule ou son point) figure dans la citation, comme nombre isolé. */
export function sourcePorteLaValeur(cas, ligne) {
  const textes = cas.pages.map((p) => plat(p.texte));
  const cit = plat(ligne.citation ?? "");
  if (!cit || !textes.some((t) => t.includes(cit))) return false;
  return formes(ligne.nouvelle ?? ligne.ancienne).some((f) => new RegExp(`(?<![\\d.,])${f.replace(/[.]/g, "\\.")}(?![\\d]|[.,]\\d)`).test(cit));
}

const sansAccent = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Écarts entre l'attendu (écrit à la main dans le cas) et l'obtenu. Liste vide = cas réussi. */
export function evaluerCas(cas, obtenu) {
  const att = cas.attendu;
  const ecarts = [];
  if (cas.type === "decision") {
    if (obtenu.decision.action !== att.action) ecarts.push(`action ${obtenu.decision.action} au lieu de ${att.action}`);
    if (obtenu.decision.fusionner !== att.fusionner) ecarts.push(`fusionner ${obtenu.decision.fusionner} au lieu de ${att.fusionner}`);
    return ecarts;
  }
  const r = obtenu.resultat;
  if ((r.arret ?? null) !== (att.arret ?? null)) ecarts.push(`arrêt ${r.arret} au lieu de ${att.arret}`);
  if (att.appels != null && obtenu.appels !== att.appels) ecarts.push(`${obtenu.appels} appel(s) au lieu de ${att.appels}`);
  if (att.pagesStatut && JSON.stringify(r.pages.map((p) => p.statut)) !== JSON.stringify(att.pagesStatut)) ecarts.push(`statuts de page ${r.pages.map((p) => p.statut)} au lieu de ${att.pagesStatut}`);
  for (const [champ, a] of Object.entries(att.champs ?? {})) {
    const o = r.champs.find((c) => c.champ === champ);
    if (!o) { ecarts.push(`${champ} : aucun jugement`); continue; }
    if (o.statut !== a.statut) ecarts.push(`${champ} : ${o.statut} au lieu de ${a.statut} (${o.raisons?.join(" ; ")})`);
    if (a.niveau && o.niveau !== a.niveau) ecarts.push(`${champ} : niveau ${o.niveau} au lieu de ${a.niveau}`);
    if (a.nouvelle != null && o.nouvelle !== a.nouvelle) ecarts.push(`${champ} : valeur ${o.nouvelle} au lieu de ${a.nouvelle}`);
    if (a.raison && !sansAccent((o.raisons || []).join(" ")).includes(sansAccent(a.raison))) ecarts.push(`${champ} : raison attendue « ${a.raison} », obtenue « ${(o.raisons || []).join(" ; ")} »`);
  }
  for (const o of r.champs) if (!(o.champ in (att.champs ?? {})) && o.statut !== "non-trouve") ecarts.push(`${o.champ} : jugement inattendu (${o.statut})`);
  const action = obtenu.decision ? obtenu.decision.action : null;
  if (action !== (att.action ?? null)) ecarts.push(`action ${action} au lieu de ${att.action ?? null}`);
  if (!!obtenu.decision?.fusionner !== !!att.fusionner) ecarts.push(`fusion ${!!obtenu.decision?.fusionner} au lieu de ${!!att.fusionner}`);
  if (att.ticket != null && obtenu.ticket !== att.ticket) ecarts.push(`ticket ${obtenu.ticket} au lieu de ${att.ticket}`);
  return ecarts;
}

/** Garanties transversales : { valeursAbsentesAcceptees, fusionsAutoFausses, automatiquesFaux }. */
export function garanties(cas, obtenu) {
  const g = { valeursAbsentesAcceptees: 0, fusionsAutoFausses: 0, automatiquesFaux: 0 };
  if (cas.type === "decision") return g;
  for (const c of obtenu.resultat.champs) {
    if ((c.statut === "propose" || c.statut === "identique") && !sourcePorteLaValeur(cas, c)) g.valeursAbsentesAcceptees++;
    const v = cas.verite?.[c.champ];
    if (c.statut === "propose" && c.niveau === "automatique" && v != null && Math.round(v * 100) !== Math.round(c.nouvelle * 100)) g.automatiquesFaux++;
  }
  if (obtenu.decision?.fusionner && (cas.attendu.action !== "fusion-auto" || g.automatiquesFaux || g.valeursAbsentesAcceptees)) g.fusionsAutoFausses++;
  return g;
}

const resume = (cas, o) => {
  if (cas.type === "decision") return `${o.decision.action}`;
  const abr = { propose: "P", identique: "=", rejete: "R", "non-trouve": "-" };
  const champs = o.resultat.champs.filter((c) => c.statut !== "non-trouve").map((c) => `${c.champ.replace(/^spot|^withdrawalFiat/, "").replace("instantBuy", "achat").toLowerCase()}:${abr[c.statut]}${c.niveau === "automatique" ? "a" : c.niveau === "a_relire" ? "r" : ""}`);
  return `${o.decision ? o.decision.action : o.resultat.arret ? `arrêt ${o.resultat.arret}` : "aucune action"}${champs.length ? ` [${champs.join(" ")}]` : ""}`;
};

/** Banc complet. @returns {{ lignes: object[], total: number, reussis: number, reels: number, totaux: object }} */
export async function lancerBanc({ dossier = DOSSIER_CAS, filtre = "" } = {}) {
  const cas = chargerCas(dossier).filter((c) => c.id.includes(filtre));
  const lignes = [];
  const totaux = { valeursAbsentesAcceptees: 0, fusionsAutoFausses: 0, automatiquesFaux: 0 };
  for (const c of cas) {
    const obtenu = await executerCas(c);
    const ecarts = evaluerCas(c, obtenu);
    const g = garanties(c, obtenu);
    for (const k of Object.keys(totaux)) totaux[k] += g[k];
    lignes.push({ id: c.id, origine: c.origine, resume: resume(c, obtenu), ecarts, garanties: g });
  }
  return { lignes, total: cas.length, reussis: lignes.filter((l) => !l.ecarts.length).length, reels: cas.filter((c) => c.origine === "reel-reconstitue").length, totaux };
}

/* ------------------------------------------------------------------ mode --reel (VRAI Gemini) */
async function banReel({ filtre, max }) {
  const cle = process.env.GEMINI_API_KEY;
  if (!cle) { console.error("GEMINI_API_KEY absente : le banc réel ne peut pas tourner. Voir l'en-tête de scripts/banc-proposeur.mjs."); return 2; }
  const client = creerClientGemini({ cle });
  const modeles = lireModeles(process.env);
  console.log(`Modèles : lecture A = ${modeles.A.join(" puis ")} ; lecture B = ${modeles.B.join(" puis ")}.`);
  const utilises = new Set();
  const resultatsReels = [];
  const cas = chargerCas().filter((c) => c.id.includes(filtre) && c.type === "extraction" && c.verite && !c.client?.erreur && !c.compteur?.deja && c.pages.every((p) => String(p.texte).length > 300) && c.pages.length === 1).slice(0, Math.min(max, 25));
  console.log(`Banc RÉEL : ${cas.length} cas, ${cas.length * 2} appels Gemini (plafond du jour : 50).`);
  const compteurGlobal = creerCompteur({ plafond: 50 });
  let faux = 0, absentes = 0, bonnes = 0, manquantes = 0, nbFusionsAuto = 0;
  for (const c of cas) {
    if (!compteurGlobal.prendre(2)) { console.log("Plafond de 50 appels atteint : arrêt."); break; }
    const obtenu = await executerCas({ ...c, compteur: { deja: 0 } }, { client, modeles });
    for (const m of obtenu.resultat.champs.flatMap((l) => l.modeles || [])) utilises.add(m);
    resultatsReels.push(obtenu.resultat);
    if (obtenu.resultat.arret === "cle_invalide") { console.error("Clé Gemini refusée : banc réel DÉSACTIVÉ tant qu'elle n'est pas remplacée (secret GEMINI_API_KEY, sonde « Sonde Gemini »)."); return 2; }
    if (obtenu.resultat.arret === "quota") { console.error("Quota Gemini atteint : arrêt."); return 2; }
    const g = garanties(c, obtenu);
    absentes += g.valeursAbsentesAcceptees;
    if (obtenu.decision?.fusionner) nbFusionsAuto++;
    for (const l of obtenu.resultat.champs) {
      const v = c.verite[l.champ];
      if (v == null) continue;
      if (l.statut === "propose" || l.statut === "identique") { if (Math.round((l.nouvelle ?? l.ancienne) * 100) === Math.round(v * 100)) bonnes++; else faux++; }
      else manquantes++;
    }
    console.log(`${c.id.padEnd(40)} ${resume(c, obtenu)}`);
  }
  const st = tauxRejet(resultatsReels);
  console.log(`\nModèles réellement utilisés : ${[...utilises].join(", ") || "aucun"}. Taux de rejet : ${st.rejetes} / ${st.juges} lignes jugées${st.anormal ? " (ANORMAL)" : ""}. Les cas pièges (citation multi-chiffres, libellé absent) en produisent légitimement une part : comparer d'un rejeu à l'autre.`);
  console.log(`\nRÉEL : ${bonnes} valeur(s) juste(s) acceptée(s), ${faux} valeur(s) FAUSSE(s) acceptée(s) (objectif 0), ${absentes} absente(s) de la source acceptée(s) (objectif 0), ${manquantes} non retrouvée(s) ou rejetée(s), ${nbFusionsAuto} fusion(s) automatique(s).`);
  return faux || absentes ? 1 : 0;
}

/* ------------------------------------------------------------------ ligne de commande */
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const arg = (nom, defaut = "") => { const a = process.argv.slice(2).find((x) => x.startsWith(`--${nom}=`)); return a ? a.slice(nom.length + 3) : defaut; };
  const filtre = arg("filtre");
  if (process.argv.includes("--reel")) process.exit(await banReel({ filtre, max: Number(arg("max", "20")) || 20 }));
  const b = await lancerBanc({ filtre });
  const trouve = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n));
  console.log(`${trouve("cas", 52)} ${trouve("origine", 10)} ${trouve("obtenu", 62)} verdict`);
  for (const l of b.lignes) console.log(`${trouve(l.id, 52)} ${trouve(l.origine.replace("reel-reconstitue", "réel"), 10)} ${trouve(l.resume, 62)} ${l.ecarts.length ? "ÉCART : " + l.ecarts.join(" | ") : "ok"}`);
  console.log(`\n${b.reussis} / ${b.total} cas conformes (dont ${b.reels} cas tirés de vraies grilles). Valeurs absentes de la source acceptées : ${b.totaux.valeursAbsentesAcceptees}. Fusions automatiques fausses : ${b.totaux.fusionsAutoFausses}. Propositions automatiques différentes de la vérité : ${b.totaux.automatiquesFaux}.`);
  process.exit(b.reussis === b.total && !b.totaux.valeursAbsentesAcceptees && !b.totaux.fusionsAutoFausses && !b.totaux.automatiquesFaux ? 0 : 1);
}
