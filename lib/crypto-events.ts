/**
 * lib/crypto-events.ts — Calendrier d'événements crypto à court-moyen terme.
 *
 * Complémentaire à `lib/crypto-roadmaps.ts` :
 *   - crypto-roadmaps : long terme + rétrospectif (statut done/in-progress/planned).
 *   - crypto-events    : court-moyen terme (J-30 -> J+180) avec dates précises
 *                        et compte à rebours destiné à l'affichage.
 *
 * Les données sont 100% statiques (JSON éditorial) — pas de fetch externe en V1.
 */
import eventsData from "@/data/crypto-events.json";
import { getCryptoBySlug } from "@/lib/cryptos";

export type CryptoEventType =
  | "token-unlock"
  | "hard-fork"
  | "etf-deadline"
  | "conference"
  | "governance-vote"
  | "halving"
  | "mainnet-upgrade";

export type CryptoEventImportance = "high" | "medium" | "low";

/** Forme stockée dans le JSON. */
interface RawCryptoEvent {
  date: string; // YYYY-MM-DD
  type: CryptoEventType;
  title: string;
  description: string;
  importance: CryptoEventImportance;
  sourceUrl?: string;
}

interface RawGlobalEvent extends RawCryptoEvent {
  appliesTo: string[]; // crypto.id list
}

interface EventsFile {
  _meta?: { lastUpdated?: string };
  events: Record<string, RawCryptoEvent[]>;
  globalEvents?: RawGlobalEvent[];
}

const FILE = eventsData as EventsFile;
const EVENTS_BY_CRYPTO: Record<string, RawCryptoEvent[]> = FILE.events ?? {};
const GLOBAL_EVENTS: RawGlobalEvent[] = FILE.globalEvents ?? [];

/** Date de dernière vérification éditoriale (affichée en footer du composant). */
export const EVENTS_LAST_UPDATED: string = FILE._meta?.lastUpdated ?? "2026-05-01";

/** Évènement avec calcul du nombre de jours restants. */
export interface CryptoEvent extends RawCryptoEvent {
  daysUntil: number;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Renvoie la date du jour à 00:00 UTC pour comparaisons stables côté serveur. */
function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Parse "YYYY-MM-DD" en Date UTC à 00:00. Renvoie NaN-date si invalide. */
function parseEventDate(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return new Date(NaN);
  const [, y, mo, d] = m;
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function decorate(raw: RawCryptoEvent): CryptoEvent | null {
  const d = parseEventDate(raw.date);
  if (Number.isNaN(d.getTime())) return null;
  return { ...raw, daysUntil: daysBetween(d, todayUtc()) };
}

/* -------------------------------------------------------------------------- */
/*  API publique                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Retourne les prochains événements (futurs) pour une crypto donnée.
 * Trie par date ASC, applique éventuellement un `limit` (default 5).
 * Inclut les `globalEvents` qui mentionnent cette crypto dans `appliesTo`.
 */
export function getUpcomingEventsFor(
  cryptoId: string,
  limit = 5,
): CryptoEvent[] {
  const own = (EVENTS_BY_CRYPTO[cryptoId] ?? [])
    .map(decorate)
    .filter((e): e is CryptoEvent => e !== null);

  const global = GLOBAL_EVENTS.filter((g) => g.appliesTo.includes(cryptoId))
    .map((g) => {
      const { appliesTo: _appliesTo, ...rest } = g;
      return decorate(rest);
    })
    .filter((e): e is CryptoEvent => e !== null);

  return [...own, ...global]
    .filter((e) => e.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, limit);
}

/** Évènement enrichi de l'identité de la crypto (pour la page calendrier global). */
export interface CryptoEventWithCrypto extends CryptoEvent {
  cryptoId: string;
  cryptoName: string;
}

/**
 * Retourne tous les événements futurs cross-crypto, triés par date ASC.
 * Utile pour /calendrier-crypto. Limit default 50.
 */
export function getAllUpcomingEvents(limit = 50): CryptoEventWithCrypto[] {
  const result: CryptoEventWithCrypto[] = [];

  for (const [cryptoId, list] of Object.entries(EVENTS_BY_CRYPTO)) {
    const c = getCryptoBySlug(cryptoId);
    const cryptoName = c?.name ?? cryptoId;
    for (const raw of list) {
      const ev = decorate(raw);
      if (!ev || ev.daysUntil < 0) continue;
      result.push({ ...ev, cryptoId, cryptoName });
    }
  }

  for (const g of GLOBAL_EVENTS) {
    for (const cryptoId of g.appliesTo) {
      const c = getCryptoBySlug(cryptoId);
      const cryptoName = c?.name ?? cryptoId;
      const { appliesTo: _appliesTo, ...rest } = g;
      const ev = decorate(rest);
      if (!ev || ev.daysUntil < 0) continue;
      result.push({ ...ev, cryptoId, cryptoName });
    }
  }

  return result
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, limit);
}
