/**
 * lib/price-providers/coingecko.ts — Provider CoinGecko (Source #7).
 *
 * Utilise /simple/price (free Demo, ~30 req/min sans cle). Source legacy
 * qui resolvait l'ambiguite OM/MANTRA via coingeckoId canonique.
 *
 * Cache : Next.js fetch revalidate 300s. Pas de unstable_cache externe
 * pour rester proche du comportement historique.
 *
 * 06/10/2026 — une erreur HTTP (429, 5xx), un délai dépassé ou une réponse illisible LÈVENT désormais une
 * SourceError au lieu de renvoyer null : la cascade passe au relais exactement comme avant, mais le disjoncteur
 * (lib/data-sources/health.ts) peut compter les échecs. « Crypto inconnue » reste un null (pas un échec).
 */

import { SourceError } from "@/lib/data-sources/resolve";
import type {
  CryptoMeta,
  PriceProvider,
  ProviderPriceData,
} from "./types";

interface CoingeckoSimplePriceEntry {
  usd?: number;
  usd_market_cap?: number;
  usd_24h_vol?: number;
  usd_24h_change?: number;
}

export async function coingeckoSimplePrice(
  coingeckoId: string,
  timeoutMs = 6000,
): Promise<CoingeckoSimplePriceEntry | null> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coingeckoId)}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;
  let res: Response;
  try {
    res = await fetch(url, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    throw new SourceError(err instanceof Error && err.name === "TimeoutError" ? "délai dépassé" : "erreur réseau");
  }
  if (!res.ok) throw new SourceError(`HTTP ${res.status}`, { status: res.status === 401 || res.status === 403 ? res.status : null });
  let data: Record<string, CoingeckoSimplePriceEntry | undefined>;
  try {
    data = (await res.json()) as Record<string, CoingeckoSimplePriceEntry | undefined>;
  } catch {
    throw new SourceError("réponse illisible");
  }
  return data?.[coingeckoId] ?? null;
}

export const coingeckoProvider: PriceProvider = {
  name: "coingecko",
  priority: 70,

  canHandle(_meta: CryptoMeta): boolean {
    return true;
  },

  async fetch(meta: CryptoMeta): Promise<ProviderPriceData | null> {
    const entry = await coingeckoSimplePrice(meta.coingeckoId);
    if (!entry || typeof entry.usd !== "number" || entry.usd <= 0) return null;
    return {
      priceUsd: entry.usd,
      change24h: entry.usd_24h_change ?? 0,
      volume24h: entry.usd_24h_vol ?? 0,
      marketCap: entry.usd_market_cap, // CoinGecko expose le mcap natif
    };
  },
};
