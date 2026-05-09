/**
 * GET /api/prices?ids=bitcoin,ethereum,...
 *
 * Renvoie les prix USD + variation 24h pour les coins du ticker.
 * Si `?ids` est absent → fallback DEFAULT_COINS (top 6 du ticker).
 *
 * Hardening Sprint 4 :
 *  - Rate limit 60 req/min/IP (le ticker home poll peut spammer).
 *  - Validation stricte de `?ids` :
 *      * split par virgule, trim, lowercase, dedupe
 *      * filtrage contre une whitelist (CoinId enum top 6 + getAllCryptos)
 *      * ids invalides → drop silencieux ; si plus rien de valide → 400
 *      * > 50 ids → 400 (anti DoS / cache pollution unstable_cache)
 *  - `force-dynamic` + `runtime = "nodejs"` pour signaler explicitement à Next
 *    que la route est dynamique (le `revalidate = 60` historique reste OK pour
 *    le cache mémoire de `unstable_cache`, qui ne dépend pas du SSG).
 *
 * Contrat de réponse inchangé : `{ prices: CoinPrice[], updatedAt: string }`.
 */

import { NextResponse } from "next/server";
import {
  fetchPrices,
  fetchPricesWithSparkline,
  DEFAULT_COINS,
  type CoinId,
} from "@/lib/coingecko";
import { COIN_IDS } from "@/lib/historical-prices";
import { getAllCryptosUnified } from "@/lib/cryptos-extended";
import { resolveCryptoLogo } from "@/lib/crypto-logos";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Cache mémoire `unstable_cache` côté lib reste à 60 s (cf. lib/coingecko.ts).
// On ne déclare pas `revalidate` ici — incompatible avec `force-dynamic`.

const MAX_IDS = 50;

// Whitelist construite à partir de :
//  - DEFAULT_COINS / CoinId (ticker home) — 6 ids exacts servis par fetchPrices
//  - COIN_IDS (lib/historical-prices) — 40 cryptos usuelles
//  - getAllCryptosUnified() — 780 fiches (100 statiques + 680 LLM)
//
// Bug fix critique 2026-05-09 : avant on n'incluait que les 100 statiques,
// donc /api/prices?ids=<llm-id> renvoyait 400 alors que la fiche existait
// en DB. Lazy memoization (le helper unified cache 1h via unstable_cache).
let allowedIdsCache: Set<string> | null = null;
async function getAllowedIds(): Promise<Set<string>> {
  if (allowedIdsCache) return allowedIdsCache;
  const all = await getAllCryptosUnified();
  allowedIdsCache = new Set<string>([
    ...DEFAULT_COINS,
    ...Object.values(COIN_IDS),
    ...all.map((c) => c.coingeckoId),
  ]);
  return allowedIdsCache;
}

// FIX P0 audit-fonctionnel-live-final #4 : namespace KV pour isoler les compteurs.
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000, key: "prices" });

export async function GET(request: Request) {
  // ---- Rate limit ----
  const rl = await limiter(getClientIp(request));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes — réessaie dans une minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter),
          "X-RateLimit-Limit": "60",
          "X-RateLimit-Window": "60s",
        },
      }
    );
  }

  // ---- Parse + valide ?ids ----
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");

  let ids: CoinId[];
  if (!idsParam) {
    // Pas de paramètre → on sert le ticker par défaut (rétro-compatible).
    ids = DEFAULT_COINS;
  } else {
    // Split, trim, lowercase, dedupe.
    const raw = Array.from(
      new Set(
        idsParam
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter((s) => s.length > 0)
      )
    );

    // Anti DoS : > 50 ids → reject (évite la pollution du cache + payload CG).
    if (raw.length > MAX_IDS) {
      return NextResponse.json(
        { error: `Trop d'identifiants (max ${MAX_IDS}).` },
        { status: 400 }
      );
    }

    // Drop silencieux des ids hors whitelist (philosophie : tolérant aux typos
    // côté client, mais on coupe court si rien ne reste).
    const allowedIds = await getAllowedIds();
    const valid = raw.filter((id) => allowedIds.has(id));
    if (valid.length === 0) {
      return NextResponse.json(
        { error: "Aucun identifiant valide." },
        { status: 400 }
      );
    }
    ids = valid as CoinId[];
  }

  // Option : ?include=sparkline → renvoie chaque CoinPrice avec sparkline7d
  // (168 points horaires CoinGecko). Cache séparé pour ne pas dégrader
  // la latence des appels "light" qui n'ont pas besoin du payload sparkline.
  const includeParam = searchParams.get("include") ?? "";
  const includeSparkline = includeParam
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .includes("sparkline");

  const rawPrices = includeSparkline
    ? await fetchPricesWithSparkline(ids)
    : await fetchPrices(ids);

  // BUG FIX 2026-05-09 — `image: ""` leak.
  // `_fetchPrices` (price-source aggregator path) returns an empty `image`
  // by design : internal `<CryptoLogo>` does its own resolveCryptoLogo()
  // lookup with a gradient-initials fallback. But the JSON contract was
  // leaking `image: ""` to any external/future API consumer who can't
  // re-do that lookup. Fix : resolve server-side here so the wire format
  // always has a usable URL (CoinGecko CDN hardcoded mapping for the ~135
  // mapped coins, original API URL preserved when present).
  const prices = rawPrices.map((p) => ({
    ...p,
    image:
      p.image ||
      resolveCryptoLogo({ coingeckoId: p.id, symbol: p.symbol }) ||
      "",
  }));

  return NextResponse.json(
    { prices, updatedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}
