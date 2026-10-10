/**
 * scripts/lib/scores-plateformes.mjs — calcul des scores des plateformes (robot R12 « scores », lot Z6, 10/10/2026).
 *
 * Le barème est une COPIE de lib/scoring.ts (le script tourne sous Node sans passer par TypeScript) ; le test
 * tests/lib/scores-z6.test.ts vérifie qu'elle reste identique (poids, bonus, courbe du catalogue, plateformes multi-actifs).
 * Fonctions pures, sans horloge ni accès au disque : la date du jour n'est jamais utilisée comme date de calcul.
 *
 * `lastScored` (data/platforms.json → _meta.lastScored) = la date la plus RÉCENTE des entrées de données qui ont servi au
 * calcul (relevé des frais, coût d'achat, statut MiCA, sécurité, support), jamais l'heure du robot. Une date postérieure
 * au jour du calcul (ex. une échéance saisie par erreur) est ignorée.
 *
 * Garde-fou « dérive » : le robot n'écrit rien tant qu'une plateforme a des notes enregistrées qui ne respectent pas la formule
 * publiée (22 sur 34 le 10/10/2026) : récrire ces notes ferait bouger des notes publiées sans relecture. Un ticket décrit l'écart.
 */

/** = SCORING_WEIGHTS de lib/scoring.ts */
export const SCORING_WEIGHTS = { fees: 0.2, security: 0.25, mica: 0.2, ux: 0.15, support: 0.1, catalogue: 0.1 };

/** = MULTI_ASSET_BROKER_IDS de lib/scoring.ts */
export const MULTI_ASSET_BROKER_IDS = new Set(["bitpanda", "trade-republic", "revolut", "swissborg"]);

export const FORMULE = "global = 0.20·fees + 0.25·security + 0.20·mica + 0.15·ux + 0.10·support + 0.10·catalogue";

/** Tolérance d'arrondi entre la note globale enregistrée et la formule (identique à validateScoring de lib/scoring.ts). */
export const TOLERANCE_DERIVE = 0.05;

export const arrondi1 = (n) => Math.round(n * 10) / 10;

/** Score « catalogue et services » 0 à 5 (courbe sur le nombre de cryptos + bonus), identique à lib/scoring.ts. */
export function computeCatalogueScore({ totalCryptos, stakingAvailable, paymentMethodsCount, isMultiAssetBroker }) {
  const n = Math.max(0, totalCryptos);
  let base;
  if (n <= 30) base = 2.5;
  else if (n <= 100) base = 3.0 + ((n - 30) / 70) * 0.5;
  else if (n <= 300) base = 3.5 + ((n - 100) / 200) * 0.8;
  else if (n <= 500) base = 4.3 + ((n - 300) / 200) * 0.4;
  else if (n <= 700) base = 4.7 + ((n - 500) / 200) * 0.2;
  else base = 5.0;
  let bonus = 0;
  if (stakingAvailable) bonus += 0.3;
  if (paymentMethodsCount >= 5) bonus += 0.2;
  if (isMultiAssetBroker) bonus += 0.3;
  return arrondi1(Math.min(5, base + bonus));
}

/** Note globale pondérée, arrondie à 1 décimale. */
export function computeGlobalScore(sub) {
  return arrondi1(
    sub.fees * SCORING_WEIGHTS.fees +
      sub.security * SCORING_WEIGHTS.security +
      sub.mica * SCORING_WEIGHTS.mica +
      sub.ux * SCORING_WEIGHTS.ux +
      sub.support * SCORING_WEIGHTS.support +
      sub.catalogue * SCORING_WEIGHTS.catalogue,
  );
}

/** Bloc `scoring` recalculé d'une plateforme (le sous-score « catalogue » est dérivé des données, les autres sont repris). */
export function recalculerPlateforme(p) {
  const catalogue = computeCatalogueScore({
    totalCryptos: p?.cryptos?.totalCount ?? 0,
    stakingAvailable: Boolean(p?.cryptos?.stakingAvailable),
    paymentMethodsCount: Array.isArray(p?.deposit?.methods) ? p.deposit.methods.length : 0,
    isMultiAssetBroker: MULTI_ASSET_BROKER_IDS.has(p.id),
  });
  const sub = { fees: p.scoring.fees, security: p.scoring.security, mica: p.scoring.mica, ux: p.scoring.ux, support: p.scoring.support, catalogue };
  return { global: computeGlobalScore(sub), fees: sub.fees, security: sub.security, ux: sub.ux, support: sub.support, mica: sub.mica, catalogue };
}

/* ------------------------------------------------------------------ dates des données qui servent au calcul */
const ISO = /^\d{4}-\d{2}-\d{2}/;
const jourValide = (v) => {
  if (typeof v !== "string" || !ISO.test(v.trim())) return null;
  const j = v.trim().slice(0, 10);
  return new Date(`${j}T00:00:00Z`).toISOString().slice(0, 10) === j ? j : null;
};

/** Dates (AAAA-MM-JJ) des entrées de données d'une plateforme qui nourrissent ses notes. */
export function datesDonnees(p) {
  return [p?.fees?.verified?.date, p?.fees?.cost?.date, p?.mica?.lastVerified, p?.security?.verified, p?.support?.verified]
    .map(jourValide)
    .filter(Boolean);
}

/**
 * Date la plus récente des entrées de données qui ont servi, parmi toutes les plateformes ; null s'il n'y en a aucune.
 * `jourDuCalcul` (AAAA-MM-JJ) ne sert qu'à écarter une date postérieure (donnée datée du futur) : il n'est jamais retenu.
 */
export function lastScoredDe(platforms, jourDuCalcul) {
  let best = null;
  for (const p of platforms || []) {
    for (const d of datesDonnees(p)) {
      if (jourDuCalcul && d > jourDuCalcul) continue;
      if (best === null || d > best) best = d;
    }
  }
  return best;
}

/**
 * Une plateforme est COHÉRENTE quand sa note globale enregistrée est la formule publiée appliquée à ses propres sous-notes
 * (tolérance d'arrondi, comme validateScoring de lib/scoring.ts). Un changement de donnée (staking ajouté, nombre de
 * cryptos…) sur une plateforme cohérente déplace légitimement sa sous-note « catalogue » (dérivée des données) et sa note
 * globale ; une plateforme incohérente a une note publiée que personne n'explique : le robot ne la récrit pas seul.
 * `catalogueOk` est une information (sous-note « catalogue » enregistrée = celle que donnent les données), pas un critère.
 */
export function etatCoherent(p) {
  const calcule = recalculerPlateforme(p);
  const globalOk = Math.abs(computeGlobalScore(p.scoring) - p.scoring.global) <= TOLERANCE_DERIVE + 1e-9;
  const catalogueOk = calcule.catalogue === p.scoring.catalogue;
  return { globalOk, catalogueOk, coherent: globalOk };
}

/**
 * Recalcul complet d'un jeu de données (objet de data/platforms.json), sans le modifier.
 * @returns {{ data: any, lignes: Array<{id:string, avant:number, apres:number, coherent:boolean}>,
 *             incoherents: Array<{id:string, avant:number, apres:number, globalOk:boolean, catalogueOk:boolean}>,
 *             lastScoredAvant: string|null, lastScoredApres: string|null, scoresChangent: boolean, lastScoredChange: boolean }}
 */
export function recalculerJeu(data, jourDuCalcul) {
  const lignes = [];
  const platforms = data.platforms.map((p) => {
    const scoring = recalculerPlateforme(p);
    const c = etatCoherent(p);
    lignes.push({ id: p.id, avant: p.scoring.global, apres: scoring.global, ...c });
    return { ...p, scoring };
  });
  const lastScoredAvant = data._meta?.lastScored ?? null;
  const lastScoredApres = lastScoredDe(platforms, jourDuCalcul) ?? lastScoredAvant;
  const nouveau = { ...data, platforms, _meta: { ...(data._meta ?? {}), lastScored: lastScoredApres, scoringFormula: FORMULE } };
  return {
    data: nouveau,
    lignes,
    incoherents: lignes.filter((l) => !l.coherent).map(({ id, avant, apres, globalOk, catalogueOk }) => ({ id, avant, apres, globalOk, catalogueOk })),
    lastScoredAvant,
    lastScoredApres,
    scoresChangent: JSON.stringify(data.platforms.map((p) => p.scoring)) !== JSON.stringify(platforms.map((p) => p.scoring)),
    lastScoredChange: lastScoredApres !== lastScoredAvant || data._meta?.scoringFormula !== FORMULE,
  };
}

/**
 * Décision du robot : écrire, ne rien faire, ou refuser.
 * Refus : au moins une plateforme est déjà incohérente avec la formule publiée. Récrire la note globale la ferait bouger sans
 * relecture (et recomposerait les classements) : le robot ne le fait pas seul. Une relance manuelle assumée
 * (entrée « accepter_derive » du workflow, option --accepter-derive) l'autorise.
 * @param {ReturnType<typeof recalculerJeu>} r
 * @returns {{ action: "ecrire"|"rien"|"refuser", raison: string }}
 */
export function decider(r, { accepterDerive = false } = {}) {
  if (r.incoherents.length && !accepterDerive) {
    return { action: "refuser", raison: `${r.incoherents.length} plateforme(s) sur ${r.lignes.length} dont les notes enregistrées ne respectent pas la formule publiée : rien n'est écrit` };
  }
  if (!r.scoresChangent && !r.lastScoredChange) return { action: "rien", raison: "scores et date de calcul inchangés" };
  return { action: "ecrire", raison: r.scoresChangent ? "scores recalculés" : `date de calcul avancée au ${r.lastScoredApres}` };
}
