/**
 * lib/cryptos-extended.ts — Helper UNIFIE static (100) + LLM-pipeline (~680).
 *
 * Contexte (Bug fix critique 2026-05-09) :
 *  Le site annonce 780 cryptos mais 8 features critiques ne tapaient QUE
 *  sur les 100 fiches statiques (top10 + hidden-gems) de `lib/cryptos.ts`,
 *  ignorant les ~680 fiches LLM stockees en DB Supabase via `lib/cryptos-db.ts`.
 *  Affecte : /quiz/crypto, /alertes (autocomplete), /api/ask whitelist,
 *  /api/news, /api/onchain, /api/prices whitelist, /admin count.
 *
 * Strategie :
 *  - On NE TOUCHE PAS `lib/cryptos.ts:getAllCryptos()` (sync, SSG-friendly,
 *    consomme par les pages legacy /cryptos/[slug] etc.).
 *  - On expose `getAllCryptosUnified()` (async, cache 1h via unstable_cache)
 *    qui merge les deux sources et retourne un type minimal `UnifiedCrypto`
 *    (id + coingeckoId + name + symbol + category + source).
 *  - Les fields editoriaux deep (tagline, riskLevel, reliability, whereToBuy,
 *    consensus...) ne sont PAS exposes ici — pour ces use-cases (quiz scoring,
 *    pages /acheter/[crypto]/[pays], /cryptos/[slug] legacy), on continue
 *    d'utiliser `getAllCryptos()` ou `getCryptoFiche()` cible.
 *
 * Cache :
 *  - 1h via unstable_cache (revalidate: 3600)
 *  - tags: ["cryptos", "cryptos-llm"] — purge par revalidateTag possible
 *  - Cle: ["cryptos-unified"] — immuable par requete (pas de params)
 *
 * Dedoublonnage :
 *  - Les 100 statiques restent prioritaires (source: "static")
 *  - On filtre les LLM dont coingecko_id matche un static (evite doublons)
 */

import { unstable_cache } from "next/cache";
import { getAllCryptos as getAllStaticCryptos } from "@/lib/cryptos";
import { getFeaturedCryptosLight } from "@/lib/cryptos-db";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface UnifiedCrypto {
  /** Slug unique cote URL : `.id` pour static, `coingecko_id` pour LLM. */
  id: string;
  /** ID CoinGecko (cle de matching API externes). */
  coingeckoId: string;
  name: string;
  symbol: string;
  category?: string;
  /** Origine : "static" (top10/hidden-gem JSON) ou "llm-pipeline" (DB). */
  source: "static" | "llm-pipeline";
  /** Rang market cap (LLM uniquement, null pour static). */
  marketCapRank?: number | null;
}

/* -------------------------------------------------------------------------- */
/*  API publique                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Recupere TOUTES les cryptos (100 statiques + ~680 LLM) en format unifie.
 * Cache 1h via unstable_cache pour eviter de battre Supabase a chaque request
 * (utilise en boot d'index sur 5+ endpoints).
 *
 * Tags ["cryptos", "cryptos-llm"] : purge possible via revalidateTag()
 * si on ajoute/met a jour une fiche LLM.
 *
 * Tier T3 inclus : on prend tout le pipeline (limit 1000 = max actuel ~680).
 * Les statiques sont prioritaires (apparaissent en premier dans le tableau).
 */
export const getAllCryptosUnified = unstable_cache(
  async (): Promise<UnifiedCrypto[]> => {
    // OPTIM 2026-05-10 — getFeaturedCryptosLight au lieu de getFeaturedCryptos.
    // 200 bytes/row vs 2127 bytes/row = -90% Supabase bandwidth.
    // Pour 1000 rows : 2 MB → 200 KB par cache miss (1×/heure).
    const [statics, llm] = await Promise.all([
      Promise.resolve(getAllStaticCryptos()),
      getFeaturedCryptosLight(1000, ["T1", "T2", "T3"]),
    ]);

    // Set des coingeckoIds statiques pour eviter doublons LLM (BTC, ETH...).
    const staticIds = new Set(statics.map((c) => c.coingeckoId));
    const llmFiltered = llm.filter((f) => !staticIds.has(f.coingecko_id));

    return [
      ...statics.map((c) => ({
        id: c.id,
        coingeckoId: c.coingeckoId,
        name: c.name,
        symbol: c.symbol,
        category: c.category,
        source: "static" as const,
      })),
      ...llmFiltered.map((f) => ({
        id: f.coingecko_id,
        coingeckoId: f.coingecko_id,
        name: f.name,
        symbol: f.symbol,
        category: f.categories?.[0],
        source: "llm-pipeline" as const,
        marketCapRank: f.market_cap_rank,
      })),
    ];
  },
  ["cryptos-unified"],
  // OPTIM 2026-05-10 — 1h → 6h. Liste de cryptos change rarement
  // (1×/jour via cron LLM-pipeline). Cache 6h évite spam Supabase.
  { tags: ["cryptos", "cryptos-llm"], revalidate: 21600 },
);
