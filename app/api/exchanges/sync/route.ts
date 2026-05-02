/**
 * POST /api/exchanges/sync
 *
 * Body : { provider: "binance" }
 *
 * Fetch les balances spot Binance via la connexion stockée + chiffrée,
 * et retourne la liste mappée vers les coingeckoId du site (compatible
 * avec lib/portfolio.ts pour import dans le portefeuille local).
 *
 * SÉCURITÉ :
 *  - Auth user obligatoire
 *  - Décryption SERVER-SIDE uniquement (jamais l'API key en clair côté client)
 *  - Le client reçoit les BALANCES (asset + amount), JAMAIS les API keys
 *  - Rate limit : 1 sync/min/user (anti spam Binance)
 *  - Si 5 fails consécutifs → connexion auto-disabled (sécurité)
 *
 * Réponse :
 *   200 { ok: true, balances: [{ symbol, coingeckoId, total, free, locked }],
 *         lastSyncedAt: ISO }
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/exchange-crypto";
import { fetchSpotBalances } from "@/lib/binance-readonly";
import { BINANCE_TO_COINGECKO } from "@/lib/binance-mapping";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({
  limit: 1,
  windowMs: 60 * 1000,
  key: "exchanges-sync",
});

const MAX_CONSECUTIVE_FAILURES = 5;

interface SyncBody {
  provider?: unknown;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Connexion requise." },
      { status: 401 },
    );
  }

  const rl = await limiter(user.id);
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `Sync trop fréquente. Réessaie dans ${rl.retryAfter}s.`,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: SyncBody;
  try {
    body = (await req.json()) as SyncBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON invalide." },
      { status: 400 },
    );
  }

  const provider =
    typeof body.provider === "string" ? body.provider.toLowerCase().trim() : "";
  if (provider !== "binance") {
    return NextResponse.json(
      { ok: false, error: "Provider non supporté." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Service indisponible." },
      { status: 503 },
    );
  }

  // 1. Récupère la connexion chiffrée
  const { data: conn, error: selectErr } = await supabase
    .from("user_exchange_connections")
    .select("id, api_key_encrypted, api_secret_encrypted, consecutive_failures")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .maybeSingle();

  if (selectErr || !conn) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Aucune connexion Binance trouvée. Connecte d'abord ton compte via /portefeuille → Connecter Binance.",
      },
      { status: 404 },
    );
  }

  if ((conn.consecutive_failures ?? 0) >= MAX_CONSECUTIVE_FAILURES) {
    return NextResponse.json(
      {
        ok: false,
        error: `Connexion désactivée après ${MAX_CONSECUTIVE_FAILURES} échecs consécutifs. Reconnecte ta clé Binance.`,
      },
      { status: 403 },
    );
  }

  // 2. Decrypt
  let apiKey: string;
  let apiSecret: string;
  try {
    apiKey = decryptSecret(conn.api_key_encrypted);
    apiSecret = decryptSecret(conn.api_secret_encrypted);
  } catch (err) {
    console.error(
      "[exchanges/sync] decrypt failed:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      {
        ok: false,
        error:
          "Impossible de déchiffrer la clé. La clé maître a peut-être été rotée. Reconnecte ton compte Binance.",
      },
      { status: 500 },
    );
  }

  // 3. Fetch Binance
  const binanceRes = await fetchSpotBalances(apiKey, apiSecret);

  if (!binanceRes.ok) {
    // Increment consecutive_failures
    await supabase
      .from("user_exchange_connections")
      .update({
        last_sync_status: "error",
        last_sync_error: binanceRes.reason.slice(0, 500),
        consecutive_failures: (conn.consecutive_failures ?? 0) + 1,
      })
      .eq("id", conn.id);

    return NextResponse.json(
      { ok: false, error: binanceRes.reason },
      { status: 502 },
    );
  }

  // 4. Map Binance asset → coingeckoId via BINANCE_TO_COINGECKO
  // (BINANCE_TO_COINGECKO est mappé sur les paires <SYMBOL>USDT, on doit
  // dériver l'asset → coingecko depuis ces paires).
  const assetToCoingecko = new Map<string, string>();
  for (const [pair, cgId] of Object.entries(BINANCE_TO_COINGECKO)) {
    const asset = pair.replace(/USDT$/, "");
    assetToCoingecko.set(asset, cgId);
  }
  // Cas particuliers : USDT / USDC / EUR → mappés directement
  assetToCoingecko.set("USDT", "tether");
  assetToCoingecko.set("USDC", "usd-coin");
  assetToCoingecko.set("BUSD", "binance-usd");

  const mappedBalances = binanceRes.balances
    .map((b) => ({
      symbol: b.asset,
      coingeckoId: assetToCoingecko.get(b.asset) ?? null,
      total: b.total,
      free: b.free,
      locked: b.locked,
    }))
    // On garde aussi les balances non mappées (pour info user) mais elles
    // ne pourront pas être importées dans le portfolio local.
    .sort((a, b) => b.total - a.total);

  // 5. Update connexion
  const lastSyncedAt = new Date().toISOString();
  await supabase
    .from("user_exchange_connections")
    .update({
      last_sync_status: "ok",
      last_sync_error: null,
      consecutive_failures: 0,
      last_synced_at: lastSyncedAt,
    })
    .eq("id", conn.id);

  return NextResponse.json({
    ok: true,
    balances: mappedBalances,
    lastSyncedAt,
    provider: "binance",
  });
}
