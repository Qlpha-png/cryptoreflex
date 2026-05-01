/**
 * lib/whale-watcher.ts — Récupération des grosses transactions on-chain
 * ("whale alerts") pour les principales cryptos majeures.
 *
 * Source primaire : Whale Alert REST API (https://docs.whale-alert.io/).
 *   - Free tier : 10 req/min, 60 req/heure → on couvre largement avec un cache
 *     `unstable_cache` 5 min côté serveur Next.
 *   - Auth : query string `?api_key=...` (pas de header).
 *   - Si `WHALE_ALERT_API_KEY` est absent OU si l'API renvoie une erreur, on
 *     retourne [] : le composant client masque alors le bloc proprement.
 *
 * Whitelist : on ne supporte que les blockchains les plus surveillées par
 * Whale Alert (BTC, ETH, SOL, XRP, BNB, TRX + stablecoins USDT/USDC dont les
 * gros mouvements sont éditorialement intéressants pour nos lecteurs).
 *
 * Pourquoi ne pas exposer toutes les cryptos ? Parce que :
 *   1. Whale Alert ne couvre qu'un sous-ensemble de chains.
 *   2. Sur les small/mid-caps, "whale" perd son sens (volumes faibles).
 *   3. Limite la surface d'erreur API (404 silencieux côté client).
 */

import { unstable_cache } from "next/cache";

/* -------------------------------------------------------------------------- */
/*  Types publics                                                             */
/* -------------------------------------------------------------------------- */

export type WhaleOwnerType = "exchange" | "wallet" | "unknown" | "defi";

export interface WhaleTransaction {
  /** Identifiant stable, utile comme key React. */
  id: string;
  /** Hash de transaction (peut être tronqué côté UI). */
  hash: string;
  /** Timestamp ISO 8601 (UTC). */
  timestamp: string;
  /** Montant en crypto natif (ex: 1234.56 BTC). */
  amountCrypto: number;
  /** Montant équivalent en USD au moment de la transaction. */
  amountUSD: number;
  /** Type de l'expéditeur (exchange = CEX, defi = protocole, wallet = unknown wallet). */
  fromType: WhaleOwnerType;
  /** Type du destinataire. */
  toType: WhaleOwnerType;
  /** Nom lisible si connu (ex: "Binance", "Coinbase"). */
  fromName?: string;
  toName?: string;
  /** Slug de la blockchain (ex: "bitcoin", "ethereum", "solana"). */
  blockchain: string;
}

/* -------------------------------------------------------------------------- */
/*  Whitelist & symboles supportés                                            */
/* -------------------------------------------------------------------------- */

/** Symboles supportés par notre intégration Whale Alert (uppercase). */
export const SUPPORTED_WHALE_SYMBOLS = [
  "BTC",
  "ETH",
  "USDT",
  "USDC",
  "SOL",
  "BNB",
  "XRP",
  "TRX",
] as const;

export type SupportedWhaleSymbol = (typeof SUPPORTED_WHALE_SYMBOLS)[number];

const SUPPORTED_SET: ReadonlySet<string> = new Set(SUPPORTED_WHALE_SYMBOLS);

export function isSupportedWhaleSymbol(symbol: string): boolean {
  return SUPPORTED_SET.has(symbol.toUpperCase());
}

/* -------------------------------------------------------------------------- */
/*  Mapping owner_type Whale Alert → notre type normalisé                     */
/* -------------------------------------------------------------------------- */

function normalizeOwnerType(raw: string | undefined | null): WhaleOwnerType {
  if (!raw) return "unknown";
  const v = raw.toLowerCase();
  if (v === "exchange") return "exchange";
  if (v === "defi" || v.includes("contract") || v.includes("dex")) return "defi";
  if (v === "wallet" || v === "personal") return "wallet";
  return "unknown";
}

/* -------------------------------------------------------------------------- */
/*  Réponse Whale Alert (typed minimaliste)                                   */
/* -------------------------------------------------------------------------- */

interface WhaleAlertParty {
  address?: string;
  owner?: string;
  owner_type?: string;
}

interface WhaleAlertTx {
  id?: string;
  hash?: string;
  blockchain?: string;
  symbol?: string;
  timestamp?: number;
  amount?: number;
  amount_usd?: number;
  from?: WhaleAlertParty;
  to?: WhaleAlertParty;
  transaction_type?: string;
}

interface WhaleAlertResponse {
  result?: string;
  count?: number;
  cursor?: string;
  transactions?: WhaleAlertTx[];
  message?: string;
}

/* -------------------------------------------------------------------------- */
/*  Fetch principal (non-cached)                                              */
/* -------------------------------------------------------------------------- */

async function fetchFromWhaleAlert(
  symbolUpper: SupportedWhaleSymbol,
  minUsdValue: number,
): Promise<WhaleTransaction[]> {
  const apiKey = process.env.WHALE_ALERT_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    api_key: apiKey,
    min_value: String(Math.max(500_000, minUsdValue)),
    currency: symbolUpper.toLowerCase(),
    limit: "10",
  });

  const url = `https://api.whale-alert.io/v1/transactions?${params.toString()}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      // Timeout court : si Whale Alert traîne, on coupe et on rend [] (silencieux côté UI).
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });

    if (!res.ok) {
      // 401 = clé invalide, 429 = rate-limited, 5xx = panne. Tous silencieux.
      return [];
    }

    const json = (await res.json()) as WhaleAlertResponse;
    if (json.result && json.result !== "success") return [];
    const txs = Array.isArray(json.transactions) ? json.transactions : [];

    return txs
      .map((tx, idx): WhaleTransaction | null => {
        if (
          typeof tx.amount !== "number" ||
          typeof tx.amount_usd !== "number" ||
          typeof tx.timestamp !== "number"
        ) {
          return null;
        }
        const hash = typeof tx.hash === "string" ? tx.hash : "";
        const id =
          (typeof tx.id === "string" && tx.id) || `${hash || "tx"}-${idx}`;

        return {
          id,
          hash,
          timestamp: new Date(tx.timestamp * 1000).toISOString(),
          amountCrypto: tx.amount,
          amountUSD: tx.amount_usd,
          fromType: normalizeOwnerType(tx.from?.owner_type),
          toType: normalizeOwnerType(tx.to?.owner_type),
          fromName: tx.from?.owner || undefined,
          toName: tx.to?.owner || undefined,
          blockchain: (tx.blockchain || "").toLowerCase(),
        };
      })
      .filter((t): t is WhaleTransaction => t !== null);
  } catch {
    // Erreurs réseau / timeout / parse → on rend [] silencieux.
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/*  API publique (cachée 5 min)                                               */
/* -------------------------------------------------------------------------- */

/**
 * Récupère les 5 plus grosses transactions whale pour un symbol crypto.
 *
 * @param symbol     Symbole de la crypto (BTC, ETH, ...). Case-insensitive.
 * @param minUsdValue Seuil USD minimal (défaut 1M). Whale Alert applique
 *                    un floor à 500k$ pour le free tier — on respecte ça.
 *
 * Returns :
 *   - [] si symbol non supporté, clé API absente, ou erreur réseau.
 *   - Sinon, top 5 transactions triées par amountUSD desc.
 */
async function _fetchRecentWhales(
  symbol: string,
  minUsdValue?: number,
): Promise<WhaleTransaction[]> {
  const upper = symbol.toUpperCase();
  if (!isSupportedWhaleSymbol(upper)) return [];

  const txs = await fetchFromWhaleAlert(
    upper as SupportedWhaleSymbol,
    minUsdValue ?? 1_000_000,
  );

  if (txs.length === 0) return [];

  // Tri par valeur USD descendante puis cap à 5.
  return [...txs]
    .sort((a, b) => b.amountUSD - a.amountUSD)
    .slice(0, 5);
}

/**
 * Cache 5 min via `unstable_cache`. La clé inclut symbol + minUsdValue pour
 * éviter les collisions entre seuils différents.
 */
export const fetchRecentWhales = unstable_cache(
  async (symbol: string, minUsdValue?: number) =>
    _fetchRecentWhales(symbol, minUsdValue),
  ["whale-watcher-v1"],
  { revalidate: 300, tags: ["whales"] },
);
