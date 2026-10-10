/**
 * scripts/lib/fx-bce.mjs — robot R6 « taux BCE » (lot Z4, 10/10/2026) : fonctions pures, testées sans réseau
 * (tests/lib/fx-bce.test.ts). Zéro dépendance (Node ≥ 20 et bundle Next).
 *
 * Source : taux de change de référence de l'euro publiés par la BCE (https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml),
 * « users of this website may make free use of the information », la BCE doit être citée (architecture § 1.1, S6).
 * Le fichier data/fx-bce.json garde les valeurs TELLES QUE PUBLIÉES (devise pour 1 €) ; les taux « pour 1 dollar » sont
 * dérivés dans lib/fx-bce.ts, en un seul endroit.
 *
 * Contrôles (architecture § 4, famille n° 9) :
 *  - structure : un seul « Cube time », au moins 25 devises, USD / GBP / CHF présents, finis et plausibles ; sinon rouge,
 *    aucune écriture ;
 *  - date : jamais de recul (un cache qui sert un ancien fichier est ignoré) ; au plus 4 jours ouvrés d'âge, sinon rouge
 *    (le fichier en place reste servi, son âge est affiché) ;
 *  - variation : moins de 3 % par publication sur USD, GBP et CHF ; au-delà, les valeurs précédentes sont gardées
 *    (« variation-refusee ») et un ticket privé est ouvert. Déblocage : si la publication suivante confirme le nouveau
 *    niveau (moins de 1 % d'écart avec les valeurs refusées), il est accepté — sinon un vrai choc de change bloquerait
 *    le site pour toujours sur l'ancien taux.
 */

export const BCE_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
export const BCE_LICENCE_URL = "https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html";
export const BCE_PAGE_URL = "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html";
export const DEVISES_SUIVIES = ["USD", "GBP", "CHF"];
export const VARIATION_MAX = 0.03;
export const CONFIRMATION_MAX = 0.01;
export const JOURS_OUVRES_MAX = 4;
export const MIN_DEVISES = 25;

/* bornes larges de plausibilité (devise pour 1 €) : une valeur hors bornes = structure suspecte */
const BORNES = { USD: [0.6, 2], GBP: [0.5, 1.5], CHF: [0.5, 2] };

/**
 * Analyse le XML de la BCE. Renvoie { date, parEuro } ou { erreur }.
 * Analyse déterministe par expressions régulières (format stable depuis 1999, aucune dépendance XML).
 */
export function analyserXmlBce(xml) {
  const texte = String(xml ?? "");
  if (!/European Central Bank/.test(texte)) return { erreur: "expéditeur « European Central Bank » absent" };
  const temps = [...texte.matchAll(/<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]\s*>/g)].map((m) => m[1]);
  if (temps.length !== 1) return { erreur: `${temps.length} bloc(s) « Cube time » au lieu d'un seul` };
  const date = temps[0];
  if (Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return { erreur: `date illisible « ${date} »` };
  const parEuro = /** @type {Record<string, number>} */ ({});
  for (const m of texte.matchAll(/<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9.]+)['"]\s*\/>/g)) {
    const v = Number(m[2]);
    if (!Number.isFinite(v) || v <= 0) return { erreur: `taux illisible pour ${m[1]} (« ${m[2]} »)` };
    if (parEuro[m[1]] !== undefined) return { erreur: `devise ${m[1]} en double` };
    parEuro[m[1]] = v;
  }
  const n = Object.keys(parEuro).length;
  if (n < MIN_DEVISES) return { erreur: `${n} devise(s) seulement (au moins ${MIN_DEVISES} attendues)` };
  for (const d of DEVISES_SUIVIES) {
    const v = parEuro[d];
    if (v === undefined) return { erreur: `devise ${d} absente` };
    const [min, max] = BORNES[d];
    if (v < min || v > max) return { erreur: `taux ${d} hors bornes plausibles (${v})` };
  }
  return { date, parEuro };
}

const JOUR = 86_400_000;
const instant = (d) => Date.parse(`${d}T00:00:00Z`);

/** Jours ouvrés (lundi à vendredi) strictement après `date`, jusqu'à `aujourdhui` inclus. */
export function joursOuvresDepuis(date, aujourdhui) {
  let n = 0;
  for (let t = instant(date) + JOUR; t <= instant(aujourdhui); t += JOUR) {
    const j = new Date(t).getUTCDay();
    if (j !== 0 && j !== 6) n++;
  }
  return n;
}

/** Plus grand écart relatif sur les devises suivies entre deux jeux de taux (0,012 = 1,2 %). */
export function ecartMax(a, b) {
  let max = 0;
  let devise = null;
  for (const d of DEVISES_SUIVIES) {
    if (!(a?.[d] > 0) || !(b?.[d] > 0)) return { ecart: Infinity, devise: d };
    const e = Math.abs(b[d] / a[d] - 1);
    if (e > max) { max = e; devise = d; }
  }
  return { ecart: max, devise };
}

const choisir = (parEuro) => Object.fromEntries(DEVISES_SUIVIES.map((d) => [d, parEuro[d]]));
const pct = (x) => `${(x * 100).toFixed(2).replace(".", ",")} %`;

/**
 * Décide du nouveau contenu de data/fx-bce.json.
 * - actuel :   contenu en place (null si absent ou illisible)
 * - lu :  publication analysée
 * - ctx : { aujourdhui, maintenant, lastModified }
 * Renvoie { ecrire, contenu, alerte, statut, message }.
 */
export function deciderFx(actuel, lu, ctx) {
  const age = joursOuvresDepuis(lu.date, ctx.aujourdhui);
  const base = (parEuro, date, lastModified, precedent, controle) => ({
    version: 1,
    source: "BCE, taux de change de référence de l'euro",
    sourceUrl: BCE_URL,
    pageUrl: BCE_PAGE_URL,
    licenceUrl: BCE_LICENCE_URL,
    date,
    lastModified: lastModified ?? null,
    releveLe: ctx.maintenant,
    parEuro,
    precedent,
    controle,
  });

  if (instant(lu.date) > instant(ctx.aujourdhui)) {
    return { ecrire: false, contenu: null, alerte: true, statut: "structure", message: `date de publication dans le futur (${lu.date})` };
  }
  if (actuel?.date && instant(lu.date) < instant(actuel.date)) {
    return { ecrire: false, contenu: null, alerte: false, statut: "ok", message: `publication du ${lu.date} plus ancienne que celle en place (${actuel.date}) : ignorée` };
  }
  if (age > JOURS_OUVRES_MAX) {
    return { ecrire: false, contenu: null, alerte: true, statut: "date-ancienne", message: `dernière publication de la BCE du ${lu.date}, soit ${age} jours ouvrés (maximum ${JOURS_OUVRES_MAX}) : fichier en place gardé` };
  }
  const memeDate = actuel?.date === lu.date;
  const memesValeurs = actuel?.parEuro && Object.keys(lu.parEuro).length === Object.keys(actuel.parEuro).length
    && Object.entries(lu.parEuro).every(([k, v]) => actuel.parEuro[k] === v);
  if (memeDate && memesValeurs && actuel?.controle?.statut === "ok") {
    return { ecrire: false, contenu: null, alerte: false, statut: "ok", message: `taux BCE du ${lu.date} déjà en place : rien à écrire` };
  }
  // déjà refusée (même publication relue) : rien de neuf, l'alerte reste ouverte
  if (actuel?.controle?.statut === "variation-refusee" && actuel.controle.refuse?.date === lu.date) {
    return { ecrire: false, contenu: null, alerte: true, statut: "variation-refusee", message: `publication du ${lu.date} déjà refusée (variation) : valeurs du ${actuel.date} gardées` };
  }

  if (actuel?.parEuro && !memeDate) {
    const { ecart, devise } = ecartMax(actuel.parEuro, lu.parEuro);
    if (ecart >= VARIATION_MAX) {
      const refusePrec = actuel.controle?.statut === "variation-refusee" ? actuel.controle.refuse : null;
      const confirme = refusePrec && instant(refusePrec.date) < instant(lu.date) && ecartMax(refusePrec.parEuro, lu.parEuro).ecart < CONFIRMATION_MAX;
      if (!confirme) {
        const controle = {
          statut: "variation-refusee",
          verifieLe: ctx.maintenant,
          detail: `variation de ${pct(ecart)} sur ${devise} entre le ${actuel.date} et le ${lu.date} (maximum ${pct(VARIATION_MAX)}) : valeurs du ${actuel.date} gardées`,
          refuse: { date: lu.date, parEuro: choisir(lu.parEuro) },
        };
        return { ecrire: true, contenu: { ...actuel, controle }, alerte: true, statut: "variation-refusee", message: controle.detail };
      }
      const controle = {
        statut: "ok",
        verifieLe: ctx.maintenant,
        detail: `nouveau niveau confirmé par deux publications (${refusePrec.date} et ${lu.date}, écart de moins de ${pct(CONFIRMATION_MAX)}) : accepté`,
        refuse: null,
      };
      return {
        ecrire: true,
        contenu: base(lu.parEuro, lu.date, ctx.lastModified, { date: actuel.date, parEuro: choisir(actuel.parEuro) }, controle),
        // déblocage réussi : événement bénin, le message reste dans le résumé du run (ni job rouge ni ticket « problème »)
        alerte: false,
        statut: "ok",
        message: controle.detail,
      };
    }
  }

  const precedent = actuel?.parEuro && !memeDate ? { date: actuel.date, parEuro: choisir(actuel.parEuro) } : (actuel?.precedent ?? null);
  const controle = { statut: "ok", verifieLe: ctx.maintenant, detail: null, refuse: null };
  return {
    ecrire: true,
    contenu: base(lu.parEuro, lu.date, ctx.lastModified, precedent, controle),
    alerte: false,
    statut: "ok",
    message: `taux BCE du ${lu.date} : 1 € = ${lu.parEuro.USD} $`,
  };
}

/** Taux « pour 1 dollar » dérivés d'un jeu « pour 1 euro » (même formule que lib/fx-bce.ts). */
export function parDollar(parEuro) {
  const usd = parEuro.USD;
  return { usd: 1, eur: 1 / usd, gbp: parEuro.GBP / usd, chf: parEuro.CHF / usd };
}
