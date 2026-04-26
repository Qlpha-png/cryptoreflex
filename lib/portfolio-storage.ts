/**
 * Helpers localStorage pour le Portfolio Tracker LITE — Pilier 5.
 *
 * IMPORTANT : ces fonctions ne s'utilisent QUE côté Client. Elles vérifient
 * `typeof window` pour éviter le crash en SSR/build (Next 14 prerender).
 * Les composants qui les consomment doivent être marqués "use client" et,
 * idéalement, lazy-loadés via dynamic({ ssr: false }).
 */

import {
  PORTFOLIO_STORAGE_KEY,
  PORTFOLIO_STORAGE_VERSION,
  type PortfolioEntry,
  type PortfolioStorageShape,
} from "@/lib/portfolio-types";

/**
 * Détecte si on tourne dans un navigateur avec localStorage dispo.
 * Couvre les cas SSR, SSG, et browsers privés qui stub localStorage.
 */
function hasStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const k = "__cryptoreflex_probe__";
    window.localStorage.setItem(k, k);
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/**
 * Génère un identifiant pseudo-unique court.
 * Pas besoin de UUID v4 ici (collision sur localStorage = quasi impossible).
 */
function genId(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `pf_${time}_${rand}`;
}

/**
 * Lit le portefeuille depuis localStorage.
 * Retourne [] si rien stocké, si SSR, ou si le JSON est corrompu.
 */
export function getPortfolio(): PortfolioEntry[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PortfolioStorageShape | PortfolioEntry[];
    // Backward compat : si on stockait un array brut avant, on le détecte.
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.entries)) return parsed.entries;
    return [];
  } catch {
    return [];
  }
}

/** Persiste un nouveau tableau d'entries dans localStorage. */
function savePortfolio(entries: PortfolioEntry[]): void {
  if (!hasStorage()) return;
  const payload: PortfolioStorageShape = {
    version: PORTFOLIO_STORAGE_VERSION,
    entries,
  };
  try {
    window.localStorage.setItem(
      PORTFOLIO_STORAGE_KEY,
      JSON.stringify(payload)
    );
  } catch {
    // QuotaExceeded ou storage désactivé : on échoue silencieusement.
  }
}

/**
 * Ajoute une entrée. L'ID et la date sont générés automatiquement.
 * Retourne l'entrée créée pour faciliter l'optimistic update côté UI.
 */
export function addEntry(
  data: Omit<PortfolioEntry, "id" | "addedAt">
): PortfolioEntry {
  const newEntry: PortfolioEntry = {
    ...data,
    id: genId(),
    addedAt: new Date().toISOString(),
  };
  const current = getPortfolio();
  savePortfolio([...current, newEntry]);
  return newEntry;
}

/** Supprime une entrée par ID (no-op si introuvable). */
export function removeEntry(id: string): void {
  const current = getPortfolio();
  const next = current.filter((e) => e.id !== id);
  savePortfolio(next);
}

/** Met à jour partiellement une entrée existante. */
export function updateEntry(
  id: string,
  updates: Partial<PortfolioEntry>
): void {
  const current = getPortfolio();
  const next = current.map((e) => (e.id === id ? { ...e, ...updates } : e));
  savePortfolio(next);
}

/** Vide complètement le portefeuille (avec confirmation côté UI). */
export function clearPortfolio(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(PORTFOLIO_STORAGE_KEY);
  } catch {
    // ignore
  }
}
