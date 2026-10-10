/**
 * scripts/lib/cmc-secours.mjs — références de prix de SECOURS pour construire data/cmc-id-map.json (finitions Z3, F4).
 *
 * Impasse corrigée : une fiche dont le prix en base a plus de 6 h ne pouvait jamais être appariée à CoinMarketCap, et
 * le robot des fiches (R2) ne met à jour par CoinMarketCap que les fiches déjà appariées. Pour ces seules fiches, la
 * construction de la table demande une référence de secours, utilisée UNIQUEMENT pour valider l'appariement (jamais
 * affichée, jamais écrite en base) :
 *  1. DexScreener par ADRESSE DE CONTRAT (adresse lue en base, jamais par symbole) : /tokens/v1/<réseau>/<adresses>,
 *     lots de 30 adresses d'un même réseau, paire la plus liquide d'au moins 50 000 $ (scripts/lib/fiches-prix.mjs) ;
 *  2. sinon l'API publique CoinGecko /api/v3/simple/price (sans clé ; contrôle interne), UN appel groupé (par 100 ids),
 *     avec l'heure du prix (include_last_updated_at) pour exiger un relevé de moins d'une heure.
 * Une requête par seconde au plus, toutes destinations confondues. Ne lève jamais : une source en échec = pas de secours.
 * Fonctions testées avec un fetch simulé (tests/lib/fiches-z3-finitions.test.ts).
 */
import { choisirPaire, lotsDex } from "./fiches-prix.mjs";

export const INTERVALLE_SECOURS_MS = 1_000;
export const LOT_COINGECKO_SIMPLE = 100;

/**
 * @param {Array<{id: string, adresses?: Array<{reseau: string, adresse: string}>}>} fiches  fiches sans référence en base
 * @param {{ fetch?: typeof fetch, maintenant?: () => number, pause?: (ms: number) => Promise<void> }} [o]
 * @returns {Promise<{ secours: Record<string, {prix: number, le: string, source: string}>, appels: {dexscreener: number, coingecko: number}, echecs: string[] }>}
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
  let derniere = -Infinity;
  const attendre = async () => {
    const reste = derniere + INTERVALLE_SECOURS_MS - maintenant();
    if (reste > 0) await pause(reste);
    derniere = maintenant();
  };

  // 1) DexScreener par adresse de contrat
  for (const lot of lotsDex(fiches.filter((x) => Array.isArray(x.adresses) && x.adresses.length))) {
    const restantes = lot.adresses.filter((a) => !secours[lot.fichesParAdresse[a.toLowerCase()]]);
    if (!restantes.length) continue;
    await attendre();
    appels.dexscreener++;
    try {
      const r = await f(`https://api.dexscreener.com/tokens/v1/${lot.reseau}/${restantes.join(",")}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
      if (!r.ok) {
        echecs.push(`DexScreener ${lot.reseau} : HTTP ${r.status}`);
        continue;
      }
      const paires = await r.json();
      const le = new Date(maintenant()).toISOString();
      for (const a of restantes) {
        const id = lot.fichesParAdresse[a.toLowerCase()];
        const p = choisirPaire(paires, a);
        if (p && !secours[id]) secours[id] = { prix: p.prix, le, source: "dexscreener" };
      }
    } catch (e) {
      echecs.push(`DexScreener ${lot.reseau} : ${String(e?.message ?? e).slice(0, 60)}`);
    }
  }

  // 2) CoinGecko public (identifiant de fiche = identifiant CoinGecko), un appel groupé
  const reste = fiches.map((x) => x.id).filter((id) => id && !secours[id]);
  for (let i = 0; i < reste.length; i += LOT_COINGECKO_SIMPLE) {
    const ids = reste.slice(i, i + LOT_COINGECKO_SIMPLE);
    await attendre();
    appels.coingecko++;
    try {
      const r = await f(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.map(encodeURIComponent).join(",")}&vs_currencies=usd&include_last_updated_at=true`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
      if (!r.ok) {
        echecs.push(`CoinGecko : HTTP ${r.status}`);
        continue;
      }
      const j = await r.json();
      for (const id of ids) {
        const v = j?.[id];
        const prix = typeof v?.usd === "number" && v.usd > 0 ? v.usd : null;
        const t = typeof v?.last_updated_at === "number" ? v.last_updated_at * 1000 : NaN;
        // sans heure du prix, impossible de prouver un relevé de moins d'une heure : pas de secours
        if (prix !== null && Number.isFinite(t)) secours[id] = { prix, le: new Date(t).toISOString(), source: "coingecko" };
      }
    } catch (e) {
      echecs.push(`CoinGecko : ${String(e?.message ?? e).slice(0, 60)}`);
    }
  }
  return { secours, appels, echecs };
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
