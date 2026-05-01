/**
 * lib/use-compare-list.ts — Hook React pour le comparateur multi-cryptos.
 *
 * Stocke jusqu'à 4 slugs de cryptos en `localStorage` et expose une API
 * simple aux Client Components (CompareDrawer, AddToCompareButton, etc.).
 *
 * Stockage : `localStorage["cryptoreflex_compare_v1"] = JSON.stringify(string[])`
 *  - Clé versionnée (suffixe `_v1`) : permet de migrer si le format change.
 *  - Bornée à `MAX_COMPARE` côté lecture ET écriture (anti-abus si l'utilisateur
 *    édite son storage à la main).
 *
 * SSR-safe :
 *  - État initial = `[]` au premier render (jamais d'accès à `window` côté serveur).
 *  - Hydratation au mount via `useEffect` → pas de mismatch SSR/CSR.
 *
 * Sync cross-component : un évènement custom `compare:changed` est dispatché
 * sur `window` après chaque mutation, pour permettre à plusieurs instances du
 * hook (ex: AddToCompareButton + CompareDrawer en même temps) de rester sync.
 * On écoute aussi `storage` pour la sync cross-tab.
 *
 * Tolérance erreurs :
 *  - QuotaExceededError, mode privé Safari, JSON corrompu → swallow + reset.
 */

"use client";

import { useCallback, useEffect, useState } from "react";

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                */
/* -------------------------------------------------------------------------- */

/** Plafond hardcodé : un comparatif au-delà de 4 cryptos devient illisible. */
export const MAX_COMPARE = 4;

/** Clé localStorage versionnée. */
export const COMPARE_STORAGE_KEY = "cryptoreflex_compare_v1";

/** Évènement custom dispatché sur `window` à chaque mutation de la liste. */
export const COMPARE_EVENT = "compare:changed";

/* -------------------------------------------------------------------------- */
/*  Helpers internes (pures, SSR-safe)                                        */
/* -------------------------------------------------------------------------- */

function isServer(): boolean {
  return typeof window === "undefined";
}

/** Lit le storage de manière défensive. Toujours `string[]`, jamais throw. */
function readStorage(): string[] {
  if (isServer()) return [];
  try {
    const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cleaned = parsed
      .filter((x): x is string => typeof x === "string" && x.length > 0)
      .slice(0, MAX_COMPARE);
    // dedupe en conservant l'ordre d'insertion
    return Array.from(new Set(cleaned));
  } catch {
    return [];
  }
}

/** Persiste + dispatch l'évènement custom. Swallow QuotaExceededError. */
function writeStorage(list: string[]): void {
  if (isServer()) return;
  try {
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // QuotaExceeded / mode privé Safari : on échoue silencieusement,
    // mais on dispatch quand même pour que l'UI reste cohérente avec
    // l'état mémoire des autres composants (sera perdu au reload).
  }
  try {
    window.dispatchEvent(
      new CustomEvent(COMPARE_EVENT, { detail: { list } })
    );
  } catch {
    /* CustomEvent indisponible (très vieux navigateurs) — no-op */
  }
}

/* -------------------------------------------------------------------------- */
/*  Hook public                                                               */
/* -------------------------------------------------------------------------- */

export interface UseCompareListReturn {
  /** Liste courante de slugs. `[]` au premier render (SSR), hydratée au mount. */
  list: string[];
  /** True après hydratation côté client. Permet de cacher l'UI tant que false. */
  hydrated: boolean;
  /** Ajoute un slug. Retourne `true` si ajouté, `false` si plein ou déjà présent. */
  add: (slug: string) => boolean;
  /** Retire un slug (no-op si absent). */
  remove: (slug: string) => void;
  /** Vide entièrement la liste. */
  clear: () => void;
  /** True si le slug est déjà dans la liste. SSR : toujours false. */
  has: (slug: string) => boolean;
  /** Plafond exposé pour l'UI ("3/4"). */
  max: number;
}

/**
 * Hook React qui pilote la liste de cryptos à comparer.
 *
 * Pattern :
 *   const { list, add, remove, has } = useCompareList();
 *   add("solana");
 */
export function useCompareList(): UseCompareListReturn {
  const [list, setList] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydratation initiale + abonnements cross-component / cross-tab.
  useEffect(() => {
    setList(readStorage());
    setHydrated(true);

    const onChange = (): void => {
      setList(readStorage());
    };
    window.addEventListener(COMPARE_EVENT, onChange);
    window.addEventListener("storage", onChange);

    return () => {
      window.removeEventListener(COMPARE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const add = useCallback((slug: string): boolean => {
    if (isServer() || !slug) return false;
    const current = readStorage();
    if (current.includes(slug)) return false;
    if (current.length >= MAX_COMPARE) return false;
    const next = [...current, slug];
    writeStorage(next);
    setList(next);
    return true;
  }, []);

  const remove = useCallback((slug: string): void => {
    if (isServer() || !slug) return;
    const current = readStorage();
    if (!current.includes(slug)) return;
    const next = current.filter((s) => s !== slug);
    writeStorage(next);
    setList(next);
  }, []);

  const clear = useCallback((): void => {
    if (isServer()) return;
    writeStorage([]);
    setList([]);
  }, []);

  const has = useCallback(
    (slug: string): boolean => {
      if (!hydrated) return false;
      return list.includes(slug);
    },
    [hydrated, list]
  );

  return { list, hydrated, add, remove, clear, has, max: MAX_COMPARE };
}
