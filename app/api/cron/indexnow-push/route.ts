/**
 * GET /api/cron/indexnow-push — daily push IndexNow protocol
 *
 * Appelé par /api/cron/daily-orchestrator (job rapide, < 2s).
 * Pousse vers IndexNow (Bing/Yandex/Seznam) la liste des URLs critiques
 * pour accélérer leur indexation : home + hubs + landings BATCH 7-10
 * + nouveaux outils + plateformes récentes.
 *
 * Avantage : Bing/Yandex indexent en 1-24h vs 1 semaine sans push.
 * Coût : 1 requête HTTP/jour à api.indexnow.org. Quota IndexNow 10k/jour.
 *
 * Sécurité : Bearer CRON_SECRET obligatoire (404 sinon, security through
 * obscurity).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth";
import { BRAND } from "@/lib/brand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// URLs critiques à pousser quotidiennement. On garde une whitelist plutôt
// que tout le sitemap pour rester sous 100 URLs/jour (best practice
// IndexNow : ne pas spam, focus sur les pages réellement modifiées).
const CRITICAL_URLS = [
  // Hubs
  "/",
  "/comparatif",
  "/avis",
  "/cryptos",
  "/outils",
  "/actualites",
  "/marche",
  "/quiz",
  "/academie",
  "/blog",
  // Pricing & monétisation
  "/pro",
  "/pro-plus",
  "/pack-declaration-crypto-2026",
  // Landings BATCH 7-10
  "/outils/whale-radar",
  "/outils/phishing-checker",
  "/outils/allocator-ia",
  "/outils/gas-tracker-fr",
  "/outils/export-expert-comptable",
  "/outils/crypto-license",
  "/outils/succession-crypto",
  "/outils/dca-lab",
  "/cgu",
  // Outils principaux
  "/outils/calculateur-fiscalite",
  "/outils/declaration-fiscale-crypto",
  "/outils/verificateur-mica",
  "/outils/portfolio-tracker",
  "/outils/calculateur-roi-crypto",
];

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!verifyBearer(req, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fullUrls = CRITICAL_URLS.map((path) => `${BRAND.url}${path}`);

  // Push interne vers /api/indexnow (réutilise la logique d'auth + push)
  let upstreamStatus = 0;
  let upstreamBody = "";
  try {
    const res = await fetch(`${BRAND.url}/api/indexnow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ urls: fullUrls }),
      // Timeout 10s (job orchestrator a un budget de 12s par sous-cron)
      signal: AbortSignal.timeout(10_000),
    });
    upstreamStatus = res.status;
    upstreamBody = await res.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "Push failed: " + message },
      { status: 502 },
    );
  }

  const ok = upstreamStatus >= 200 && upstreamStatus < 300;
  console.info(
    `[cron/indexnow-push] urls=${fullUrls.length} status=${upstreamStatus} ok=${ok}`,
  );

  return NextResponse.json(
    {
      ok,
      pushed: fullUrls.length,
      upstreamStatus,
      upstreamBody: upstreamBody.slice(0, 300),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
