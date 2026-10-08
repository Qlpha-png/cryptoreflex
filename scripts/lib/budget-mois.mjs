/**
 * scripts/lib/budget-mois.mjs — « budget du mois » de cryptoreflex.fr (lot Z2b, 08/10/2026).
 *
 * Demande de Kev : « à toi de faire en sorte qu'on gère la conso du mois », avec 0 € de dépassement et un site qui n'est
 * JAMAIS coupé. Deux usages, une seule règle (ce fichier est la source unique, importé par la sentinelle ET par le site) :
 *  1. la section « Consommation du mois » du ticket du dimanche et de fraicheur-etat.json (scripts/sentinelle.mjs) ;
 *  2. le FREIN AUTOMATIQUE du robot des cours (lib/marche-robot.ts) : jamais de coupure, seulement un rythme plus lent.
 *
 * Règles :
 *  - projection fin de mois = consommé ÷ jours écoulés × jours du mois (UTC, jamais moins d'UN jour écoulé : sur les
 *    premières heures du mois, quelques crédits ne disent rien du rythme) ;
 *  - état de la projection : ✅ moins de 75 %, ⚠️ de 75 à 90 % (inclus), ❌ plus de 90 % de la limite ;
 *  - aucune valeur inventée : une mesure absente donne « non mesuré : <raison> », jamais un chiffre supposé.
 * Zéro dépendance (Node 20 et bundle Next).
 */

const JOUR = 86_400_000;

/** Projection : ⚠️ à partir de 75 %, ❌ au-delà de 90 %. */
export const SEUIL_ATTENTION = 75;
export const SEUIL_DEFAUT = 90;
/** Frein : actif au-delà de 90 % de projection, retour à la normale sous 75 % (entre les deux : l'état précédent est gardé). */
export const FREIN_ACTIVATION = 90;
export const FREIN_RETOUR = 75;
/** Frein actif : un relevé des cours toutes les 20 min (cron toutes les 10 min → on saute un passage sur deux). */
export const FREIN_INTERVALLE_COURS_MIN = 15;
/** Frein actif : métriques globales toutes les 3 h. */
export const FREIN_PERIODE_GLOBAL_H = 3;
/** Taille de la base : ⚠️ à 60 %, ❌ à 80 % de la limite (la base passe en lecture seule à 100 % sur l'offre Free). */
export const BASE_SEUIL_ATTENTION = 60;
export const BASE_SEUIL_DEFAUT = 80;

export const ICONES = { ok: "✅", attention: "⚠️", defaut: "❌", "non-mesure": "❔" };

const ok = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;
const fmt = (n) => Math.round(n).toLocaleString("fr-FR").replace(/[  ]/g, " ");
const mo = (octets) => `${Math.round(octets / 1_048_576)} Mo`;
const cellule = (s) => String(s ?? "").replace(/\|/g, "/").replace(/\n/g, " ");

/* ------------------------------------------------------------------ calendrier (UTC) */

export function debutMoisUtc(now) {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}
export function joursDuMois(now) {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}
/** Jours écoulés depuis le début du mois UTC (fractionnaires), au moins 1. */
export function joursEcoules(now) {
  return Math.max(1, (now - debutMoisUtc(now)) / JOUR);
}
/** Mois courant « AAAA-MM » (UTC). */
export function moisCle(now) {
  return new Date(now).toISOString().slice(0, 7);
}

/* ------------------------------------------------------------------ projection et états */

/** Consommé ÷ jours écoulés × jours du mois ; null si le consommé n'est pas un nombre valide. */
export function projeter(consomme, now) {
  if (!ok(consomme)) return null;
  return (consomme / joursEcoules(now)) * joursDuMois(now);
}

/** Part de la limite en %, null si l'une des deux valeurs manque. */
export function pourcentage(valeur, limite) {
  if (!ok(valeur) || !(typeof limite === "number" && Number.isFinite(limite) && limite > 0)) return null;
  // arrondi à 9 décimales (l'erreur de virgule flottante est de l'ordre de 1e-14) : 90 % pile reste 90 % (un 90,00000000000001 de virgule flottante ne doit pas faire basculer le frein)
  return Math.round((valeur / limite) * 100 * 1e9) / 1e9;
}

/** ✅ < attention, ⚠️ de attention à defaut (inclus), ❌ > defaut ; null → « non-mesure ». */
export function etatDepuisPourcentage(pct, attention = SEUIL_ATTENTION, defaut = SEUIL_DEFAUT) {
  if (typeof pct !== "number" || !Number.isFinite(pct)) return "non-mesure";
  if (pct > defaut) return "defaut";
  if (pct >= attention) return "attention";
  return "ok";
}

/* ------------------------------------------------------------------ lignes par service */

/** Service qu'on ne sait pas mesurer : jamais de valeur, la raison est écrite. */
export function nonMesure(id, nom, raison = "alerte e-mail du fournisseur") {
  return { id, nom, etat: "non-mesure", icone: ICONES["non-mesure"], consomme: null, limite: null, unite: null, projection: null, pct: null, msg: `${nom} : non mesuré : ${raison}` };
}

/**
 * Service mensuel (flux) : crédits CoinMarketCap… État = projection de fin de mois contre la limite.
 * @param {{id: string, nom: string, unite: string, consomme: unknown, limite: unknown, now: number, source?: string, raison?: string, partiel?: boolean, detail?: string}} p
 */
export function mesureFlux(p) {
  if (!ok(p.consomme)) return nonMesure(p.id, p.nom, p.raison ?? "mesure absente");
  const limite = typeof p.limite === "number" && Number.isFinite(p.limite) && p.limite > 0 ? p.limite : null;
  if (limite === null) return nonMesure(p.id, p.nom, p.raison ?? "limite du plan non connue");
  const projection = projeter(p.consomme, p.now);
  const pct = pourcentage(projection, limite);
  const etat = etatDepuisPourcentage(pct);
  const partiel = p.partiel ? " (compteur interne des robots : les lectures des pages ne sont pas comptées)" : "";
  return {
    id: p.id,
    nom: p.nom,
    etat,
    icone: ICONES[etat],
    consomme: p.consomme,
    limite,
    unite: p.unite,
    projection,
    pct,
    source: p.source ?? null,
    partiel: p.partiel === true,
    msg: `${p.nom} : ${fmt(p.consomme)} ${p.unite} sur ${fmt(limite)} ce mois ; projection fin de mois ≈ ${fmt(projection)} (${Math.round(pct)} %)${partiel}${p.detail ? ` ; ${p.detail}` : ""}`,
  };
}

/**
 * Stock (taille de la base) : pas de remise à zéro en fin de mois, donc pas de projection mensuelle ; état = part de la
 * limite aujourd'hui (⚠️ 60 %, ❌ 80 %).
 */
export function mesureStock(p) {
  if (!ok(p.octets)) return nonMesure(p.id, p.nom, p.raison ?? "lecture impossible");
  const pct = pourcentage(p.octets, p.plafond);
  if (pct === null) return nonMesure(p.id, p.nom, "limite du plan non connue");
  // mêmes bornes que jugerTailleBase (scripts/lib/fraicheur-registre.mjs) : ⚠️ dès 60 %, ❌ dès 80 % (inclus)
  const etat = pct >= BASE_SEUIL_DEFAUT ? "defaut" : pct >= BASE_SEUIL_ATTENTION ? "attention" : "ok";
  return {
    id: p.id,
    nom: p.nom,
    etat,
    icone: ICONES[etat],
    consomme: p.octets,
    limite: p.plafond,
    unite: "octets",
    projection: null,
    pct,
    source: p.source ?? null,
    msg: `${p.nom} : ${mo(p.octets)} sur ${mo(p.plafond)} (${pct.toFixed(1)} %) ; taille cumulée, pas de projection mensuelle (seuils ⚠️ ${BASE_SEUIL_ATTENTION} %, ❌ ${BASE_SEUIL_DEFAUT} %)`,
  };
}

/**
 * GitHub Actions : gratuit tant que le dépôt est PUBLIC (aucun plafond de minutes). Le vrai risque est donc un dépôt passé
 * en privé (minutes facturables) : ❌. Visibilité illisible : ⚠️. Nombre d'exécutions illisible : non mesuré.
 * @param {{executions: number|null, prive: boolean|null, borne?: boolean, now: number, raison?: string}} p
 */
export function mesureGithub(p) {
  const nom = "GitHub Actions";
  if (!ok(p.executions)) return nonMesure("github", nom, p.raison ?? "API GitHub illisible");
  const projection = projeter(p.executions, p.now);
  const borne = p.borne ? "au moins " : "";
  const base = `${nom} : ${borne}${fmt(p.executions)} exécutions ce mois ; projection fin de mois ≈ ${fmt(projection)}`;
  let etat = "ok";
  let fin = "limite : aucune, gratuit tant que le dépôt est public (dépôt public vérifié)";
  if (p.prive === true) {
    etat = "defaut";
    fin = "dépôt PRIVÉ : les minutes d'Actions deviennent facturables, à repasser en public";
  } else if (p.prive !== false) {
    etat = "attention";
    fin = "visibilité du dépôt illisible : gratuité non vérifiée";
  }
  return { id: "github", nom, etat, icone: ICONES[etat], consomme: p.executions, limite: null, unite: "exécutions", projection, pct: null, msg: `${base} ; ${fin}` };
}

/**
 * CoinMarketCap à partir de la réponse de /api/diag/cmc-budget (champs `lu`, `moisUtilises`, `moisPlafond`, `aujourdhui`,
 * `erreur1009`, `frein`, `compteurRobots`) : compteur officiel d'abord, sinon compteur interne des robots, sinon non mesuré.
 * @param {any} b
 * @param {number} now
 * @param {{limiteSecours?: number, raison?: string}} [opts]
 */
export function mesureCmc(b, now, opts = {}) {
  const id = "cmc";
  const nom = "CoinMarketCap";
  let ligne;
  if (b?.lu === true && ok(b.moisUtilises)) {
    const jour = ok(b.aujourdhui) ? `${fmt(b.aujourdhui)} crédits aujourd'hui${ok(b.plafondJour) ? ` sur un plafond quotidien de ${fmt(b.plafondJour)}` : " (plafond quotidien non renvoyé)"}` : undefined;
    ligne = mesureFlux({ id, nom, unite: "crédits", consomme: b.moisUtilises, limite: b.moisPlafond, now, source: "compteur officiel (/v1/key/info)", detail: jour });
  } else if (ok(b?.compteurRobots?.credits) && ok(opts.limiteSecours)) {
    ligne = mesureFlux({ id, nom, unite: "crédits", consomme: b.compteurRobots.credits, limite: opts.limiteSecours, now, source: "compteur interne des robots", partiel: true });
  } else {
    ligne = nonMesure(id, nom, opts.raison ?? b?.raison ?? "compteur officiel illisible et aucun compteur interne");
  }
  const frein = b?.frein ?? null;
  const e1009 = typeof b?.erreur1009 === "string" ? Date.parse(b.erreur1009) : NaN;
  const e1009Jour = Number.isFinite(e1009) && new Date(e1009).toISOString().slice(0, 10) === new Date(now).toISOString().slice(0, 10);
  const suffixe = [];
  if (frein) suffixe.push(`frein du robot des cours : ${frein.etat === "actif" ? `ACTIF (${frein.raison})` : "normal"}`);
  else suffixe.push("frein du robot des cours : état non lu");
  if (e1009Jour) suffixe.push("erreur 1009 (plafond du jour atteint) reçue aujourd'hui");
  return { ...ligne, frein: frein ? { etat: frein.etat, raison: frein.raison ?? null, projectionPct: frein.projectionPct ?? null } : null, msg: `${ligne.msg} ; ${suffixe.join(" ; ")}` };
}

/* ------------------------------------------------------------------ GitHub Actions : exécutions du mois */

/**
 * Nombre d'exécutions d'Actions depuis le 1er du mois (UTC) et visibilité du dépôt, via l'API avec GITHUB_TOKEN.
 * Un appel par jour écoulé (`created=AAAA-MM-JJ`, au plus 31) : l'API plafonne à 1 000 résultats par recherche filtrée, un jour
 * en compte une cinquantaine. Le moindre échec rend `executions: null` (jamais une somme partielle).
 * @param {{repo?: string, token?: string, now: number, fetchImpl?: typeof fetch, ua?: string}} p
 * @returns {Promise<{executions: number|null, prive: boolean|null, borne: boolean, raison?: string}>}
 */
export async function compterExecutionsMois(p) {
  if (!p.repo || !p.token) return { executions: null, prive: null, borne: false, raison: "GITHUB_TOKEN ou GITHUB_REPOSITORY absent de l'environnement" };
  const f = p.fetchImpl ?? fetch;
  const entetes = { Authorization: `Bearer ${p.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": p.ua ?? "cryptoreflex-sentinelle/1.0" };
  const lire = async (url) => {
    const r = await f(url, { headers: entetes, signal: AbortSignal.timeout(20_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };
  try {
    const depot = await lire(`https://api.github.com/repos/${p.repo}`);
    const prive = typeof depot?.private === "boolean" ? depot.private : null;
    const d = new Date(p.now);
    const jours = d.getUTCDate();
    let total = 0;
    let borne = false;
    for (let j = 1; j <= jours; j++) {
      const date = `${moisCle(p.now)}-${String(j).padStart(2, "0")}`;
      const rep = await lire(`https://api.github.com/repos/${p.repo}/actions/runs?created=${date}&per_page=1`);
      const n = rep?.total_count;
      if (!ok(n)) throw new Error("réponse sans total_count");
      if (n >= 1000) borne = true;
      total += n;
    }
    return { executions: total, prive, borne };
  } catch (e) {
    return { executions: null, prive: null, borne: false, raison: `API GitHub : ${e?.name === "TimeoutError" ? "délai dépassé" : String(e?.message ?? "erreur").slice(0, 60)}` };
  }
}

/* ------------------------------------------------------------------ restitution */

/** Ligne de synthèse pour fraicheur-etat.json : les mesures et leur horodatage. */
export function bilanConsommation(services, now) {
  return {
    le: new Date(now).toISOString(),
    mois: moisCle(now),
    joursEcoules: Math.round(joursEcoules(now) * 100) / 100,
    joursDuMois: joursDuMois(now),
    services: services.map((s) => ({ ...s })),
  };
}

/** Section Markdown « Consommation du mois » (ticket du dimanche). */
export function sectionConsommation(services, now) {
  const moisNom = new Date(now).toLocaleDateString("fr-FR", { timeZone: "UTC", month: "long", year: "numeric" });
  const nombre = (s) => {
    if (s.consomme === null) return "—";
    return s.unite === "octets" ? mo(s.consomme) : `${fmt(s.consomme)} ${s.unite}`;
  };
  const limite = (s) => {
    if (s.etat === "non-mesure") return "—";
    if (s.limite === null) return s.id === "github" ? "aucune (dépôt public)" : "—";
    return s.unite === "octets" ? mo(s.limite) : `${fmt(s.limite)} ${s.unite}`;
  };
  const proj = (s) => (s.projection === null ? (s.etat === "non-mesure" ? "—" : "sans objet") : `≈ ${fmt(s.projection)}${s.pct !== null ? ` (${Math.round(s.pct)} %)` : ""}`);
  const lignes = [
    `## Consommation du mois — ${moisNom}`,
    "",
    `Jour ${Math.floor(joursEcoules(now))} sur ${joursDuMois(now)} (UTC). Projection fin de mois = consommé ÷ jours écoulés × jours du mois (au moins 1 jour écoulé). ${ICONES.ok} moins de ${SEUIL_ATTENTION} % · ${ICONES.attention} de ${SEUIL_ATTENTION} à ${SEUIL_DEFAUT} % · ${ICONES.defaut} plus de ${SEUIL_DEFAUT} % de la limite. ${ICONES["non-mesure"]} = non mesuré, aucune valeur supposée.`,
    "",
    "| Service | Consommé | Limite | Projection fin de mois | État |",
    "|---|---|---|---|---|",
  ];
  for (const s of services) lignes.push(`| ${cellule(s.nom)} | ${cellule(nombre(s))} | ${cellule(limite(s))} | ${cellule(proj(s))} | ${s.icone} |`);
  lignes.push("");
  for (const s of services) lignes.push(`- ${s.icone} ${s.msg}`);
  lignes.push("");
  return lignes.join("\n");
}

/* ------------------------------------------------------------------ frein automatique du robot des cours */

/**
 * Décision du frein, jamais une coupure.
 *  - erreur 1009 reçue aujourd'hui (plafond quotidien atteint) → frein actif ;
 *  - projection > 90 % de la limite mensuelle → actif ; < 75 % → normal ; entre les deux → l'état précédent est gardé
 *    (hystérésis : pas de va-et-vient autour du seuil) ;
 *  - compteur illisible → l'état précédent est gardé, rien n'est supposé.
 * @param {{consomme: number|null, limite: number, now: number, erreur1009Jour?: boolean, precedentActif?: boolean}} p
 * @returns {{actif: boolean, raison: string, projection: number|null, projectionPct: number|null}}
 */
export function decisionFrein(p) {
  const precedent = p.precedentActif === true;
  const projection = projeter(p.consomme, p.now);
  const pct = pourcentage(projection, p.limite);
  const tauxTexte = pct === null ? "" : `${Math.round(pct)} %`;
  if (p.erreur1009Jour === true) return { actif: true, raison: "erreur 1009 reçue aujourd'hui (plafond quotidien atteint)", projection, projectionPct: pct };
  if (pct === null) return { actif: precedent, raison: `compteur illisible : état précédent conservé (${precedent ? "actif" : "normal"})`, projection, projectionPct: null };
  if (pct > FREIN_ACTIVATION) return { actif: true, raison: `projection fin de mois à ${tauxTexte} de la limite (seuil ${FREIN_ACTIVATION} %)`, projection, projectionPct: pct };
  if (pct < FREIN_RETOUR) return { actif: false, raison: `projection fin de mois à ${tauxTexte} de la limite (retour à la normale sous ${FREIN_RETOUR} %)`, projection, projectionPct: pct };
  return { actif: precedent, raison: `projection fin de mois à ${tauxTexte} de la limite, entre ${FREIN_RETOUR} et ${FREIN_ACTIVATION} % : état précédent conservé (${precedent ? "actif" : "normal"})`, projection, projectionPct: pct };
}

/**
 * Frein actif : le robot saute un passage sur deux (cron toutes les 10 min → un relevé toutes les 20 min). Règle sans parité
 * d'horloge : on saute si le dernier relevé réel date de moins de 15 min. Dernier relevé inconnu → on relève (jamais de trou).
 */
export function freinSautePassage(actif, nowMs, dernierReleveIso) {
  if (!actif) return false;
  const t = typeof dernierReleveIso === "string" ? Date.parse(dernierReleveIso) : NaN;
  if (!Number.isFinite(t)) return false;
  return nowMs - t < FREIN_INTERVALLE_COURS_MIN * 60_000 && nowMs >= t;
}

/** Frein actif : les métriques globales ne sont relevées qu'aux heures UTC multiples de 3 (au lieu de chaque heure). */
export function freinAutoriseGlobal(actif, nowMs) {
  return !actif || new Date(nowMs).getUTCHours() % FREIN_PERIODE_GLOBAL_H === 0;
}
