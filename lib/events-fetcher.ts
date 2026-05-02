/**
 * lib/events-fetcher.ts — Récupération des événements crypto (pilier 4).
 *
 * Stratégie hiérarchique :
 *  1. Si `NEXT_PUBLIC_COINMARKETCAL_KEY` est définie : tente l'API CoinMarketCal
 *     (free tier : 100 calls/jour) puis merge avec la seed locale (la seed gagne
 *     sur les conflits d'`id` parce qu'elle est éditorialisée FR).
 *  2. Sinon (ou en cas d'erreur API) : retourne uniquement la seed.
 *
 * Cache via `unstable_cache` :
 *  - Tag "events" → utilisé par /api/cron/refresh-events pour forcer la refresh.
 *  - TTL 1 h (3600 s) → 24 calls/jour max → reste largement sous le quota free.
 *
 * Pourquoi pas de scraping ?
 *  - Risque juridique flou (CGU des sites de calendrier).
 *  - Risque opérationnel (parsers à maintenir, anti-bot).
 *  - On préfère seed + API officielle, c'est plus durable.
 */

import { unstable_cache } from "next/cache";
import { EVENTS_SEED } from "@/lib/events-seed";
import {
  EVENT_CATEGORIES,
  type CryptoEvent,
  type EventCategory,
  type Importance,
} from "@/lib/events-types";

export const EVENTS_CACHE_TAG = "events";
const CACHE_TTL_SECONDS = 3600;

/* -------------------------------------------------------------------------- */
/* CoinMarketCal API client (interne)                                         */
/* -------------------------------------------------------------------------- */

const CMC_BASE = "https://developers.coinmarketcal.com/v1";

/**
 * Réponse partielle de l'API CoinMarketCal — on ne map que les champs
 * qu'on consomme. Le reste (proof, vote_count, etc.) est ignoré.
 *
 * Doc : https://coinmarketcal.com/en/doc/redoc
 */
interface CMCApiEvent {
  id: string;
  title: { en: string; fr?: string } | string;
  description?: { en: string; fr?: string } | string;
  date_event: string;          // ISO datetime
  source?: string;
  proof?: string;
  coins?: Array<{ symbol: string; name: string }>;
  categories?: Array<{ name: string }>;
  /** Score 0-100 selon l'API. */
  trending_score?: number;
}

interface CMCApiResponse {
  body: CMCApiEvent[];
  _metadata?: {
    page: number;
    page_count: number;
  };
}

/**
 * Mappe une catégorie CoinMarketCal libre vers notre enum strict.
 * Inconnu → "Update" par défaut (catégorie générique mise à jour réseau).
 */
function mapCategory(raw: string | undefined): EventCategory {
  if (!raw) return "Update";
  const norm = raw.toLowerCase();
  if (norm.includes("halving")) return "Halving";
  if (norm.includes("fed") || norm.includes("fomc")) return "FOMC";
  if (norm.includes("etf")) return "ETF";
  if (norm.includes("listing") || norm.includes("exchange")) return "Listing";
  if (norm.includes("conference") || norm.includes("event")) return "Conference";
  if (norm.includes("hard fork") || norm.includes("hardfork")) return "Hard Fork";
  if (norm.includes("unlock") || norm.includes("release")) return "Token Unlock";
  if (norm.includes("update") || norm.includes("upgrade") || norm.includes("mainnet")) return "Update";
  return "Update";
}

/**
 * Convertit le `trending_score` (0-100) en notre échelle d'Importance (1-3).
 * - 0-39  → 1 (mineur)
 * - 40-69 → 2 (significatif)
 * - 70+   → 3 (majeur)
 */
function mapImportance(score: number | undefined): Importance {
  if (score === undefined || score === null) return 1;
  if (score >= 70) return 3;
  if (score >= 40) return 2;
  return 1;
}

function pickLocale(field: { en: string; fr?: string } | string | undefined): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field.fr || field.en || "";
}

/**
 * Normalise un événement API au format `CryptoEvent` interne.
 * Filtre les events sans date ou sans titre exploitable.
 */
function normalizeApiEvent(raw: CMCApiEvent): CryptoEvent | null {
  const title = pickLocale(raw.title);
  if (!title || !raw.date_event) return null;

  const date = raw.date_event.slice(0, 10); // "YYYY-MM-DD"
  const crypto = raw.coins?.[0]?.symbol?.toUpperCase() ?? "MARCHÉ";
  const category = mapCategory(raw.categories?.[0]?.name);

  return {
    id: `cmc-${raw.id}`,
    title,
    date,
    crypto,
    category,
    source: raw.source ? "CoinMarketCal" : "CoinMarketCal (community)",
    sourceUrl: raw.proof || raw.source || "https://coinmarketcal.com/",
    description: pickLocale(raw.description) || title,
    importance: mapImportance(raw.trending_score),
  };
}

/**
 * Fetch implicite de l'API CoinMarketCal. Retourne un tableau vide en cas
 * d'erreur (HTTP, parse, quota dépassé) — la seed prendra le relais.
 *
 * Limites free tier (avril 2026) :
 *  - 100 requêtes / jour
 *  - max 16 events par page
 *  - rate limit ~5 req/min
 */
async function fetchFromCoinMarketCal(apiKey: string): Promise<CryptoEvent[]> {
  const url = `${CMC_BASE}/events?max=50&page=1&dateRangeStart=${new Date().toISOString().slice(0, 10)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Accept-Encoding": "deflate, gzip",
        Accept: "application/json",
      },
      // Pas de `next.revalidate` ici : l'unstable_cache externe gère la durée.
      // On évite le double caching pour ne pas avoir 2 TTL incohérents.
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[events-fetcher] CoinMarketCal API ${res.status} ${res.statusText}`);
      return [];
    }
    const json = (await res.json()) as CMCApiResponse;
    if (!json?.body || !Array.isArray(json.body)) return [];
    return json.body
      .map(normalizeApiEvent)
      .filter((e): e is CryptoEvent => e !== null);
  } catch (err) {
    console.warn("[events-fetcher] CoinMarketCal fetch failed:", err);
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Merge seed ↔ API                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Fusionne la seed et la réponse API. Règles :
 *  - dédoublonnage par `id` (seed gagne — version éditoriale FR).
 *  - tri ascending par date (le plus proche d'abord).
 *  - on conserve les events passés (utiles pour la grille mensuelle).
 */
function mergeEvents(seed: CryptoEvent[], api: CryptoEvent[]): CryptoEvent[] {
  const seenIds = new Set(seed.map((e) => e.id));
  const merged = [...seed];
  for (const e of api) {
    if (!seenIds.has(e.id)) {
      merged.push(e);
      seenIds.add(e.id);
    }
  }
  return merged.sort((a, b) => a.date.localeCompare(b.date));
}

/* -------------------------------------------------------------------------- */
/* API publique                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Implémentation interne — wrappée par `unstable_cache` plus bas.
 * Exportée séparément pour permettre au cron de bypasser le cache et
 * forcer un refresh complet.
 */
export async function _fetchEventsRaw(): Promise<CryptoEvent[]> {
  // FIX SEC 2026-05-02 #15 (audit expert backend - CRITIQUE) :
  // `NEXT_PUBLIC_COINMARKETCAL_KEY` était embarquée dans le bundle JS client
  // bien qu'utilisée uniquement côté serveur. Renommée en `COINMARKETCAL_KEY`
  // (sans préfixe public). Fallback sur l'ancien nom pour la transition
  // env Vercel — à retirer après bump env vars en prod.
  const apiKey =
    process.env.COINMARKETCAL_KEY ?? process.env.NEXT_PUBLIC_COINMARKETCAL_KEY;
  if (!apiKey) {
    return [...EVENTS_SEED].sort((a, b) => a.date.localeCompare(b.date));
  }
  const apiEvents = await fetchFromCoinMarketCal(apiKey);
  return mergeEvents(EVENTS_SEED, apiEvents);
}

/**
 * Fetch principal — cache 1h via `unstable_cache`, tag "events".
 * À utiliser depuis Server Components, Route Handlers, server actions.
 *
 * Pour forcer une refresh : `revalidateTag("events")` (cf. /api/cron/refresh-events).
 */
export const fetchEvents = unstable_cache(
  async (): Promise<CryptoEvent[]> => _fetchEventsRaw(),
  ["events-fetcher-v1"],
  { revalidate: CACHE_TTL_SECONDS, tags: [EVENTS_CACHE_TAG] }
);

/* -------------------------------------------------------------------------- */
/* Helpers UI exposés                                                         */
/* -------------------------------------------------------------------------- */

/** Liste des cryptos uniques présentes dans le set d'events (pour le filtre). */
export function extractUniqueCryptos(events: CryptoEvent[]): string[] {
  const set = new Set(events.map((e) => e.crypto));
  return Array.from(set).sort((a, b) => {
    // "MARCHÉ" en premier (c'est la catégorie macro, naturellement visible).
    if (a === "MARCHÉ") return -1;
    if (b === "MARCHÉ") return 1;
    return a.localeCompare(b);
  });
}

/** Compte les événements à venir (date >= aujourd'hui). */
export function countUpcoming(events: CryptoEvent[]): number {
  const today = new Date().toISOString().slice(0, 10);
  return events.filter((e) => e.date >= today).length;
}

/** Filtre événements à venir, optionnellement limité. */
export function getUpcoming(events: CryptoEvent[], limit?: number): CryptoEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.date >= today);
  return typeof limit === "number" ? upcoming.slice(0, limit) : upcoming;
}

/** Re-export pour faciliter l'import depuis les composants. */
export { EVENT_CATEGORIES };
