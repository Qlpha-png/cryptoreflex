/**
 * lib/sort-order.ts — Helpers de persistance d'ordre custom (drag & drop).
 *
 * Ajout étude 02/05/2026 — proposition #6.
 *
 * Stockage : `localStorage[key] = JSON.stringify(string[])` — tableau d'IDs
 * dans l'ordre choisi par l'utilisateur. Les nouveaux items (non présents
 * dans la liste persistée) sont placés à la fin (préserve la possibilité
 * d'ajouter sans casser l'ordre custom).
 *
 * SSR-safe : toutes les fns gate sur `typeof window`.
 */

"use client";

function isServer(): boolean {
  return typeof window === "undefined";
}

/** Lit l'ordre persisté pour la clé donnée. Toujours `string[]` (jamais throw). */
export function readOrder(key: string): string[] {
  if (isServer()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

/** Persiste un ordre. Swallow QuotaExceededError. */
export function writeOrder(key: string, ids: string[]): void {
  if (isServer()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* noop */
  }
}

/**
 * Trie une liste d'items en respectant l'ordre persisté pour `key`.
 * Les items absents de l'ordre persisté sont placés à la fin (dans leur
 * ordre d'origine).
 */
export function sortByPersistedOrder<T extends { id: string }>(
  items: T[],
  key: string
): T[] {
  if (items.length === 0) return items;
  const order = readOrder(key);
  if (order.length === 0) return items;

  const indexById = new Map<string, number>();
  order.forEach((id, idx) => indexById.set(id, idx));

  // Tri stable : items connus selon order, items inconnus à la fin
  // (préservant leur ordre d'origine).
  const known: T[] = [];
  const unknown: T[] = [];
  for (const it of items) {
    if (indexById.has(it.id)) known.push(it);
    else unknown.push(it);
  }
  known.sort((a, b) => {
    const ai = indexById.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bi = indexById.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });
  return [...known, ...unknown];
}

/**
 * Variante pour des watchlists où les items sont eux-mêmes des strings (IDs).
 */
export function sortStringsByPersistedOrder(
  ids: string[],
  key: string
): string[] {
  if (ids.length === 0) return ids;
  const order = readOrder(key);
  if (order.length === 0) return ids;
  const indexById = new Map<string, number>();
  order.forEach((id, idx) => indexById.set(id, idx));
  const known: string[] = [];
  const unknown: string[] = [];
  for (const id of ids) {
    if (indexById.has(id)) known.push(id);
    else unknown.push(id);
  }
  known.sort((a, b) => {
    const ai = indexById.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bi = indexById.get(b) ?? Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });
  return [...known, ...unknown];
}
