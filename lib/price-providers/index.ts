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
import { coinbaseProvider } from "./coinbase";
import { kucoinProvider } from "./kucoin";
import { dexscreenerProvider } from "./dexscreener";
import { cryptocompareProvider } from "./cryptocompare";
import { coingeckoProvider } from "./coingecko";
import { staticProvider, STATIC_FALLBACK } from "./static";
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
  binanceProvider,    // 10 — top market, sparkline 7d natif
  krakenProvider,     // 20 — 93/100 fiable EU
  coinbaseProvider,   // 30 — 79/100 fiable US/UE
  kucoinProvider,     // 40 — exotiques asiatiques
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

const PROVIDERS_SORTED: readonly PriceProvider[] = [...PROVIDERS].sort(
  (a, b) => a.priority - b.priority,
);

export async function fetchPriceCascade(
  meta: CryptoMeta,
): Promise<CascadeResult | null> {
  for (const provider of PROVIDERS_SORTED) {
    if (!provider.canHandle(meta)) continue;
    try {
      const result = await provider.fetch(meta);
      if (result && result.priceUsd > 0) {
        return { data: result, source: provider.name };
      }
    } catch (err) {
      // Provider crashe (timeout, parse error, etc.) — log + continue.
      // eslint-disable-next-line no-console
      console.warn(
        `[price-providers] ${provider.name} threw for ${meta.coingeckoId}:`,
        err instanceof Error ? err.message : "unknown",
      );
    }
  }
  return null;
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
