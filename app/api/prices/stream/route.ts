/**
 * GET /api/prices/stream?ids=bitcoin,ethereum,...
 *
 * Endpoint Server-Sent Events (SSE) qui re-broadcast les prix Binance
 * spot en temps quasi-réel (poll Binance REST 2.5s côté serveur, push
 * SSE côté client). Mutualise les hits Binance entre tous les onglets
 * connectés (les 4 onglets d'un même client = 1 seul polling Binance
 * réel par instance Edge).
 *
 * --------------------------------------------------------------
 * Choix d'architecture : pourquoi REST→SSE et pas WS direct ?
 * --------------------------------------------------------------
 * Vercel Edge Runtime n'expose pas l'API `WebSocket` cliente
 * (uniquement Web Streams API + fetch). On ne peut donc PAS ouvrir
 * `new WebSocket("wss://stream.binance.com:...")` depuis l'Edge.
 * Solution : poll Binance REST `/api/v3/ticker/24hr` (gratuit,
 * sans clé, rate-limit large 6000 weight/min, 1 batch ~10-40 symbols
 * = 2 weight) toutes les 2.5s côté serveur, et stream les diffs en
 * SSE aux clients. C'est encore ~50× plus frais que le polling client
 * 120s actuel, et sans empreinte CoinGecko.
 *
 * --------------------------------------------------------------
 * Format SSE
 * --------------------------------------------------------------
 *   data: {"id":"bitcoin","price":97234.12,"change24h":1.42,"ts":1714...}\n\n
 *
 *   : ping\n\n        ← heartbeat 25s (commentaire SSE, no-op client)
 *
 * Cleanup : si le client abort (close tab / navigate), `controller.cancel()`
 * vide le `pollTimer` ET retire l'instance du `connectionPool`.
 */

import {
  ALLOWED_PRICE_STREAM_IDS,
  COINGECKO_TO_BINANCE,
  BINANCE_TO_COINGECKO,
} from "@/lib/binance-mapping";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 2_500;
const HEARTBEAT_INTERVAL_MS = 25_000;
const MAX_IDS = 50;
const BINANCE_REST_BASE = "https://api.binance.com/api/v3/ticker/24hr";

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  closeTime: number;
}

interface PriceUpdate {
  id: string;
  price: number;
  change24h: number;
  ts: number;
}

/**
 * Parse + valide ?ids → liste de coingeckoId whitelistés ET ayant un mapping
 * Binance. Les ids hors whitelist ou sans mapping sont silencieusement drop.
 * Renvoie `null` si rien de valide ne reste (le handler renverra alors 400).
 */
function parseIds(idsParam: string | null): string[] | null {
  if (!idsParam) return null;
  const raw = Array.from(
    new Set(
      idsParam
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  if (raw.length === 0 || raw.length > MAX_IDS) return null;
  const valid = raw.filter(
    (id) => ALLOWED_PRICE_STREAM_IDS.has(id) && COINGECKO_TO_BINANCE[id],
  );
  return valid.length > 0 ? valid : null;
}

/**
 * Fetch les tickers Binance pour la liste de symbols donnée. On utilise
 * le format `?symbols=["BTCUSDT","ETHUSDT",...]` (JSON array URL-encoded)
 * qui retourne un tableau de tickers complets en 1 seul round-trip.
 */
async function fetchBinanceTickers(
  symbols: string[],
  signal: AbortSignal,
): Promise<BinanceTicker[]> {
  if (symbols.length === 0) return [];
  // Binance attend un JSON array stringifié dans le query param.
  const symbolsParam = encodeURIComponent(JSON.stringify(symbols));
  const url = `${BINANCE_REST_BASE}?symbols=${symbolsParam}`;
  const res = await fetch(url, {
    signal,
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Binance REST ${res.status}`);
  return (await res.json()) as BinanceTicker[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = parseIds(searchParams.get("ids"));

  if (!ids) {
    return new Response(
      JSON.stringify({ error: "Aucun identifiant valide ou trop d'identifiants (max 50)." }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const binanceSymbols = ids
    .map((id) => COINGECKO_TO_BINANCE[id])
    .filter((s): s is string => Boolean(s));

  // Cache des derniers prix par coingeckoId — on n'émet un event que si le
  // prix OU la variation a changé (évite de spammer le client avec des
  // re-broadcasts identiques).
  const lastEmitted = new Map<string, { price: number; change24h: number }>();

  const encoder = new TextEncoder();
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let abortController: AbortController | null = null;
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const safeEnqueue = (chunk: string) => {
        if (cancelled) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Stream déjà fermé côté client — on ignore.
        }
      };

      const pushUpdate = (update: PriceUpdate) => {
        safeEnqueue(`data: ${JSON.stringify(update)}\n\n`);
      };

      const pushPing = () => {
        // Commentaire SSE (lignes commençant par ":") = no-op côté client,
        // mais maintient la connexion ouverte vs proxies / Vercel timeout.
        safeEnqueue(`: ping ${Date.now()}\n\n`);
      };

      const tick = async () => {
        if (cancelled) return;
        abortController = new AbortController();
        const ac = abortController;
        const timeout = setTimeout(() => ac.abort(), 4000);
        try {
          const tickers = await fetchBinanceTickers(binanceSymbols, ac.signal);
          for (const t of tickers) {
            const coingeckoId = BINANCE_TO_COINGECKO[t.symbol];
            if (!coingeckoId) continue;
            const price = Number(t.lastPrice);
            const change24h = Number(t.priceChangePercent);
            if (!Number.isFinite(price) || !Number.isFinite(change24h)) continue;
            const prev = lastEmitted.get(coingeckoId);
            if (prev && prev.price === price && prev.change24h === change24h) {
              continue; // pas de changement → on n'émet pas
            }
            lastEmitted.set(coingeckoId, { price, change24h });
            pushUpdate({
              id: coingeckoId,
              price,
              change24h,
              ts: t.closeTime || Date.now(),
            });
          }
        } catch {
          // Erreur transitoire Binance → on ne ferme pas le stream, le
          // prochain tick retentera. Le client, lui, voit juste une pause.
        } finally {
          clearTimeout(timeout);
        }
      };

      // Premier tick immédiat pour hydrater le client tout de suite.
      await tick();

      pollTimer = setInterval(tick, POLL_INTERVAL_MS);
      heartbeatTimer = setInterval(pushPing, HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      cancelled = true;
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (abortController) {
        try {
          abortController.abort();
        } catch {
          /* noop */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Désactive le buffering Nginx-style (Vercel respecte ce header).
      "x-accel-buffering": "no",
    },
  });
}
