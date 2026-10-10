/**
 * scripts/lib/halving.mjs — estimation du prochain halving de Bitcoin en FOURCHETTE (robot R7 étendu, lot Z4, 10/10/2026).
 * Calcul pur, testé sans réseau (tests/lib/halving.test.ts). Zéro dépendance.
 *
 * Méthode (écrite à côté du résultat sur le site) :
 *  - blocs restants = prochain multiple de 210 000 (1 050 000 jusqu'en 2028) − hauteur actuelle (mempool.space, recoupée
 *    avec blockstream.info) ;
 *  - temps de bloc moyen observé depuis le halving de 2024 (bloc 840 000, horodaté 2024-04-20T00:09:27Z, mesuré le
 *    10/10/2026) jusqu'au dernier bloc ;
 *  - estimation = horodatage du dernier bloc + blocs restants × temps moyen ;
 *  - fourchette = temps moyen ± écart, l'écart étant le plus grand de 5 % et de l'écart mesuré entre le temps moyen de
 *    l'époque de difficulté en cours (mempool.space) et la moyenne depuis 2024.
 * Jamais un jour précis présenté comme certain ; la fourchette se resserre seule à mesure que les blocs restants diminuent.
 */

export const INTERVALLE_HALVING = 210_000;
/** Prochain halving à la date d'écriture (bloc 1 050 000) ; le calcul suit seul les suivants (prochainBlocHalving). */
export const BLOC_HALVING = 1_050_000;
export const HAUTEUR_MAX = 2_100_000; // au-delà : donnée absurde (vers 2066)
export const REFERENCE = { hauteur: 840_000, horodatage: 1_713_571_767, iso: "2024-04-20T00:09:27Z" };

/** Bloc du prochain halving après une hauteur donnée (multiple suivant de 210 000). */
export function prochainBlocHalving(hauteur) {
  return (Math.floor(hauteur / INTERVALLE_HALVING) + 1) * INTERVALLE_HALVING;
}
export const ECART_MIN = 0.05;
export const TEMPS_MIN_S = 480; // 8 min : en dessous, donnée suspecte
export const TEMPS_MAX_S = 720; // 12 min

const iso = (s) => new Date(s * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");

/**
 * Mesures : { hauteur, horodatageBloc (secondes Unix), tempsEpoqueS }.
 * Renvoie { erreur } ou le calcul complet.
 */
export function calculerHalving(m) {
  const { hauteur, horodatageBloc, tempsEpoqueS } = m ?? {};
  if (!Number.isInteger(hauteur) || hauteur <= REFERENCE.hauteur || hauteur >= HAUTEUR_MAX) return { erreur: `hauteur invalide (${hauteur})` };
  if (!Number.isFinite(horodatageBloc) || horodatageBloc <= REFERENCE.horodatage) return { erreur: "horodatage du dernier bloc invalide" };
  // reprise Z4 : bloc cible calculé (plus de constante figée qui rendrait le robot rouge après le halving d'avril 2028)
  const bloc = prochainBlocHalving(hauteur);
  const rang = bloc / INTERVALLE_HALVING;
  const blocsRestants = bloc - hauteur;
  const tempsMoyenS = (horodatageBloc - REFERENCE.horodatage) / (hauteur - REFERENCE.hauteur);
  if (tempsMoyenS < TEMPS_MIN_S || tempsMoyenS > TEMPS_MAX_S) return { erreur: `temps moyen hors bornes (${tempsMoyenS.toFixed(1)} s)` };
  let ecartMesure = null;
  if (Number.isFinite(tempsEpoqueS) && tempsEpoqueS > 0) {
    if (tempsEpoqueS < TEMPS_MIN_S || tempsEpoqueS > TEMPS_MAX_S) return { erreur: `temps de l'époque hors bornes (${tempsEpoqueS.toFixed(1)} s)` };
    ecartMesure = Math.abs(tempsEpoqueS / tempsMoyenS - 1);
  }
  const ecart = Math.max(ECART_MIN, ecartMesure ?? 0);
  const tempsBasS = tempsMoyenS * (1 - ecart);
  const tempsHautS = tempsMoyenS * (1 + ecart);
  const estimation = iso(horodatageBloc + blocsRestants * tempsMoyenS);
  return {
    bloc,
    rang,
    // récompense par bloc en BTC (50 BTC au départ, divisée par 2 à chaque halving)
    recompenseAvant: 50 / 2 ** (rang - 1),
    recompenseApres: 50 / 2 ** rang,
    hauteur,
    horodatageBloc: iso(horodatageBloc),
    blocsRestants,
    reference: REFERENCE,
    tempsMoyenS: Math.round(tempsMoyenS * 100) / 100,
    tempsEpoqueS: Number.isFinite(tempsEpoqueS) ? Math.round(tempsEpoqueS * 100) / 100 : null,
    ecart: Math.round(ecart * 10000) / 10000,
    ecartMesure: ecartMesure === null ? null : Math.round(ecartMesure * 10000) / 10000,
    estimation,
    fourchette: { debut: iso(horodatageBloc + blocsRestants * tempsBasS), fin: iso(horodatageBloc + blocsRestants * tempsHautS), tempsBasS: Math.round(tempsBasS * 100) / 100, tempsHautS: Math.round(tempsHautS * 100) / 100 },
  };
}

/** Croissance maximale admise : 1,5 × 144 blocs par jour écoulé (au moins un jour). */
export const CROISSANCE_MAX_PAR_JOUR = 1.5 * 144;

/**
 * Contrôles des mesures avant calcul : null ou la raison du refus.
 * reseau = true (lecture réelle) : le recoupement blockstream.info et le temps de l'époque doivent être lisibles (une
 * source qui change de format ne doit pas faire disparaître un contrôle en silence).
 * horodatagePrecedentS : horodatage (secondes) du bloc du passage précédent, pour la garde de croissance.
 */
export function verifierMesures(m) {
  const { hauteur, hauteurRecoupement, horodatageBloc, maintenantS, hauteurPrecedente, horodatagePrecedentS, tempsEpoqueS, reseau } = m ?? {};
  if (!Number.isInteger(hauteur)) return "hauteur illisible";
  if (reseau && !Number.isInteger(hauteurRecoupement)) return "hauteur de recoupement (blockstream.info) illisible : format changé ?";
  if (reseau && !(Number.isFinite(tempsEpoqueS) && tempsEpoqueS > 0)) return "temps moyen de l'époque (mempool.space, timeAvg) illisible : format changé ?";
  if (Number.isInteger(hauteurRecoupement) && Math.abs(hauteur - hauteurRecoupement) > 3) return `hauteurs en désaccord (mempool.space ${hauteur}, blockstream.info ${hauteurRecoupement})`;
  if (Number.isInteger(hauteurPrecedente) && hauteur < hauteurPrecedente) return `hauteur en recul (${hauteur} < ${hauteurPrecedente})`;
  if (Number.isInteger(hauteurPrecedente) && Number.isFinite(horodatagePrecedentS) && Number.isFinite(horodatageBloc)) {
    const jours = Math.max(1, (horodatageBloc - horodatagePrecedentS) / 86_400);
    const max = Math.ceil(CROISSANCE_MAX_PAR_JOUR * jours);
    if (hauteur - hauteurPrecedente > max) return `hauteur en hausse trop rapide (+${hauteur - hauteurPrecedente} blocs en ${jours.toFixed(1)} jour(s), au plus ${max})`;
  }
  if (Number.isFinite(maintenantS) && Math.abs(maintenantS - horodatageBloc) > 6 * 3600) return "dernier bloc horodaté à plus de 6 h de l'heure du passage";
  return null;
}
