/**
 * scripts/lib/amf-listes.mjs — listes de l'AMF dans la veille de nuit R5 (lot Z4, 10/10/2026) : fonctions pures, testées sans
 * réseau (tests/lib/amf-listes.test.ts). Zéro dépendance.
 *
 * Sources (data.gouv.fr, Licence Ouverte 2.0, producteur AMF, architecture § 1.1, S5) — adresses STABLES de ressource
 * (le nom du fichier final change à chaque export ; une recherche data.gouv ne trouve pas ces jeux par leurs noms) :
 *  - liste blanche des prestataires sur crypto-actifs : ressource e03f8899-2499-4826-aaae-6842f520bdac ;
 *  - listes noires des entités non autorisées : ressource d2d9df6d-1cd2-41a8-96f5-684cb3057ecb.
 *
 * DONNÉES PERSONNELLES (dépôt PUBLIC) :
 *  - liste blanche : les colonnes email et telephone ne sont JAMAIS lues dans les sorties (ni forme_juridique, toujours vide) ;
 *  - liste noire : elle contient des adresses e-mail et des noms de personnes. Elle est lue en mémoire seulement : rien
 *    n'est écrit dans le dépôt (ni en clair ni en empreinte nom par nom), seulement son nombre de lignes, sa date maximale
 *    et la date du contrôle. Une correspondance avec une plateforme suivie part dans un ticket PRIVÉ ; d'une adresse
 *    e-mail, seul le domaine est gardé.
 */

export const AMF_BLANCHE_URL = "https://www.data.gouv.fr/fr/datasets/r/e03f8899-2499-4826-aaae-6842f520bdac";
export const AMF_NOIRE_URL = "https://www.data.gouv.fr/fr/datasets/r/d2d9df6d-1cd2-41a8-96f5-684cb3057ecb";
export const AMF_BLANCHE_JEU = "https://www.data.gouv.fr/datasets/653135cf052c9a87787413c2";
export const AMF_NOIRE_JEU = "https://www.data.gouv.fr/datasets/641d5dab1d84b530f7720b08";

export const ENTETE_BLANCHE = [
  "no_amf", "entite_nom", "forme_juridique", "pays_siege", "site_internet", "email", "telephone", "no_registre_national", "lei",
  "nature_autorisation", "date_debut_autorisation", "date_fin_autorisation", "motif_fin_autorisation", "statut",
  "libelle_type_activite", "libelle_activite", "date_debut_activite", "date_fin_activite", "date_de_publication",
];
export const ENTETE_NOIRE = ["nom", "categorie", "date_inscription"];

/* planchers mesurés le 10/10/2026 : liste blanche 1 151 lignes, liste noire 3 484 lignes ; un export tronqué est refusé */
export const PLANCHER_BLANCHE = 1000;
export const PLANCHER_NOIRE = 3000;
export const BAISSE_MAX = 0.1; // au plus 10 % de lignes ou d'entités actives en moins d'un passage à l'autre
export const ECART_ACTIFS_MAX = 0.1;
/* fenêtre des inscriptions récentes de la liste noire signalées par ticket (les plus anciennes ont déjà été vues) */
export const FENETRE_NOIRE_JOURS = 45;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** CSV « ; » avec guillemets (doublés pour échapper), BOM toléré, fins de ligne LF ou CRLF. Renvoie des lignes de champs. */
export function analyserCsv(texte) {
  const t = String(texte ?? "").replace(/^﻿/, "");
  const lignes = [];
  let ligne = [];
  let champ = "";
  let entre = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (entre) {
      if (c === '"' && t[i + 1] === '"') { champ += '"'; i++; } else if (c === '"') entre = false; else champ += c;
    } else if (c === '"') entre = true;
    else if (c === ";") { ligne.push(champ); champ = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      ligne.push(champ); lignes.push(ligne); ligne = []; champ = "";
    } else champ += c;
  }
  if (champ || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  return lignes.filter((l) => l.some((x) => x.trim() !== ""));
}

/** Nom de domaine seul (sans www.), en minuscules ; "" si illisible. */
export function domaineDe(u) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  try {
    return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Liste blanche : contrôle de format et extraction SANS donnée personnelle.
 * Renvoie { erreur } ou { lignes, publication, autorisations, entitesActives, autorisationsActives }.
 */
export function analyserBlanche(texte) {
  const lignes = analyserCsv(texte);
  if (!lignes.length) return { erreur: "fichier vide" };
  const entete = lignes[0].map((x) => x.trim());
  if (entete.join(";") !== ENTETE_BLANCHE.join(";")) return { erreur: `en-tête inattendu (${entete.length} colonnes : ${entete.slice(0, 6).join(", ")}…)` };
  const corps = lignes.slice(1);
  const bancales = corps.filter((l) => l.length !== ENTETE_BLANCHE.length).length;
  if (bancales) return { erreur: `${bancales} ligne(s) sans les ${ENTETE_BLANCHE.length} colonnes` };
  if (corps.length < PLANCHER_BLANCHE) return { erreur: `${corps.length} lignes seulement (au moins ${PLANCHER_BLANCHE} attendues)` };
  const idx = Object.fromEntries(ENTETE_BLANCHE.map((k, i) => [k, i]));
  const pubs = new Set(corps.map((l) => l[idx.date_de_publication].trim()).filter(Boolean));
  if (pubs.size !== 1) return { erreur: `${pubs.size} dates de publication différentes (une seule attendue)` };
  const publication = [...pubs][0];
  // jamais la valeur de la cellule dans le message : il part dans le résumé PUBLIC du run (une cellule décalée peut
  // contenir une adresse e-mail ou un téléphone) ; seul le numéro de ligne est donné
  if (!ISO.test(publication)) return { erreur: "date de publication illisible (format AAAA-MM-JJ attendu)" };
  for (const [i, l] of corps.entries()) {
    for (const k of ["date_debut_autorisation", "date_fin_autorisation", "date_debut_activite", "date_fin_activite"]) {
      const v = l[idx[k]].trim();
      if (v && !ISO.test(v)) return { erreur: `date illisible dans ${k} (ligne ${i + 2})` };
    }
  }
  // une entrée par autorisation (numéro AMF × entité × nature), activités regroupées ; e-mail et téléphone jamais lus
  const parCle = new Map();
  for (const l of corps) {
    const g = (k) => l[idx[k]].trim();
    const noAmf = g("no_amf");
    const passeport = /^N\/A/i.test(noAmf);
    const cle = `${noAmf}|${g("entite_nom")}|${g("nature_autorisation")}|${g("date_debut_autorisation")}`;
    let a = parCle.get(cle);
    if (!a) {
      a = {
        noAmf: passeport ? null : noAmf,
        passeport,
        nom: g("entite_nom"),
        pays: g("pays_siege"),
        domaine: domaineDe(g("site_internet")),
        lei: g("lei") || null,
        nature: g("nature_autorisation"),
        statut: g("statut"),
        debut: g("date_debut_autorisation") || null,
        fin: g("date_fin_autorisation") || null,
        activites: [],
      };
      parCle.set(cle, a);
    }
    const act = g("libelle_activite");
    if (act && !a.activites.includes(act)) a.activites.push(act);
  }
  const autorisations = [...parCle.values()];
  const actives = autorisations.filter(estActive);
  return {
    lignes: corps.length,
    publication,
    autorisations,
    entitesActives: new Set(actives.map((a) => a.nom)).size,
    autorisationsActives: actives.length,
  };
}

/** Autorisation en vigueur : statut « Agréé » et aucune date de fin. */
export function estActive(a) {
  return a.statut === "Agréé" && !a.fin;
}

/** Liste noire : contrôle de format ; les lignes restent en mémoire (jamais écrites). */
export function analyserNoire(texte) {
  const lignes = analyserCsv(texte);
  if (!lignes.length) return { erreur: "fichier vide" };
  const entete = lignes[0].map((x) => x.trim());
  if (entete.join(";") !== ENTETE_NOIRE.join(";")) return { erreur: `en-tête inattendu (${entete.length} colonnes)` };
  const corps = lignes.slice(1);
  const bancales = corps.filter((l) => l.length !== 3).length;
  if (bancales) return { erreur: `${bancales} ligne(s) sans 3 colonnes` };
  if (corps.length < PLANCHER_NOIRE) return { erreur: `${corps.length} lignes seulement (au moins ${PLANCHER_NOIRE} attendues)` };
  let max = "";
  const entrees = [];
  for (const [i, l] of corps.entries()) {
    const date = l[2].trim();
    if (date && !ISO.test(date)) return { erreur: `date d'inscription illisible (ligne ${i + 2})` };
    if (date > max) max = date;
    entrees.push({ nom: l[0].trim(), categorie: l[1].trim(), date });
  }
  return { lignes: corps.length, inscriptionMax: max || null, entrees };
}

/** Contrôle de volume entre deux passages : { ok, raison }. */
export function controlerVolume(precedent, actuel, cle, max = BAISSE_MAX) {
  const avant = Number(precedent?.[cle]);
  const apres = Number(actuel?.[cle]);
  if (!Number.isFinite(avant) || avant <= 0) return { ok: true, raison: null };
  const ecart = (apres - avant) / avant;
  if (ecart < -max) return { ok: false, raison: `${cle} : ${apres} contre ${avant} au passage précédent (${Math.round(ecart * 100)} %, au plus −${Math.round(max * 100)} %)` };
  return { ok: true, raison: null };
}

/**
 * Recul entre deux passages (ancien export servi par un cache ou un miroir) : { ok, raison }. Dates ISO comparées en
 * texte. Liste blanche : date de publication ; liste noire : date d'inscription la plus récente (un ancien export ferait
 * disparaître les inscriptions récentes que la fenêtre de détection cherche).
 */
export function controlerRecul(precedent, actuel, cle) {
  const avant = precedent?.[cle];
  const apres = actuel?.[cle];
  if (!ISO.test(String(avant ?? "")) || !ISO.test(String(apres ?? ""))) return { ok: true, raison: null };
  if (apres < avant) return { ok: false, raison: `${cle} : ${apres}, antérieure à celle du passage précédent (${avant}) ; ancien export refusé` };
  return { ok: true, raison: null };
}

/** Écart des entités actives (dans les deux sens). */
export function controlerActifs(precedent, actuel) {
  const avant = Number(precedent?.entitesActives);
  if (!Number.isFinite(avant) || avant <= 0) return { ok: true, raison: null };
  const e = Math.abs(actuel.entitesActives - avant) / avant;
  if (e >= ECART_ACTIFS_MAX) return { ok: false, raison: `entités autorisées : ${actuel.entitesActives} contre ${avant} au passage précédent (écart de ${Math.round(e * 100)} %, moins de ${Math.round(ECART_ACTIFS_MAX * 100)} % attendu)` };
  return { ok: true, raison: null };
}

const simple = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const memeDomaine = (a, b) => !!a && !!b && (a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`));

/** Domaines officiels d'une fiche de data/psan-registry.json (websiteUrl + alias de forme domaine). */
export function domainesFiche(f) {
  const ds = new Set();
  const d = domaineDe(f?.websiteUrl);
  if (d) ds.add(d);
  for (const a of f?.aliases ?? []) if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(String(a).trim())) ds.add(domaineDe(a));
  return [...ds].filter(Boolean);
}

/**
 * Rapprochement d'une fiche avec la liste blanche (prudent : numéro AMF, puis domaine, puis nom légal exact simplifié ;
 * jamais un mot du nom). Renvoie l'autorisation ACTIVE trouvée, ou null.
 */
export function rapprocher(fiche, autorisations) {
  const actives = autorisations.filter(estActive);
  if (fiche?.amfRegistration) {
    const a = actives.find((x) => x.noAmf === fiche.amfRegistration);
    if (a) return { ...a, par: "numero" };
  }
  const doms = domainesFiche(fiche);
  const parDom = actives.find((x) => doms.some((d) => memeDomaine(d, x.domaine)));
  if (parDom) return { ...parDom, par: "domaine" };
  const nom = simple(fiche?.legalEntity);
  if (nom) {
    const parNom = actives.find((x) => simple(x.nom) === nom);
    if (parNom) return { ...parNom, par: "nom" };
  }
  return null;
}

/** Numéros AMF affichés par le site absents ou non actifs dans la liste blanche (contrôle bloquant pour un ticket). */
export function numerosEnEcart(fiches, autorisations) {
  const out = [];
  for (const f of fiches) {
    if (!f?.amfRegistration) continue;
    const toutes = autorisations.filter((a) => a.noAmf === f.amfRegistration);
    if (!toutes.length) out.push({ id: f.id, numero: f.amfRegistration, raison: "numéro absent de la liste blanche" });
    else if (!toutes.some(estActive)) out.push({ id: f.id, numero: f.amfRegistration, raison: "numéro présent mais sans autorisation en vigueur" });
  }
  return out;
}

/* mots trop génériques pour servir de marque (faux positifs mesurés le 10/10/2026 : « trade » > 30, « crypto » > 60) */
export const MOTS_GENERIQUES = new Set(["crypto", "trade", "trading", "blockchain", "bit", "exchange", "invest", "coin", "coins", "delta", "young", "app", "online", "finance", "capital", "markets", "global", "pay", "bank", "wallet", "mining", "direct", "platform"]);

/** Marques distinctives d'une fiche : libellé principal de ses domaines (au moins 4 lettres, hors mots génériques) + marques déclarées. */
export function marquesFiche(f, extra = []) {
  const ms = new Set(extra.map((x) => x.toLowerCase()));
  for (const d of domainesFiche(f)) {
    const parts = d.split(".");
    const principal = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    for (const m of [principal, principal.replace(/-app$/, "")]) if (m.length >= 4 && !MOTS_GENERIQUES.has(m)) ms.add(m);
  }
  return [...ms];
}

/** Domaine d'une inscription de la liste noire (adresse web, ou domaine d'une adresse e-mail ; partie locale ignorée). */
export function domaineInscription(nom) {
  const s = String(nom ?? "").trim();
  const at = s.lastIndexOf("@");
  if (at > 0) return { domaine: domaineDe(s.slice(at + 1)), courriel: true };
  if (/\s/.test(s) || !/\./.test(s)) return { domaine: "", courriel: false }; // nom d'acteur : jamais comparé
  return { domaine: domaineDe(s), courriel: false };
}

/**
 * Liste noire × plateformes suivies. Règles (architecture § 4, n° 18b) :
 *  1. domaine exact ou sous-domaine d'un domaine officiel → « domaine-officiel » (urgent si la plateforme est présentée comme
 *     autorisée) ;
 *  2. marque distinctive dans les libellés du domaine d'une inscription récente → « usurpation » (une usurpation n'est pas une
 *     interdiction : rien ne change sur le site).
 * - entrees     lignes de la liste noire (en mémoire)
 * - cibles      [{ id, nom, domaines: string[], marques: string[], autorisee: boolean }]
 * - aujourdhui  AAAA-MM-JJ (fenêtre des inscriptions récentes pour les usurpations)
 * renvoie : alertes [{ plateforme, type, domaine, courriel, categorie, date, urgent }]  — jamais de partie locale d'e-mail
 */
export function detecterListeNoire(entrees, cibles, aujourdhui, fenetreJours = FENETRE_NOIRE_JOURS) {
  const limite = new Date(Date.parse(`${aujourdhui}T00:00:00Z`) - fenetreJours * 86_400_000).toISOString().slice(0, 10);
  const out = [];
  const vu = new Set();
  for (const e of entrees) {
    const { domaine, courriel } = domaineInscription(e.nom);
    if (!domaine) continue;
    const libelles = domaine.split(".").flatMap((l) => [l, ...l.split("-")]);
    for (const c of cibles) {
      let type = null;
      if (c.domaines.some((d) => memeDomaine(domaine, d) && (domaine === d || domaine.endsWith(`.${d}`)))) type = "domaine-officiel";
      else if (e.date >= limite && c.marques.some((m) => libelles.includes(m) || (m.length >= 6 && libelles.some((l) => l.includes(m))))) type = "usurpation";
      if (!type) continue;
      const cle = `${c.id}|${type}|${domaine}`;
      if (vu.has(cle)) continue;
      vu.add(cle);
      out.push({ plateforme: c.id, nomPlateforme: c.nom, type, domaine, courriel, categorie: e.categorie, date: e.date, urgent: type === "domaine-officiel" && c.autorisee });
    }
  }
  return out;
}

/** Garde-fou de sortie : aucune adresse e-mail ni numéro de téléphone dans un texte destiné au dépôt public. */
export function contientDonneePersonnelle(texte) {
  const s = String(texte ?? "");
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(s) || /\+33\s?[1-9]/.test(s) || /\b0[67](?:[\s.]?\d{2}){4}\b/.test(s);
}
