/**
 * scripts/lib/cmc-secours.mjs — références de prix de SECOURS pour construire data/cmc-id-map.json (finitions Z3, F4).
 *
 * Impasse corrigée : une fiche dont le prix en base a plus de 6 h ne pouvait jamais être appariée à CoinMarketCap, et
 * le robot des fiches (R2) ne met à jour par CoinMarketCap que les fiches déjà appariées. Pour ces seules fiches, la
 * construction de la table demande une référence de secours, utilisée UNIQUEMENT pour valider l'appariement (jamais
 * affichée, jamais écrite en base) :
 *  1. l'API publique CoinGecko /api/v3/simple/price (sans clé ; contrôle interne), appels groupés par 100 ids, avec
 *     l'heure du prix (include_last_updated_at) pour exiger un relevé de moins d'une heure. L'identifiant de fiche EST
 *     l'identifiant CoinGecko : c'est le prix de l'actif même de la fiche ;
 *  2. sinon DexScreener par ADRESSE DE CONTRAT (adresse lue en base, jamais par symbole) : /tokens/v1/<réseau>/<adresses>,
 *     lots de 30 adresses d'un même réseau, paire la plus liquide d'au moins 50 000 $ (scripts/lib/fiches-prix.mjs).
 * Ordre inversé le 10/10/2026 (mesure sur la table réelle) : la paire DexScreener donnait 3 faux écarts (olympus +10,4 %,
 * ultima −19 %, usdai −9,9 %) là où CoinGecko et CoinMarketCap concordaient à 0,1 %.
 * Une requête par seconde au plus, toutes destinations confondues. Ne lève jamais : une source en échec = pas de secours.
 * Fonctions testées avec un fetch simulé (tests/lib/fiches-z3-finitions.test.ts).
 */
import { choisirPaire, lotsDex } from "./fiches-prix.mjs";

export const INTERVALLE_SECOURS_MS = 1_000;
export const LOT_COINGECKO_SIMPLE = 100;
/** Prix CoinGecko relevé il y a plus d'une heure : pas une référence (DexScreener est alors essayé). */
const AGE_COINGECKO_MAX_MS = 3_600_000;
/**
 * Volume minimal sur 24 h d'une référence CoinGecko (reprise du 10/10/2026) : un identifiant mort garde un prix « frais »
 * dans /simple/price (mantra-dao : /coins/mantra-dao en 404, mais 0,05799 $ « relevé » à l'instant et 31 $ échangés sur
 * 24 h, contre 3,3 M$ pour mantra). En dessous, pas une référence (DexScreener est alors essayé). Seuil BAS volontaire :
 * à 1 000 $, la simulation du 10/10/2026 perdait mimblewimblecoin (463 $ échangés, fiche suivie, prix concordant).
 */
export const VOLUME_MIN_COINGECKO_USD = 100;
/** Attentes avant un nouvel essai CoinGecko après un HTTP 429 (limite de l'API publique). */
export const ESSAIS_SUR_LIMITE = [30_000, 60_000];
/**
 * Plafond du temps TOTAL passé à attendre de nouveaux essais CoinGecko sur l'ensemble des lots (5 min) : la durée du robot
 * ne croît plus avec le nombre de fiches (7 lots × 90 s ≈ 11 min sinon, ≈ 23 min pour 15 lots, timeout-minutes = 25).
 * Plafond atteint : le lot passe en échec (idsEnEchec), sans nouvel essai.
 */
export const ATTENTE_ESSAIS_MAX_MS = 300_000;

/**
 * @param {Array<{id: string, adresses?: Array<{reseau: string, adresse: string}>}>} fiches  fiches sans référence en base
 * @param {{ fetch?: typeof fetch, maintenant?: () => number, pause?: (ms: number) => Promise<void> }} [o]
 * @returns {Promise<{ secours: Record<string, {prix: number, le: string, source: string}>, appels: {dexscreener: number, coingecko: number}, echecs: string[], idsEnEchec: string[] }>}
 *   idsEnEchec : fiches d'un lot CoinGecko en échec (même si DexScreener a pris le relais) et fiches d'un lot DexScreener
 *   en échec ; scripts/construire-cmc-id-map.mjs refuse d'écrire si l'une d'elles est perdue.
 */
export async function referencesSecours(fiches, o = {}) {
  const f = o.fetch ?? fetch;
  const maintenant = o.maintenant ?? (() => Date.now());
  const pause = o.pause ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  /** @type {Record<string, {prix: number, le: string, source: string}>} */
  const secours = {};
  const appels = { dexscreener: 0, coingecko: 0 };
  /** @type {string[]} */
  const echecs = [];
  /** @type {Set<string>} */
  const enEchec = new Set();
  let attenteEssais = 0;
  let derniere = -Infinity;
  const attendre = async () => {
    const reste = derniere + INTERVALLE_SECOURS_MS - maintenant();
    if (reste > 0) await pause(reste);
    derniere = maintenant();
  };

  // 1) CoinGecko public (identifiant de fiche = identifiant CoinGecko : le prix de l'actif même de la fiche), appels groupés
  const ids = fiches.map((x) => x.id).filter(Boolean);
  for (let i = 0; i < ids.length; i += LOT_COINGECKO_SIMPLE) {
    const lotIds = ids.slice(i, i + LOT_COINGECKO_SIMPLE);
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${lotIds.map(encodeURIComponent).join(",")}&vs_currencies=usd&include_last_updated_at=true&include_24hr_vol=true`;
      let r;
      // limite de l'API publique (HTTP 429, constatée le 10/10/2026 : 2 lots sur 7) : 2 nouveaux essais espacés, dans la
      // limite de ATTENTE_ESSAIS_MAX_MS d'attente cumulée sur tous les lots
      for (let essai = 0; ; essai++) {
        await attendre();
        appels.coingecko++;
        r = await f(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
        if (r.status !== 429 || essai >= ESSAIS_SUR_LIMITE.length || attenteEssais + ESSAIS_SUR_LIMITE[essai] > ATTENTE_ESSAIS_MAX_MS) break;
        attenteEssais += ESSAIS_SUR_LIMITE[essai];
        await pause(ESSAIS_SUR_LIMITE[essai]);
      }
      if (!r.ok) {
        echecs.push(`CoinGecko : HTTP ${r.status}`);
        for (const id of lotIds) enEchec.add(id);
        continue;
      }
      const j = await r.json();
      for (const id of lotIds) {
        const v = j?.[id];
        const prix = typeof v?.usd === "number" && v.usd > 0 ? v.usd : null;
        const t = typeof v?.last_updated_at === "number" ? v.last_updated_at * 1000 : NaN;
        const volume = typeof v?.usd_24h_vol === "number" ? v.usd_24h_vol : null;
        // sans heure du prix (ou relevé de plus d'une heure), ou presque sans échange sur 24 h (identifiant mort au prix
        // figé) : moins d'une heure non prouvé, DexScreener prend le relais
        if (prix !== null && Number.isFinite(t) && maintenant() - t <= AGE_COINGECKO_MAX_MS && volume !== null && volume >= VOLUME_MIN_COINGECKO_USD) {
          secours[id] = { prix, le: new Date(t).toISOString(), source: "coingecko" };
        }
      }
    } catch (e) {
      echecs.push(`CoinGecko : ${String(e?.message ?? e).slice(0, 60)}`);
      for (const id of lotIds) enEchec.add(id);
    }
  }

  // 2) DexScreener par adresse de contrat, pour les seules fiches restées sans prix CoinGecko
  for (const lot of lotsDex(fiches.filter((x) => !secours[x.id] && Array.isArray(x.adresses) && x.adresses.length))) {
    const restantes = lot.adresses.filter((a) => !secours[lot.fichesParAdresse[a.toLowerCase()]]);
    if (!restantes.length) continue;
    await attendre();
    appels.dexscreener++;
    try {
      const r = await f(`https://api.dexscreener.com/tokens/v1/${lot.reseau}/${restantes.join(",")}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
      if (!r.ok) {
        echecs.push(`DexScreener ${lot.reseau} : HTTP ${r.status}`);
        for (const a of restantes) enEchec.add(lot.fichesParAdresse[a.toLowerCase()]);
        continue;
      }
      const paires = await r.json();
      // heure de LECTURE (DexScreener ne donne pas l'heure du dernier échange) : d'où l'exigence d'un volume sur 24 h
      const le = new Date(maintenant()).toISOString();
      for (const a of restantes) {
        const id = lot.fichesParAdresse[a.toLowerCase()];
        const p = choisirPaire(paires, a);
        if (p && (p.volume24h ?? 0) > 0 && !secours[id]) secours[id] = { prix: p.prix, le, source: "dexscreener" };
      }
    } catch (e) {
      echecs.push(`DexScreener ${lot.reseau} : ${String(e?.message ?? e).slice(0, 60)}`);
      for (const a of restantes) enEchec.add(lot.fichesParAdresse[a.toLowerCase()]);
    }
  }
  return { secours, appels, echecs, idsEnEchec: [...enEchec].filter(Boolean).sort() };
}

/**
 * Bilan des références de secours pour le rapport de construction : fiches appariées grâce à elles et fiches restées
 * non appariées malgré elles (identifiant → source), compte par source.
 * @param {Record<string, any>} details  détails de apparier()
 */
export function bilanSecours(details, demandees) {
  const appariees = {};
  const nonAppariees = {};
  const parSource = {};
  for (const [id, d] of Object.entries(details)) {
    if (!d?.referenceSecours) continue;
    if (d.statut === "apparié") {
      appariees[id] = d.referenceSecours;
      parSource[d.referenceSecours] = (parSource[d.referenceSecours] ?? 0) + 1;
    } else nonAppariees[id] = `${d.referenceSecours} (${d.motif})`;
  }
  return { demandees, utilisees: Object.keys(appariees).length + Object.keys(nonAppariees).length, appariees, parSource, nonAppariees };
}
