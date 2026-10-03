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
  "/academie/stablecoins",
  "/academie/staking",
  "/academie/choisir",
  "/blog",
  // Pricing & monétisation
  "/pack-declaration-crypto-2026",
  // Landings BATCH 7-10
  "/outils/succession-crypto",
  "/cgu",
  // Outils principaux
  "/outils/calculateur-fiscalite",
  "/outils/declaration-fiscale-crypto",
  "/outils/verificateur-mica",
  "/outils/portfolio-tracker",
  "/outils/calculateur-roi-crypto",
  "/outils/cerfa-2086-auto",
  "/cartes",
];

/** Adresses des plans du site news + articles dont <lastmod> date de moins de `hours` heures (best-effort, jamais bloquant). */
async function recentSitemapUrls(hours: number): Promise<string[]> {
  const since = Date.now() - hours * 3600 * 1000;
  const out: string[] = [];
  for (const sm of ["/sitemap-news.xml", "/sitemap-articles.xml"]) {
    try {
      const res = await fetch(`${BRAND.url}${sm}`, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
      if (!res.ok) continue;
      const xml = await res.text();
      for (const m of xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)) {
        const loc = m[1].trim();
        const t = m[2] ? Date.parse(m[2].trim()) : NaN;
        if (loc.startsWith(BRAND.url) && Number.isFinite(t) && t >= since) out.push(loc);
      }
    } catch {
      /* plan du site indisponible : on pousse au moins les pages fixes */
    }
  }
  return out;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!verifyBearer(req, process.env.CRON_SECRET)) {
    // 401 explicite (cohérence cron, voir evaluate-alerts).
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  /* AUDIT 03/10/2026 : en plus des pages fixes, les adresses PUBLIÉES OU MISES À JOUR depuis 72 h (plans du site news +
     articles) : c'est ce qui sert vraiment, Bing/Yandex n'apprenant pas les nouvelles actus autrement. */
  const fresh = await recentSitemapUrls(72);
  const fullUrls = Array.from(new Set([...CRITICAL_URLS.map((path) => `${BRAND.url}${path}`), ...fresh])).slice(0, 500);

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
