/**
 * POST /api/indexnow — Push d'URLs vers IndexNow (Bing/Yandex/Seznam).
 *
 * IndexNow est un protocole open standard (Microsoft + Yandex) qui permet
 * d'informer les moteurs de recherche d'une URL nouvelle/modifiée
 * INSTANTANÉMENT (au lieu d'attendre que le crawler revienne 1×/sem).
 *
 * Doc officielle : https://www.indexnow.org/documentation
 *
 * Flow :
 *   1. Notre code (post-deploy hook ou cron Vercel) appelle ce endpoint avec
 *      la liste des URLs publiées/modifiées.
 *   2. On forwarde la liste vers https://api.indexnow.org/indexnow avec
 *      notre clé (validée via /<key>.txt côté public/).
 *   3. Bing/Yandex récupèrent et indexent en 1-24h (vs 1 sem sans IndexNow).
 *
 * SÉCURITÉ :
 *   - Header `Authorization: Bearer <CRON_SECRET>` obligatoire (404 sinon).
 *   - Limite à 10 000 URLs par appel (limite IndexNow).
 *   - Toutes les URLs doivent être sur cryptoreflex.fr (host check strict).
 *
 * Usage curl :
 *   curl -X POST 'https://www.cryptoreflex.fr/api/indexnow' \
 *     -H 'Authorization: Bearer $CRON_SECRET' \
 *     -H 'Content-Type: application/json' \
 *     -d '{"urls":["https://www.cryptoreflex.fr/outils/whale-radar"]}'
 *
 * IMPACT SEO : indexation BATCH 7-10 sous 24h (vs 1-3 semaines sans push).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth";
import { BRAND } from "@/lib/brand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INDEXNOW_KEY = "792f234f25a214f89fc8cd718f634943";
const KEY_LOCATION = `${BRAND.url}/${INDEXNOW_KEY}.txt`;
const HOST = new URL(BRAND.url).host; // www.cryptoreflex.fr

// Endpoint générique IndexNow — fan-out automatique vers Bing+Yandex+Seznam.
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

const MAX_URLS_PER_CALL = 10_000;

interface IndexNowBody {
  /** Liste d'URLs absolues à pusher. Doivent être sur le host configuré. */
  urls?: string[];
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!verifyBearer(req, process.env.CRON_SECRET)) {
    // 404 stealth pour ne pas révéler l'endpoint à un scanner.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: IndexNowBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const urls = Array.isArray(body.urls) ? body.urls : [];
  if (urls.length === 0) {
    return NextResponse.json(
      { error: "Champ 'urls' requis (array non vide)" },
      { status: 400 },
    );
  }

  if (urls.length > MAX_URLS_PER_CALL) {
    return NextResponse.json(
      { error: `Maximum ${MAX_URLS_PER_CALL} URLs par appel` },
      { status: 400 },
    );
  }

  // Filtrage strict : toutes les URLs doivent être sur notre host.
  const validUrls: string[] = [];
  const rejectedUrls: string[] = [];
  for (const u of urls) {
    if (typeof u !== "string") continue;
    try {
      const parsed = new URL(u);
      if (parsed.host === HOST && parsed.protocol === "https:") {
        validUrls.push(parsed.toString());
      } else {
        rejectedUrls.push(u);
      }
    } catch {
      rejectedUrls.push(u);
    }
  }

  if (validUrls.length === 0) {
    return NextResponse.json(
      {
        error: "Aucune URL valide (host doit être " + HOST + ", https://)",
        rejected: rejectedUrls,
      },
      { status: 400 },
    );
  }

  // Push IndexNow protocol : POST JSON.
  const indexNowPayload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: validUrls,
  };

  let upstreamStatus = 0;
  let upstreamBody = "";
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
      },
      body: JSON.stringify(indexNowPayload),
    });
    upstreamStatus = res.status;
    upstreamBody = await res.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "Upstream fetch failed: " + message },
      { status: 502 },
    );
  }

  // IndexNow renvoie 200 (success) ou 202 (accepted, batch). 4xx = erreur réelle.
  const ok = upstreamStatus >= 200 && upstreamStatus < 300;

  console.info(
    `[indexnow] urls=${validUrls.length} rejected=${rejectedUrls.length} status=${upstreamStatus}`,
  );

  return NextResponse.json(
    {
      ok,
      pushed: validUrls.length,
      rejected: rejectedUrls.length,
      upstreamStatus,
      upstreamBody: upstreamBody.slice(0, 500), // tronqué pour éviter logs énormes
    },
    { status: ok ? 200 : 502, headers: { "Cache-Control": "no-store" } },
  );
}
