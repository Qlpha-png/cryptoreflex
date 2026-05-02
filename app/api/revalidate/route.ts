/**
 * POST /api/revalidate?tag=articles
 *
 * Bust un tag `unstable_cache` à la demande. Endpoint protégé par CRON_SECRET.
 *
 * Pourquoi ce endpoint :
 *  Next.js `unstable_cache` peut hold un résultat (y compris `null`) jusqu'à
 *  `revalidate` secondes. Si Googlebot ou un visiteur hit `/blog/<slug>` AVANT
 *  qu'un nouvel article soit déployé, le cache stocke `null` pendant 1h, et la
 *  page renvoie "Article introuvable" même après le déploiement.
 *
 *  Cet endpoint permet de bust le cache sans attendre l'expiration naturelle :
 *    curl -X POST 'https://www.cryptoreflex.fr/api/revalidate?tag=articles' \
 *      -H 'Authorization: Bearer $CRON_SECRET'
 *
 * Tags supportés (pas de whitelist stricte — le tag est juste passé tel quel à
 * `revalidateTag`) :
 *  - `articles` : tous les articles MDX (lib/mdx.ts)
 *  - `cryptos`  : data/cryptos.json (si caché)
 *  - autres tags utilisés via `unstable_cache({tags: [...]}, ...)`
 *
 * Sécurité :
 *  - Header `Authorization: Bearer <CRON_SECRET>` obligatoire
 *  - Renvoie 404 sans header valide (security through obscurity)
 *
 * Roadmap future : auto-call ce endpoint via Vercel Deploy Hook après chaque
 * deploy, pour rendre le cache bust automatique.
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { verifyBearer } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Whitelist des tags & paths autorisés.
 *
 * Pourquoi une whitelist : éviter qu'un attaquant qui aurait CRON_SECRET
 * puisse bust n'importe quel cache (DoS). On ne expose que les buckets
 * dont le bust est cohérent avec l'usage légitime.
 *
 * Les tags news-mdx / ta-articles / events sont émis par les crons
 * aggregate-news, generate-ta et refresh-events après écriture / refresh ;
 * ils doivent être dans la whitelist pour qu'un commit manuel ou un script
 * externe puisse re-bust le cache sans passer par le cron complet.
 */
const ALLOWED_TAGS = new Set([
  "articles",         // tous les articles MDX (lib/mdx.ts)
  "cryptos",          // data/cryptos.json + dérivés
  "rss",              // alias historique du flux RSS aggregator
  "news-aggregated",  // tag réel utilisé par lib/news-aggregator.ts (audit Perf 26-04)
  "news-mdx",         // pages /actualites + /actualites/[slug] (Pilier 1)
  "ta-articles",      // analyses techniques /analyses-tech/[slug] (Pilier 2)
  "events",           // calendrier /calendrier (Pilier 4)
  "community-stats",  // /api/community-stats (LiveCommunityStats Footer + Pro)
  // Tags CoinGecko (étude #12 2026-05-02) — busts ciblés via cron orchestrator
  // ou debug admin. Le pattern `coingecko:crypto:<id>` est validé séparément
  // (whitelist dynamique sur le préfixe + slug whitelist coingeckoId).
  "coingecko:prices",
  "coingecko:market",
  "coingecko:global",
  "coingecko:portfolio",
]);

/**
 * Préfixes de tags acceptés en plus de la whitelist exacte ALLOWED_TAGS.
 * Permet le tag granulaire `coingecko:crypto:<id>` sans énumérer les 100 ids.
 *
 * Le suffixe est validé contre une regex stricte (slug kebab-case) pour
 * éviter qu'un attaquant ayant CRON_SECRET ne bust un tag arbitraire via
 * injection (`coingecko:crypto:../foo`, etc.).
 */
const ALLOWED_TAG_PREFIXES: Array<{ prefix: string; suffixRegex: RegExp }> = [
  { prefix: "coingecko:crypto:", suffixRegex: /^[a-z0-9][a-z0-9-]{0,59}$/ },
];

function isAllowedTag(tag: string): boolean {
  if (ALLOWED_TAGS.has(tag)) return true;
  for (const { prefix, suffixRegex } of ALLOWED_TAG_PREFIXES) {
    if (tag.startsWith(prefix)) {
      const suffix = tag.slice(prefix.length);
      if (suffixRegex.test(suffix)) return true;
    }
  }
  return false;
}

const PATH_REGEX = /^\/[a-z0-9\-/_\[\]]+$/i;
const PATH_MAX_LEN = 200;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;

  if (!verifyBearer(req, secret)) {
    // 404 délibéré pour ne pas révéler l'existence de la route à un scanner.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!secret) {
    console.warn(
      "[api/revalidate] CRON_SECRET absent — endpoint ouvert (mode dev).",
    );
  }

  const tag = req.nextUrl.searchParams.get("tag");
  const pathParam = req.nextUrl.searchParams.get("path");

  // Au moins un des deux est obligatoire.
  if (!tag && !pathParam) {
    return NextResponse.json(
      { error: "Either 'tag' or 'path' query param is required" },
      { status: 400 },
    );
  }

  const result: {
    tag?: string;
    path?: string;
    revalidatedAt: string;
  } = { revalidatedAt: new Date().toISOString() };

  try {
    if (tag) {
      if (!isAllowedTag(tag)) {
        return NextResponse.json(
          {
            error: `Tag '${tag}' not in whitelist`,
            allowed: [...ALLOWED_TAGS],
            allowedPrefixes: ALLOWED_TAG_PREFIXES.map((p) => p.prefix + "*"),
          },
          { status: 400 },
        );
      }
      revalidateTag(tag);
      result.tag = tag;
    }
    if (pathParam) {
      if (
        pathParam.length > PATH_MAX_LEN ||
        !PATH_REGEX.test(pathParam) ||
        pathParam.includes("..")
      ) {
        return NextResponse.json(
          { error: `Invalid path '${pathParam}'` },
          { status: 400 },
        );
      }
      revalidatePath(pathParam);
      result.path = pathParam;
    }

    console.info(
      `[api/revalidate] tag=${result.tag ?? "-"} path=${result.path ?? "-"} ts=${result.revalidatedAt}`,
    );
    return NextResponse.json(
      { ok: true, ...result },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[api/revalidate] tag=${tag ?? "-"} path=${pathParam ?? "-"} error=${message}`,
    );
    return NextResponse.json(
      { ok: false, tag, path: pathParam, error: message },
      { status: 500 },
    );
  }
}
