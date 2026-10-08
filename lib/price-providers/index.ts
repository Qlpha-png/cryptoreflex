/**
 * lib/price-providers/index.ts — Registry + cascade orchestrator.
 *
 * Phase 2 Provider Pattern (audit regle des 3 cycle 7).
 *
 * AJOUTER UNE NOUVELLE SOURCE :
 *   1. Cree lib/price-providers/foo.ts implementant PriceProvider
 *   2. Importe + push dans PROVIDERS array ci-dessous
 *   3. Done — tests + types se mettent a jour automatiquement.
 *
 * SUPPRIMER UNE SOURCE :
 *   1. Retire de PROVIDERS array (le module reste pour audit historique)
 *
 * REORDONNER : modifie le `priority` du provider (plus petit = essaye en
 * premier). Le sort dans PROVIDERS_SORTED garantit le bon ordre meme si
 * l'array est mal ordonne en source.
 */

import { binanceProvider } from "./binance";
import { krakenProvider } from "./kraken";
import { dexscreenerProvider } from "./dexscreener";
import { cryptocompareProvider } from "./cryptocompare";
import { coingeckoProvider } from "./coingecko";
import { coinmarketcapProvider } from "./coinmarketcap";
import { staticProvider, STATIC_FALLBACK } from "./static";
import { DATA_PRIORITIES, type SourceName } from "@/lib/data-sources/priorities";
import { resolveWithRelay, type Fetchers } from "@/lib/data-sources/resolve";
import { CHANNELS } from "@/lib/data-sources/health";
import { checkQuote } from "@/lib/data-sources/sanity";
import type {
  CryptoMeta,
  PriceProvider,
  PriceProviderName,
  ProviderPriceData,
} from "./types";

export type { CryptoMeta, PriceProvider, PriceProviderName, ProviderPriceData } from "./types";
export { STATIC_FALLBACK } from "./static";

/**
 * Registry des providers. Ordre fonctionnel ne compte pas (sort par
 * priority en aval) mais on garde le meme ordre que la cascade
 * historique pour la lisibilite humaine.
 */
export const PROVIDERS: readonly PriceProvider[] = [
  // 08/10/2026 (lot Z2) : relevé CoinMarketCap du robot R1 lu dans le KV (aucun appel CMC depuis une page), en tête.
  coinmarketcapProvider,
  binanceProvider,    // 10 — top market, sparkline 7d natif (gardé : décision de Kev du 08/10/2026)
  krakenProvider,     // 20 — 93/100 fiable EU
  // Coinbase (conditions : « personal or research purposes ») et KuCoin : retirés des cours affichés le 08/10/2026.
  dexscreenerProvider,// 50 — 500K+ tokens onchain (anti-fake + skip set)
  cryptocompareProvider, // 60 — fallback, mcap natif
  coingeckoProvider,  // 70 — fallback authoritative ids canoniques
  staticProvider,     // 99 — filet ultime
] as const;

/**
 * Cascade resolve : itere les providers par priority croissante, retourne
 * la premiere reponse valide (priceUsd > 0). Skip-rapide via canHandle().
 *
 * Garantit que :
 *  - Un provider qui throw est isole (try/catch indiv) — la cascade
 *    continue avec le prochain.
 *  - Le source est tracke pour debug + bandeau UI.
 *  - Si tout echoue (sauf static), on retourne null → caller affiche
 *    fallback degraded.
 */
export interface CascadeResult {
  data: ProviderPriceData;
  source: PriceProviderName;
}

/**
 * 06/10/2026 — L'ORDRE de la cascade vient de la table unique DATA_PRIORITIES.price
 * (lib/data-sources/priorities.ts), plus du champ `priority` (gardé pour lecture humaine).
 * Toute source de PROVIDERS absente de la table est ajoutée en fin de liste : aucune n'est jamais retirée.
 */
export function cascadeOrder(): readonly PriceProvider[] {
  const order = DATA_PRIORITIES.price;
  const rank = (p: PriceProvider) => {
    const i = order.indexOf(p.name as SourceName);
    return i === -1 ? order.length + p.priority / 1000 : i;
  };
  return [...PROVIDERS].sort((a, b) => rank(a) - rank(b));
}

/**
 * Relais : une source qui lève une erreur, renvoie une donnée aberrante (prix ≤ 0, stablecoin hors bande,
 * variation invraisemblable…) ou est mise de côté par le disjoncteur cède la place à la suivante.
 * Le résultat porte la source réellement utilisée.
 */
export async function fetchPriceCascade(
  meta: CryptoMeta,
): Promise<CascadeResult | null> {
  const fetchers: Fetchers<ProviderPriceData> = {};
  for (const provider of cascadeOrder()) {
    if (!provider.canHandle(meta)) continue;
    fetchers[provider.name as SourceName] = () => provider.fetch(meta);
  }
  const r = await resolveWithRelay("price", fetchers, {
    label: meta.coingeckoId,
    subjectId: meta.coingeckoId,
    // /simple/price SANS clé : son propre disjoncteur, jamais celui de /coins/markets (clé Demo).
    channels: { coingecko: CHANNELS.coingeckoPublic },
    validate: (d) =>
      checkQuote({
        priceUsd: d.priceUsd,
        change1h: d.change1h ?? null,
        change24h: d.change24h,
        change7d: d.change7d ?? null,
        volume24h: d.volume24h,
        marketCap: d.marketCap ?? null,
        circulatingSupply: d.circulatingSupply ?? null,
        symbol: meta.symbol,
      }),
  });
  return r ? { data: r.value, source: r.source as PriceProviderName } : null;
}

/**
 * Estimation du marketCap quand le provider ne le fournit pas (Binance,
 * Kraken, Coinbase, KuCoin, DexScreener). Derive le supply depuis
 * STATIC_FALLBACK puis multiplie par le prix live.
 *
 * Formule : supply = STATIC.marketCap / STATIC.priceUsd  (supply stable)
 *           marketCap_live = supply × priceUsd_live
 *
 * Si STATIC absent, retourne 0 (le frontend affiche "—").
 */
export function estimateMarketCap(
  coingeckoId: string,
  priceUsd: number,
): number {
  const stat = STATIC_FALLBACK[coingeckoId];
  if (!stat || stat.marketCap <= 0 || stat.priceUsd <= 0) return 0;
  const supply = stat.marketCap / stat.priceUsd;
  return supply * priceUsd;
}
