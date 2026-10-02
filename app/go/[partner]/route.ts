/**
 * /go/[partner] — Affiliate tracking redirect.
 *
 * Flow :
 *  1. User clique CTA partenaire sur /partenaires (ou ailleurs)
 *  2. URL pointe vers /go/{slug}?ctx={contexte}&pos={position}
 *  3. On enregistre le clic côté serveur (compteur KV + ligne de log)
 *  4. On redirect 302 vers l'URL affiliée du partenaire avec UTM ajoutés
 *
 * FIX 2026-10-02 — le clic n'était plus enregistré nulle part :
 *  - la ligne « [affiliate-click] » passait par console.log, supprimé du
 *    bundle prod par `compiler.removeConsole` (next.config.js garde seulement
 *    error + warn) → console.warn désormais ;
 *  - ajout d'un compteur KV, même schéma que /api/analytics/affiliate-click
 *    → visible dans /admin/stats (placement = `go-{ctx}`) :
 *      analytics:aff-click:{slug}:go-{ctx}:{YYYYMMDD}  (TTL 60 j)
 *      analytics:aff-click:total:{slug}                (TTL 1 an)
 *  - fail-open : KV absent / lent / en erreur → la redirection part quand
 *    même (attente KV bornée à KV_BUDGET_MS).
 *  - ne compte PAS les prefetch du routeur Next (<Link> préfetche les /go
 *    visibles à l'écran) ni les bots déclarés : ce ne sont pas des clics.
 *
 * Privacy : on log le partenaire + contexte mais PAS d'IP / user-agent
 * (RGPD-friendly, pas de cookie tracker). Le user-agent est seulement testé
 * contre une liste de bots, jamais stocké.
 *
 * Disclosure obligatoire : la mention "Lien affilié - commission perçue"
 * est visible sur /partenaires AVANT chaque CTA (loi 9 juin 2023).
 */

import { NextRequest, NextResponse } from "next/server";
import { getPartner } from "@/data/partners";
import { getKv } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** TTL des compteurs jour (60 jours) — aligné sur /api/analytics/affiliate-click. */
const DAILY_TTL_SEC = 60 * 24 * 60 * 60;
/** TTL des compteurs cumulés (1 an) — idem. */
const TOTAL_TTL_SEC = 365 * 24 * 60 * 60;
/** Attente max de l'écriture KV avant de rediriger quand même. */
const KV_BUDGET_MS = 800;

const BOT_UA =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|curl|wget|python-requests|httpclient|headless|lighthouse/i;

/** Segment de clé / log sûr : [a-z0-9-], 32 caractères max. */
function safeSegment(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  const s = raw.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 32);
  return s.length > 0 ? s : fallback;
}

/** YYYYMMDD UTC (bucket jour, même format que /api/analytics/affiliate-click). */
function todayUtcKey(): string {
  const d = new Date();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}${mm}${dd}`;
}

/**
 * Prefetch / requête RSC du routeur Next, ou prefetch navigateur : pas un clic
 * humain. Le routeur client ajoute TOUJOURS `?_rsc=` à ses requêtes (prefetch
 * comme navigation client) ; or une redirection vers un domaine tiers ne peut
 * pas aboutir en fetch RSC (CORS) → Next retombe sur une navigation classique,
 * sans `_rsc`, qui elle est comptée. Constaté avec `next start` : les en-têtes
 * RSC / Next-Router-Prefetch n'arrivent pas jusqu'au handler → `_rsc` est le
 * signal fiable ; les en-têtes restent testés par sécurité.
 */
function isPrefetch(req: NextRequest): boolean {
  if (req.nextUrl.searchParams.has("_rsc")) return true;
  if (req.headers.get("next-router-prefetch")) return true;
  if (req.headers.has("rsc")) return true;
  const purpose = req.headers.get("sec-purpose") ?? req.headers.get("purpose") ?? "";
  return /prefetch|prerender/i.test(purpose);
}

async function recordClick(slug: string, ctx: string): Promise<void> {
  const kv = getKv();
  const dayKey = `analytics:aff-click:${slug}:go-${ctx}:${todayUtcKey()}`;
  const totalKey = `analytics:aff-click:total:${slug}`;
  // get + set (pas d'INCR dans KvClient) — même approche, et même tolérance
  // aux courses concurrentes, que /api/analytics/affiliate-click.
  const [curDay, curTotal] = await Promise.all([
    kv.get<number>(dayKey),
    kv.get<number>(totalKey),
  ]);
  await Promise.all([
    kv.set(dayKey, (curDay ?? 0) + 1, { ex: DAILY_TTL_SEC }),
    kv.set(totalKey, (curTotal ?? 0) + 1, { ex: TOTAL_TTL_SEC }),
  ]);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { partner: string } }
) {
  const partner = getPartner(params.partner);

  if (!partner) {
    // Partenaire inconnu → redirect vers /partenaires (404 explicit)
    return NextResponse.redirect(new URL("/partenaires", req.url));
  }

  // Récupère contexte + position pour analytics
  const sp = req.nextUrl.searchParams;
  const ctx = sp.get("ctx") ?? "direct";
  const pos = sp.get("pos") ?? "default";

  const userAgent = req.headers.get("user-agent") ?? "";
  if (!isPrefetch(req) && !BOT_UA.test(userAgent)) {
    const safeCtx = safeSegment(ctx, "direct");
    const safePos = safeSegment(pos, "default");
    // console.warn (et non .log) : survit au removeConsole de next.config.js.
    console.warn(
      `[affiliate-click] partner=${partner.slug} ctx=${safeCtx} pos=${safePos}`
    );
    // Fail-open + budget borné : la redirection ne dépend jamais du KV.
    await Promise.race([
      recordClick(partner.slug, safeCtx).catch((err: unknown) => {
        console.warn(
          "[affiliate-click] KV error:",
          err instanceof Error ? err.message : String(err)
        );
      }),
      new Promise<void>((resolve) => setTimeout(resolve, KV_BUDGET_MS)),
    ]);
  }

  // Construit l'URL affiliée finale avec UTM enrichis
  const targetUrl = new URL(partner.affiliateUrl);
  targetUrl.searchParams.set("utm_source", "cryptoreflex");
  targetUrl.searchParams.set("utm_medium", "affiliate");
  targetUrl.searchParams.set("utm_campaign", partner.slug);
  if (ctx !== "direct") targetUrl.searchParams.set("utm_content", ctx);

  // Redirect 302 (temporary) — préserve le tracking partenaire
  const response = NextResponse.redirect(targetUrl.toString(), 302);

  // Headers no-cache (chaque clic doit être loggé, pas servi depuis cache)
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Referrer-Policy", "no-referrer-when-downgrade");

  return response;
}
