/**
 * lib/portfolio.ts — Stockage local du portefeuille crypto utilisateur.
 *
 * Conçu sur le même squelette que `lib/watchlist.ts` :
 *   - 100 % localStorage (RGPD-friendly, zéro backend)
 *   - SSR-safe : toutes les fns gate sur `typeof window === "undefined"`
 *   - Cross-component sync via évènement custom `portfolio:changed`
 *
 * Persistance : `localStorage["cr:portfolio:v1"] = JSON.stringify(Holding[])`.
 * - Une seule version (v1) — bumper le suffixe si on change le format.
 * - Limite stricte à 30 entrées (anti-overflow localStorage : ~1KB / holding).
 *
 * Le user n'a pas de compte, donc pas de auth. Tout est local. Si le user
 * vide son cache ou change de navigateur, ses positions sont perdues — c'est
 * documenté côté UI.
 */

export const MAX_HOLDINGS = 30;

/** Clé localStorage. Le suffixe `:v1` permet de migrer si le format change. */
const STORAGE_KEY = "cr:portfolio:v1";

/** Évènement custom dispatché à chaque mutation pour la sync cross-component. */
export const PORTFOLIO_EVENT = "portfolio:changed";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface Holding {
  /** UUID local — généré côté client à la création. */
  id: string;
  /** Identifiant CoinGecko (ex: "bitcoin", "ethereum"). Sert au polling /api/prices. */
  cryptoId: string;
  /** Symbole ticker uppercase (BTC, ETH…). Snapshot à la création (lisibilité offline). */
  symbol: string;
  /** Nom affichable (Bitcoin, Ethereum…). Snapshot à la création. */
  name: string;
  /** Quantité détenue (peut être fractionnaire). > 0. */
  quantity: number;
  /** Prix moyen d'achat en EUR (PRU). >= 0. 0 = position offerte / airdrop. */
  avgBuyPriceEur: number;
  /** Timestamp ms epoch de l'ajout — pour tri éventuel "récents" / "anciens". */
  addedAt: number;
}

/** Payload accepté par `addHolding` (id + addedAt sont générés). */
export interface HoldingInput {
  cryptoId: string;
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPriceEur: number;
}

/* -------------------------------------------------------------------------- */
/*  Helpers internes                                                          */
/* -------------------------------------------------------------------------- */

/** True si on est côté serveur (SSR / RSC). Toutes les fns sont no-op alors. */
function isServer(): boolean {
  return typeof window === "undefined";
}

/** Génère un id local stable. Pas besoin de crypto-fort, juste unique. */
function genId(): string {
  // crypto.randomUUID dispo partout (Chrome 92+, FF 95+, Safari 15.4+).
  // Fallback simple pour vieux navigateurs (UX du portfolio = users tech).
  const c = (typeof crypto !== "undefined" ? crypto : null) as
    | (Crypto & { randomUUID?: () => string })
    | null;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Garde anti-NaN/Infinity sur les nombres venant de l'input user. */
function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/** Validation runtime d'un Holding venu du storage (corruption / édition manuelle). */
function isHolding(x: unknown): x is Holding {
  if (!x || typeof x !== "object") return false;
  const h = x as Record<string, unknown>;
  return (
    typeof h.id === "string" &&
    typeof h.cryptoId === "string" &&
    typeof h.symbol === "string" &&
    typeof h.name === "string" &&
    isFiniteNumber(h.quantity) &&
    h.quantity > 0 &&
    isFiniteNumber(h.avgBuyPriceEur) &&
    h.avgBuyPriceEur >= 0 &&
    isFiniteNumber(h.addedAt)
  );
}

/** Lit le JSON du storage de manière défensive. */
function readRaw(): Holding[] {
  if (isServer()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filtre défensif : on jette les entrées corrompues et on plafonne à MAX.
    return parsed.filter(isHolding).slice(0, MAX_HOLDINGS);
  } catch {
    return [];
  }
}

/** Persiste la liste + dispatch l'évènement custom pour sync cross-component. */
function writeRaw(list: Holding[]): void {
  if (isServer()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(PORTFOLIO_EVENT, { detail: { list } }));
  } catch {
    /* quota dépassé / mode privé Safari : on ignore silencieusement */
  }
}

/* -------------------------------------------------------------------------- */
/*  API publique                                                              */
/* -------------------------------------------------------------------------- */

/** Retourne le portefeuille courant. Ordre de stockage = ordre d'ajout. */
export function getHoldings(): Holding[] {
  return readRaw();
}

/**
 * Ajoute une position au portefeuille.
 *
 * Validation :
 *   - quantity > 0
 *   - avgBuyPriceEur >= 0
 *   - cryptoId / symbol / name non-vides
 *   - max MAX_HOLDINGS positions au total
 *
 * @returns Le `Holding` créé, ou `null` si validation/limite KO.
 */
export function addHolding(input: HoldingInput): Holding | null {
  if (isServer()) return null;
  if (!input || typeof input !== "object") return null;

  const cryptoId = String(input.cryptoId ?? "").trim();
  const symbol = String(input.symbol ?? "").trim().toUpperCase();
  const name = String(input.name ?? "").trim();
  const quantity = Number(input.quantity);
  const avgBuyPriceEur = Number(input.avgBuyPriceEur);

  if (!cryptoId || !symbol || !name) return null;
  if (!isFiniteNumber(quantity) || quantity <= 0) return null;
  if (!isFiniteNumber(avgBuyPriceEur) || avgBuyPriceEur < 0) return null;

  const current = readRaw();
  if (current.length >= MAX_HOLDINGS) return null;

  const holding: Holding = {
    id: genId(),
    cryptoId,
    symbol,
    name,
    quantity,
    avgBuyPriceEur,
    addedAt: Date.now(),
  };
  writeRaw([...current, holding]);
  return holding;
}

/** Retire une position par id (no-op si absente). */
export function removeHolding(id: string): void {
  if (isServer() || !id) return;
  const current = readRaw();
  const next = current.filter((h) => h.id !== id);
  if (next.length !== current.length) writeRaw(next);
}

/**
 * Patch partiel d'une position existante (quantity et/ou avgBuyPriceEur).
 *
 * - `cryptoId`, `symbol`, `name`, `addedAt` ne sont PAS modifiables (intégrité).
 * - Les nouvelles valeurs sont validées (>0 / >=0).
 *
 * @returns true si la position existait et a été modifiée, false sinon.
 */
export function updateHolding(
  id: string,
  patch: Partial<Pick<Holding, "quantity" | "avgBuyPriceEur">>
): boolean {
  if (isServer() || !id || !patch) return false;

  const current = readRaw();
  const idx = current.findIndex((h) => h.id === id);
  if (idx === -1) return false;

  const next = { ...current[idx]! };

  if (patch.quantity !== undefined) {
    const q = Number(patch.quantity);
    if (!isFiniteNumber(q) || q <= 0) return false;
    next.quantity = q;
  }
  if (patch.avgBuyPriceEur !== undefined) {
    const p = Number(patch.avgBuyPriceEur);
    if (!isFiniteNumber(p) || p < 0) return false;
    next.avgBuyPriceEur = p;
  }

  const list = [...current];
  list[idx] = next;
  writeRaw(list);
  return true;
}

/** Vide entièrement le portefeuille (utilisé par le bouton "Vider"). */
export function clearHoldings(): void {
  if (isServer()) return;
  writeRaw([]);
}

/* -------------------------------------------------------------------------- */
/*  Helpers calcul (purs — utiles aux composants)                             */
/* -------------------------------------------------------------------------- */

/** Coût total (en EUR) des positions, sans tenir compte des prix actuels. */
export function totalCost(holdings: Holding[]): number {
  return holdings.reduce((acc, h) => acc + h.quantity * h.avgBuyPriceEur, 0);
}

/**
 * Valeur totale (en EUR) des positions à partir d'un map de prix EUR.
 * Une position dont le prix est manquant compte pour 0 (et la card UI le
 * signalera via "—").
 */
export function totalValue(
  holdings: Holding[],
  pricesEur: Record<string, number>
): number {
  return holdings.reduce((acc, h) => {
    const p = pricesEur[h.cryptoId];
    if (!isFiniteNumber(p)) return acc;
    return acc + h.quantity * p;
  }, 0);
}
