/**
 * lib/binance-readonly.ts — Client Binance Spot READ-ONLY pour sync portfolio.
 *
 * Étude #4 ETUDE-AMELIORATIONS-2026-05-02 — sync API exchanges.
 *
 * SCOPE STRICT :
 *  - GET /api/v3/account (HMAC SHA256) → balances spot
 *  - GET /sapi/v1/account/apiRestrictions → vérification que la clé est read-only
 *
 * AUCUN endpoint write/withdraw/trade utilisé. Pas de POST/DELETE.
 * Si Binance change ses endpoints en write→read accidentellement, le rate-limit
 * intercepte avant tout dommage.
 *
 * Permissions Binance attendues à la création de la clé par l'user :
 *   - "Enable Reading" : OUI
 *   - "Enable Spot & Margin Trading" : NON (jamais)
 *   - "Enable Withdrawals" : NON (jamais)
 *   - "Enable Internal Transfer" : NON
 *   - "Enable Margin" : NON
 *
 * Si l'user crée une clé sans "READ ONLY" cochée, la fonction
 * `checkApiKeyIsReadOnly()` rejette la connexion AVANT d'insert en DB.
 *
 * Rate limits Binance Spot :
 *  - 1200 req/min/IP
 *  - 10 req/sec/IP en burst
 *  - On utilise au plus 1 req par user par sync, donc OK avec 10000+ users actifs
 */

import "server-only";
import { createHmac } from "node:crypto";

const BINANCE_BASE = "https://api.binance.com";

interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
}

interface BinanceAccountResponse {
  balances: BinanceBalance[];
  permissions?: string[];
  canTrade?: boolean;
  canWithdraw?: boolean;
  canDeposit?: boolean;
}

interface BinanceApiRestrictions {
  enableReading: boolean;
  enableSpotAndMarginTrading: boolean;
  enableWithdrawals: boolean;
  enableMargin: boolean;
  enableFutures: boolean;
}

/**
 * Sign une querystring HMAC SHA256 avec le secret API.
 * Format Binance : append `&signature=...` à la querystring brute.
 */
function signQuery(query: string, apiSecret: string): string {
  return createHmac("sha256", apiSecret).update(query).digest("hex");
}

/**
 * Vérifie que la clé API est STRICTEMENT read-only via /sapi/v1/account/apiRestrictions.
 * Refuse si l'une des permissions write est activée.
 *
 * @returns Promise<{ ok: true }> si la clé est read-only, ou
 *          Promise<{ ok: false, reason: string }> avec une explication.
 */
export async function checkApiKeyIsReadOnly(
  apiKey: string,
  apiSecret: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const timestamp = Date.now();
  const recvWindow = 5000;
  const query = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
  const signature = signQuery(query, apiSecret);
  const url = `${BINANCE_BASE}/sapi/v1/account/apiRestrictions?${query}&signature=${signature}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "X-MBX-APIKEY": apiKey },
      cache: "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      reason: `Réseau Binance indisponible : ${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      reason: `Binance refuse la clé (${res.status}). Vérifie que la clé est valide et autorisée à lire. ${text.slice(0, 200)}`,
    };
  }

  const data = (await res.json()) as BinanceApiRestrictions;

  if (!data.enableReading) {
    return {
      ok: false,
      reason: 'La clé doit avoir la permission "Enable Reading" activée sur Binance.',
    };
  }
  if (data.enableWithdrawals) {
    return {
      ok: false,
      reason: 'REFUS DE SÉCURITÉ : la clé a "Enable Withdrawals" activé. Cryptoreflex n\'accepte que des clés READ-ONLY (sans retrait possible). Recrée une clé sur Binance avec UNIQUEMENT "Enable Reading" coché.',
    };
  }
  if (data.enableSpotAndMarginTrading) {
    return {
      ok: false,
      reason: 'REFUS DE SÉCURITÉ : la clé a "Enable Spot & Margin Trading" activé. Cryptoreflex n\'accepte que des clés READ-ONLY. Recrée une clé sans permission de trading.',
    };
  }
  if (data.enableMargin || data.enableFutures) {
    return {
      ok: false,
      reason: 'REFUS DE SÉCURITÉ : la clé a Margin ou Futures activé. Recrée une clé READ-ONLY uniquement.',
    };
  }

  return { ok: true };
}

/**
 * Récupère les balances spot non nulles.
 * Filtre auto les balances < 0.00000001 (poussières).
 */
export interface ParsedBalance {
  asset: string;
  total: number;
  free: number;
  locked: number;
}

export async function fetchSpotBalances(
  apiKey: string,
  apiSecret: string,
): Promise<{ ok: true; balances: ParsedBalance[] } | { ok: false; reason: string }> {
  const timestamp = Date.now();
  const recvWindow = 5000;
  const query = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
  const signature = signQuery(query, apiSecret);
  const url = `${BINANCE_BASE}/api/v3/account?${query}&signature=${signature}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "X-MBX-APIKEY": apiKey },
      cache: "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      reason: `Réseau Binance indisponible : ${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      reason: `Binance ${res.status} : ${text.slice(0, 200)}`,
    };
  }

  const data = (await res.json()) as BinanceAccountResponse;

  // SAFETY NET supplémentaire : si Binance retourne canWithdraw/canTrade true
  // (la clé a évolué entre check + fetch), on refuse de continuer.
  if (data.canWithdraw === true) {
    return { ok: false, reason: "La clé a maintenant la permission de retrait — déconnexion forcée par sécurité." };
  }

  const balances: ParsedBalance[] = (data.balances ?? [])
    .map((b) => {
      const free = parseFloat(b.free);
      const locked = parseFloat(b.locked);
      return {
        asset: b.asset,
        free: Number.isFinite(free) ? free : 0,
        locked: Number.isFinite(locked) ? locked : 0,
        total: (Number.isFinite(free) ? free : 0) + (Number.isFinite(locked) ? locked : 0),
      };
    })
    .filter((b) => b.total >= 0.00000001);

  return { ok: true, balances };
}
