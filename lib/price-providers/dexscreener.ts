/**
 * lib/price-providers/dexscreener.ts — Provider DexScreener (Source #5).
 *
 * Wrappe getDexScreenerPrice + getDexScreenerByContract (lib/dexscreener.ts).
 * Filtres anti-fake (cycle 5) et SKIP_DEXSCREENER (cycle 6) integres ici
 * pour centraliser la config par provider.
 *
 * Phase 3 future : si meta.chains contient un mapping {chainId: contract},
 * on essaie d'abord par contract address (plus precis qu'un search par
 * symbol), puis fallback sur le search.
 */

import {
  getDexScreenerByContract,
  getDexScreenerPrice,
} from "@/lib/dexscreener";
import type {
  CryptoMeta,
  PriceProvider,
  ProviderPriceData,
} from "./types";

/**
 * coingeckoIds dont le symbol est ambigu (matche aussi un OLD token mort
 * sur DEX). Pour ces tokens, on skip DexScreener et on tombe sur
 * CoinGecko/CryptoCompare qui distinguent les ids canoniques.
 *
 * Cas connus :
 *  - "mantra" : NEW $OM Mantra Chain Cosmos (\$0.0104). Sans skip,
 *    DexScreener trouve OLD MANTRA DAO ERC-20 (\$0.0076, mort).
 */
const SKIP_DEXSCREENER: ReadonlySet<string> = new Set(["mantra"]);

export const dexscreenerProvider: PriceProvider = {
  name: "dexscreener",
  priority: 50,

  canHandle(meta: CryptoMeta): boolean {
    return !SKIP_DEXSCREENER.has(meta.coingeckoId);
  },

  async fetch(meta: CryptoMeta): Promise<ProviderPriceData | null> {
    // Phase 3 hook : si meta.chains existe, essayer par contract d'abord.
    // Plus precis qu'un search par symbol (evite les false positives).
    if (meta.chains) {
      const entries = Object.entries(meta.chains);
      for (const [chain, contract] of entries) {
        if (!chain || !contract) continue;
        const r = await getDexScreenerByContract(chain, contract);
        if (r && r.priceUsd > 0) {
          return {
            priceUsd: r.priceUsd,
            change24h: r.change24h,
            volume24h: r.volume24h,
            meta: {
              chain: r.chainId,
              pairAddress: r.pairAddress,
              liquidityUsd: r.liquidityUsd,
            },
          };
        }
      }
    }

    // Fallback : search par symbol (couverture max, anti-fake filtree).
    const r = await getDexScreenerPrice(meta.symbol);
    if (!r || r.priceUsd <= 0) return null;
    return {
      priceUsd: r.priceUsd,
      change24h: r.change24h,
      volume24h: r.volume24h,
      meta: {
        chain: r.chainId,
        pairAddress: r.pairAddress,
        liquidityUsd: r.liquidityUsd,
      },
    };
  },
};
