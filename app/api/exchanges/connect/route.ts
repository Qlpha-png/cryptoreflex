/**
 * POST /api/exchanges/connect
 *
 * Body : { provider: "binance", apiKey: string, apiSecret: string, label?: string }
 *
 * Workflow sécurité :
 *  1. Auth obligatoire (getUser)
 *  2. Validation provider (whitelist : "binance" only en V1)
 *  3. Validation format apiKey + apiSecret (longueur min 32 chars)
 *  4. CHECK READ-ONLY via /sapi/v1/account/apiRestrictions :
 *     - Refuse si enableWithdrawals OU enableSpotAndMarginTrading activés
 *     - Refuse si enableReading absent
 *  5. Chiffrement AES-256-GCM
 *  6. Upsert en DB (1 connexion par (user_id, provider))
 *
 * Réponses :
 *  - 200 { ok: true, connectionId } si OK
 *  - 400 { ok: false, error, securityRefused?: boolean } si validation
 *  - 401 si pas connecté
 *  - 503 si chiffrement non configuré (EXCHANGE_ENCRYPTION_KEY manquante)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { encryptSecret, isExchangeCryptoReady } from "@/lib/exchange-crypto";
import { checkApiKeyIsReadOnly } from "@/lib/binance-readonly";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 5 tentatives de connexion / 10 min / user — anti brute force sur API keys.
const limiter = createRateLimiter({
  limit: 5,
  windowMs: 10 * 60 * 1000,
  key: "exchanges-connect",
});

const ALLOWED_PROVIDERS = new Set(["binance"]);

interface ConnectBody {
  provider?: unknown;
  apiKey?: unknown;
  apiSecret?: unknown;
  label?: unknown;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Connexion requise." },
      { status: 401 },
    );
  }

  // 2. Rate limit
  const rl = await limiter(user.id);
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `Trop de tentatives. Réessaie dans ${Math.ceil(rl.retryAfter / 60)} min.`,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  // 3. Crypto config
  if (!isExchangeCryptoReady()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Service indisponible (chiffrement non configuré). Contacte le support si le problème persiste.",
      },
      { status: 503 },
    );
  }

  // 4. Parse body
  let body: ConnectBody;
  try {
    body = (await req.json()) as ConnectBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON invalide." },
      { status: 400 },
    );
  }

  const provider =
    typeof body.provider === "string" ? body.provider.toLowerCase().trim() : "";
  const apiKey =
    typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const apiSecret =
    typeof body.apiSecret === "string" ? body.apiSecret.trim() : "";
  const label =
    typeof body.label === "string" ? body.label.trim().slice(0, 80) : null;

  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Provider non supporté. Pour l'instant, seul "binance" est disponible. Coinbase / Kraken arrivent.`,
      },
      { status: 400 },
    );
  }
  if (apiKey.length < 32 || apiKey.length > 256) {
    return NextResponse.json(
      { ok: false, error: "API Key invalide (longueur)." },
      { status: 400 },
    );
  }
  if (apiSecret.length < 32 || apiSecret.length > 256) {
    return NextResponse.json(
      { ok: false, error: "API Secret invalide (longueur)." },
      { status: 400 },
    );
  }

  // 5. CHECK READ-ONLY (refus strict si write/withdraw activés)
  const securityCheck = await checkApiKeyIsReadOnly(apiKey, apiSecret);
  if (!securityCheck.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: securityCheck.reason,
        securityRefused: true,
      },
      { status: 400 },
    );
  }

  // 6. Chiffrement + upsert DB
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Service indisponible (DB)." },
      { status: 503 },
    );
  }

  let apiKeyEncrypted: string;
  let apiSecretEncrypted: string;
  try {
    apiKeyEncrypted = encryptSecret(apiKey);
    apiSecretEncrypted = encryptSecret(apiSecret);
  } catch (err) {
    console.error(
      "[exchanges/connect] encrypt failed:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { ok: false, error: "Erreur de chiffrement. Réessaie." },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("user_exchange_connections")
    .upsert(
      {
        user_id: user.id,
        provider,
        label,
        api_key_encrypted: apiKeyEncrypted,
        api_secret_encrypted: apiSecretEncrypted,
        is_read_only: true,
        last_sync_status: "pending",
        consecutive_failures: 0,
      },
      { onConflict: "user_id,provider" },
    )
    .select("id")
    .single();

  if (error || !data) {
    console.error(
      "[exchanges/connect] upsert error:",
      error?.message,
    );
    return NextResponse.json(
      { ok: false, error: "Impossible d'enregistrer la connexion." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    connectionId: data.id,
    provider,
    message: "Connexion enregistrée. Lance la sync pour importer tes balances.",
  });
}
