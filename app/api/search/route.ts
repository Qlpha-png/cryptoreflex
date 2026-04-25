/**
 * GET /api/search?q=...&limit=20
 * GET /api/search?index=1
 *
 * FIX P0 audit-fonctionnel-live-final #1 : wrapper API pour la recherche unifiée
 * Cryptoreflex (alimentait le ⌘K CommandPalette qui cassait sans cette route).
 *
 * Deux modes :
 *
 *   1. Mode "index" : `?index=1`
 *      Renvoie l'index complet `{ items: SearchItem[] }` pour permettre au
 *      composant client `<CommandPalette/>` de faire son filtrage en local
 *      (latence zéro pour chaque keystroke). Cache long, l'index ne bouge
 *      qu'au build.
 *
 *   2. Mode "search" : `?q=...&limit=20`
 *      Renvoie `{ results: SearchResult[], total: number, query: string }`
 *      après scoring serveur (pour les intégrations externes / API publique).
 *
 * Sécurité :
 *  - Runtime Node.js (l'index lit les MDX via `node:fs` — incompatible edge).
 *    NB : la spec initiale demandait edge, mais `getSearchIndex()` traverse
 *    `lib/mdx.ts` qui utilise `fs.readdir` ; sur edge cela explose au premier
 *    appel. Cohérent avec les autres routes (convert/historical/prices).
 *  - Rate limit 60 req/min/IP via le helper unifié `lib/rate-limit.ts`
 *    (namespace KV "search" pour isoler des autres routes).
 *  - Validation `q` : min 1 char, max 80 chars.
 *  - `limit` clampé entre 1 et 50, défaut 20.
 *
 * Cache : `s-maxage=60, stale-while-revalidate=300` côté CDN.
 */

import { NextResponse } from "next/server";
import { getSearchIndex, searchIndex } from "@/lib/search";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// FIX P0 audit-fonctionnel-live-final #4 : namespace KV pour isoler les compteurs.
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000, key: "search" });

const MAX_QUERY_LENGTH = 80;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(req: Request): Promise<Response> {
  // ---- Rate limit ----
  const rl = await limiter(getClientIp(req));
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
      },
    );
  }

  try {
    const { searchParams } = new URL(req.url);

    // ---- Mode "index complet" : ?index=1 ----
    // Utilisé par <CommandPalette/> qui charge l'index une fois puis filtre
    // côté client (zero latency entre keystrokes).
    if (searchParams.get("index") === "1") {
      const items = await getSearchIndex();
      return NextResponse.json(
        { items, total: items.length },
        {
          headers: {
            // Index = données quasi-statiques, on peut cacher long.
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
          },
        },
      );
    }

    // ---- Mode "search" : ?q=...&limit=... ----
    const rawQuery = searchParams.get("q") ?? "";
    const query = rawQuery.trim();

    if (query.length === 0) {
      return NextResponse.json(
        { error: "Paramètre `q` requis (min 1 caractère)." },
        { status: 400 },
      );
    }
    if (query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `Requête trop longue (max ${MAX_QUERY_LENGTH} caractères).` },
        { status: 400 },
      );
    }

    // Clamp `limit` ∈ [1, MAX_LIMIT], défaut DEFAULT_LIMIT.
    const rawLimit = parseInt(searchParams.get("limit") ?? "", 10);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;

    const index = await getSearchIndex();
    const results = searchIndex(index, query, limit);

    return NextResponse.json(
      { results, total: results.length, query },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (err) {
    console.error("[search] handler error:", err);
    return NextResponse.json(
      { error: "Erreur interne." },
      { status: 500 },
    );
  }
}
