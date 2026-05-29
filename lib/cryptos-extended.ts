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
import { getAllPublishedLlmCryptosLight } from "@/lib/cryptos-db";

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
    // FIX 2026-05-30 — getAllPublishedLlmCryptosLight (SANS filtre quality_tier)
    // au lieu de getFeaturedCryptosLight (limité T1/T2/T3) : la plupart des ~680
    // fiches LLM ont un tier null → elles étaient exclues de TOUTES les surfaces
    // consommant cette liste (hub /cryptos, /alertes autocomplete, whitelists
    // /api/onchain & /api/news, /admin). On inclut désormais les 780 partout.
    const [statics, llm] = await Promise.all([
      Promise.resolve(getAllStaticCryptos()),
      getAllPublishedLlmCryptosLight(2000),
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
  // v2 : nouvelle clé pour repartir propre (l'ancienne "cryptos-unified" pouvait
  // être figée à ~100, peuplée pendant un build sans accès Supabase + filtre tier).
  ["cryptos-unified-v2"],
  // Cache 6h : la liste change rarement (1×/jour via cron LLM-pipeline).
  { tags: ["cryptos", "cryptos-llm"], revalidate: 21600 },
);

/**
 * Alias utilisé par le hub /cryptos. Depuis le fix du filtre quality_tier,
 * getAllCryptosUnified renvoie déjà les 780 (100 statiques + toutes les fiches
 * LLM publiées) → on pointe simplement dessus : une seule source de vérité,
 * un seul cache, partout (hub, /alertes, /api).
 */
export const getAllCryptosBrowsable = getAllCryptosUnified;
