/**
 * Types Portfolio Tracker LITE — Pilier 5.
 *
 * Stockage 100 % localStorage côté Client. Aucun envoi serveur, aucune
 * dépendance wallet-connect. Conçu pour les utilisateurs qui veulent suivre
 * leur PnL sans confier leurs adresses ni installer Metamask.
 */

/** Une entrée dans le portfolio (1 crypto = 1 entrée). */
export interface PortfolioEntry {
  /** UUID-like généré côté client. */
  id: string;
  /** ID CoinGecko (ex: "bitcoin", "ethereum"). Sert à fetcher le prix. */
  cryptoId: string;
  /** Symbole en majuscules (ex: "BTC", "ETH"). */
  cryptoSymbol: string;
  /** Nom affichable (ex: "Bitcoin", "Ethereum"). */
  cryptoName: string;
  /** URL absolue du logo (CoinGecko). Optionnel, défaut placeholder. */
  cryptoImage?: string;
  /** Quantité détenue (peut être fractionnaire, ex: 0.0234). */
  quantity: number;
  /** Date d'ajout ISO 8601 (ex: "2026-04-26T10:30:00.000Z"). */
  addedAt: string;
}

/** Entrée enrichie avec le prix live et la valeur. */
export interface PortfolioWithPrices {
  /** Entrée originale. */
  entry: PortfolioEntry;
  /** Prix unitaire actuel en EUR. null si fetch échoué. */
  currentPrice: number | null;
  /** Valeur EUR de la position : currentPrice × quantity. */
  value: number;
  /** Variation 24h en pourcentage. null si non disponible. */
  change24h: number | null;
  /** Indique que le prix vient d'un fallback (ex: cache stale). */
  stale?: boolean;
}

/** Résumé global du portefeuille pour l'affichage en bas de table. */
export interface PortfolioSummary {
  /** Valeur totale du portefeuille (somme des values). */
  totalValue: number;
  /** Variation pondérée 24h en EUR. */
  totalChange24hEur: number;
  /** Variation pondérée 24h en %. */
  totalChange24hPct: number;
  /** Nombre de positions actives. */
  positionsCount: number;
}

/** Clé localStorage utilisée. Préfixée pour éviter les collisions. */
export const PORTFOLIO_STORAGE_KEY = "cryptoreflex_portfolio";

/** Version du schéma — utile pour migrations futures. */
export const PORTFOLIO_STORAGE_VERSION = 1;

/** Wrapper persistance : { version, entries }. */
export interface PortfolioStorageShape {
  version: number;
  entries: PortfolioEntry[];
}
