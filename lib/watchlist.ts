/**
 * lib/watchlist.ts — Stockage local de la watchlist crypto utilisateur.
 *
 * Pure utilitaires, sans dépendance React. Toutes les fonctions sont
 * SSR-safe (gate sur `typeof window === "undefined"` → no-op côté serveur).
 *
 * Persistance : `localStorage["cr:watchlist:v1"] = JSON.stringify(string[])`.
 * - Une seule version (v1) — bumper le suffixe si on change le format.
 *
 * Limites :
 *  - Free (défaut) : FREE_LIMITS.watchlist = 10 cryptos
 *  - Pro          : PRO_LIMITS.watchlist = 200 cryptos
 *
 * Audit cohérence 30/04/2026 : avant cette refonte, MAX_WATCHLIST = 10 était
 * hardcodé pour TOUS les utilisateurs, rendant la promesse "watchlist
 * illimitée" du plan /pro mensongère. Maintenant `addToWatchlist()` accepte
 * un paramètre `maxWatchlist` que le composant WatchlistButton lit depuis
 * /api/me selon le plan de l'utilisateur.
 *
 * Sync cross-component : un évènement custom `watchlist:changed` est dispatché
 * sur `window` après chaque écriture. Les composants qui ont besoin d'être
 * notifiés (WatchlistButton dans plusieurs lignes, page /watchlist) écoutent
 * cet évènement plutôt que de poller le storage.
 */

import { FREE_LIMITS, PRO_LIMITS } from "@/lib/limits";

export const MAX_WATCHLIST = FREE_LIMITS.watchlist;

/** Plafond absolu (Pro). Anti-abus si un user édite son storage à la main. */
const ABSOLUTE_MAX = PRO_LIMITS.watchlist;

/** Clé localStorage. Le suffixe `:v1` permet de migrer si le format change. */
const STORAGE_KEY = "cr:watchlist:v1";

/** Évènement custom dispatché à chaque mutation pour la sync cross-component. */
export const WATCHLIST_EVENT = "watchlist:changed";

/* -------------------------------------------------------------------------- */
/*  Helpers internes                                                          */
/* -------------------------------------------------------------------------- */

/** True si on est côté serveur (SSR / RSC). Toutes les fns sont no-op alors. */
function isServer(): boolean {
  return typeof window === "undefined";
}

/** Lit le JSON du storage de manière défensive (corruption, quota, etc.). */
function readRaw(): string[] {
  if (isServer()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Force string + dedupe — sécurité défensive si l'utilisateur
    // a édité son storage à la main ou si une vieille version stockait autre chose.
    const cleaned = parsed
      .filter((x): x is string => typeof x === "string" && x.length > 0)
      .slice(0, ABSOLUTE_MAX);
    return Array.from(new Set(cleaned));
  } catch {
    return [];
  }
}

/** Persiste la liste + dispatch l'évènement custom pour sync cross-component. */
function writeRaw(list: string[]): void {
  if (isServer()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT, { detail: { list } }));
  } catch {
    /* quota dépassé / mode privé Safari : on ignore silencieusement */
  }
}

/* -------------------------------------------------------------------------- */
/*  API publique                                                              */
/* -------------------------------------------------------------------------- */

/** Retourne la watchlist courante (tableau d'IDs CoinGecko). */
export function getWatchlist(): string[] {
  return readRaw();
}

/**
 * Ajoute un ID à la watchlist.
 * @param id ID CoinGecko à ajouter
 * @param maxWatchlist Limite à appliquer (défaut Free = 10). Le composant
 *                     WatchlistButton lit cette limite via /api/me selon le
 *                     plan de l'utilisateur. Si non fourni : limite Free
 *                     par sécurité (jamais Pro par défaut).
 * @returns `true` si ajouté, `false` si déjà présent ou limite atteinte.
 */
export function addToWatchlist(
  id: string,
  maxWatchlist: number = MAX_WATCHLIST
): boolean {
  if (isServer() || !id) return false;
  const effectiveMax = Math.min(Math.max(0, maxWatchlist | 0), ABSOLUTE_MAX);
  const current = readRaw();
  if (current.includes(id)) return false;
  if (current.length >= effectiveMax) return false;
  writeRaw([...current, id]);
  return true;
}

/** Retire un ID de la watchlist (no-op si absent). */
export function removeFromWatchlist(id: string): void {
  if (isServer() || !id) return;
  const current = readRaw();
  if (!current.includes(id)) return;
  writeRaw(current.filter((x) => x !== id));
}

/** True si l'ID est dans la watchlist. SSR-safe (false côté serveur). */
export function isInWatchlist(id: string): boolean {
  if (isServer() || !id) return false;
  return readRaw().includes(id);
}

/** Vide complètement la watchlist. */
export function clearWatchlist(): void {
  if (isServer()) return;
  writeRaw([]);
}
