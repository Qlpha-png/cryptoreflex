/**
 * GET /api/diag/api-usage
 *
 * Diagnostic léger : test instantané du quota CoinGecko depuis le serveur.
 * Indique si l'IP est ban (429 immédiat) ou OK (200 + payload).
 *
 * Usage :
 *   curl https://www.cryptoreflex.fr/api/diag/api-usage
 *
 * Réponse : { coingeckoStatus, kvStaticDetails, kvTickerPrices, durationMs }
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const startedAt = Date.now();
  const checks: Record<string, unknown> = {};

  // 1. Test CG free direct
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin&per_page=1&page=1",
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    checks.coingeckoStatus = {
      httpCode: r.status,
      banned: r.status === 429,
      ok: r.ok,
    };
  } catch (err) {
    checks.coingeckoStatus = {
      error: err instanceof Error ? err.message : "unknown",
    };
  }

  // 2. Test CryptoCompare
  try {
    const r = await fetch(
      "https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC&tsyms=USD",
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    const text = await r.text().catch(() => "");
    const isOver = text.includes("over your rate limit");
    checks.cryptocompareStatus = {
      httpCode: r.status,
      rateLimited: isOver,
      ok: r.ok && !isOver,
    };
  } catch (err) {
    checks.cryptocompareStatus = {
      error: err instanceof Error ? err.message : "unknown",
    };
  }

  // 3. Vérif KV static-details + ticker live + ticker stale
  // FIX 2026-05-14 (Phase 2) — `kvTickerPricesStale` ajouté pour observer
  // le fallback 6h utilisé quand le cron GH Actions skip (gaps 65-246 min).
  // FIX 2026-05-14 (Phase 3) — extrait `fetchedAt` du wrapper pour observer
  // l'âge réel des données ticker (utile pour debug stale UX).
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvToken) {
    for (const [name, key] of [
      ["kvStaticDetails", "cg-static-details:v1"],
      ["kvTickerPrices", "cg-ticker-prices:v1"],
      ["kvTickerPricesStale", "cg-ticker-prices:stale:v1"],
    ] as const) {
      try {
        const r = await fetch(
          `${kvUrl.replace(/\/$/, "")}/get/${encodeURIComponent(key)}`,
          {
            headers: { Authorization: `Bearer ${kvToken}` },
            signal: AbortSignal.timeout(3000),
          },
        );
        if (r.ok) {
          const data = (await r.json()) as { result?: string | null };
          if (typeof data.result === "string" && data.result.length > 0) {
            const parsed = JSON.parse(data.result) as Record<string, unknown>;
            // Détection nouveau format wrapper `{ prices, fetchedAt }` vs
            // legacy direct `Record<id, entry>` (cf. lib/kv-ticker.ts).
            const wrapped =
              parsed &&
              "prices" in parsed &&
              typeof (parsed as { prices?: unknown }).prices === "object";
            const inner = wrapped
              ? ((parsed as { prices: Record<string, unknown> }).prices ?? {})
              : parsed;
            const fetchedAt = wrapped
              ? ((parsed as { fetchedAt?: string }).fetchedAt ?? null)
              : null;
            const keysCount = Object.keys(inner).length;
            const ageMs = fetchedAt ? Math.max(0, Date.now() - Date.parse(fetchedAt)) : null;
            checks[name] = {
              keysCount,
              sampleIds: Object.keys(inner).slice(0, 5),
              sizeKB: Math.round(data.result.length / 1024),
              ...(fetchedAt ? { fetchedAt } : {}),
              ...(ageMs !== null ? { ageSeconds: Math.round(ageMs / 1000) } : {}),
            };
          } else {
            checks[name] = { empty: true };
          }
        } else {
          checks[name] = { error: `KV ${r.status}` };
        }
      } catch (err) {
        checks[name] = { error: err instanceof Error ? err.message : "unknown" };
      }
    }
  } else {
    checks.kv = { mocked: true };
  }

  return NextResponse.json({
    ...checks,
    durationMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  });
}
