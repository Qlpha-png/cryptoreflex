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
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    const expected = `Bearer ${secret}`;
    if (auth !== expected) {
      // 404 délibéré pour ne pas révéler l'existence de la route à un scanner.
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } else {
    console.warn(
      "[api/revalidate] CRON_SECRET absent — endpoint ouvert (mode dev).",
    );
  }

  const tag = req.nextUrl.searchParams.get("tag");
  if (!tag || tag.length === 0 || tag.length > 64) {
    return NextResponse.json(
      { error: "Missing or invalid 'tag' query param" },
      { status: 400 },
    );
  }

  try {
    revalidateTag(tag);
    console.info(`[api/revalidate] tag=${tag} ts=${new Date().toISOString()}`);
    return NextResponse.json(
      { ok: true, tag, revalidatedAt: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[api/revalidate] tag=${tag} error=${message}`);
    return NextResponse.json(
      { ok: false, tag, error: message },
      { status: 500 },
    );
  }
}
