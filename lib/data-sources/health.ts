/**
 * lib/data-sources/health.ts — Disjoncteur PAR USAGE, en MÉMOIRE DU PROCESSUS (06/10/2026).
 *
 * Aucune écriture KV (KV de production au plafond) : chaque instance Vercel tient son propre compteur.
 * Règle : après FAILURE_THRESHOLD échecs en WINDOW_MS, l'usage est mis de côté COOLDOWN_MS, puis UN appel
 * d'essai est autorisé (semi-ouvert). Succès → reprend sa place ; échec → nouvelle mise de côté.
 * Un essai resté sans réponse plus de TRIAL_TIMEOUT_MS est considéré comme perdu : un nouvel essai est permis
 * (sinon l'usage resterait bloqué pour toujours dans cette instance).
 * Erreurs « graves » (401/403 : clé refusée) → mise de côté immédiate, durée SEVERE_COOLDOWN_MS.
 *
 * UN DISJONCTEUR PAR USAGE (« canal ») et non par fournisseur : CoinGecko sans clé (/simple/price, limité par IP)
 * et CoinGecko avec la clé Demo (/coins/markets, /global, limité par clé) n'ont ni le même quota ni les mêmes
 * pannes. Les échecs de l'un ne doivent jamais couper l'autre (incident relevé par le vérificateur le 06/10/2026 :
 * 3 refus du /simple/price public coupaient /coins/markets, qui marchait). Par défaut, le canal = le nom de la source.
 *
 * « Pas de donnée pour cette crypto » n'est PAS un échec, et une donnée rejetée pour UNE crypto (contrôle de
 * cohérence propre à cette crypto) ne compte pas non plus : seules les erreurs (HTTP, délai, réponse illisible) et
 * les réponses d'ensemble aberrantes (liste incohérente) comptent.
 *
 * Journal : lignes préfixées « [canal] … » (lisibles par la sentinelle dans les journaux Vercel).
 */

import type { SourceName } from "./priorities";

export const HEALTH_CONFIG = {
  FAILURE_THRESHOLD: 3,
  WINDOW_MS: 5 * 60_000,
  COOLDOWN_MS: 5 * 60_000,
  SEVERE_COOLDOWN_MS: 30 * 60_000,
  SUSPECT_MS: 60 * 60_000,
  /** Délai de garde de l'appel d'essai du semi-ouvert. */
  TRIAL_TIMEOUT_MS: 30_000,
} as const;

/** Canaux (usages) distincts d'une même source. */
export const CHANNELS = {
  /** CoinGecko SANS clé : /simple/price (relais de prix, complément des champs d'une fiche). Quota par IP. */
  coingeckoPublic: "coingecko-public",
  /** CoinGecko AVEC la clé Demo : /coins/markets (top, complément du top), /global. Quota par clé. */
  coingeckoKey: "coingecko-cle",
} as const;

export type HealthChannel = SourceName | (typeof CHANNELS)[keyof typeof CHANNELS];

interface SourceState {
  failures: number[];
  openUntil: number;
  /** Mise de côté terminée : un seul appel d'essai en cours. */
  trialInFlight: boolean;
  trialStartedAt: number;
  lastReason: string | null;
}

const states = new Map<string, SourceState>();
/** Couples source+crypto signalés par le contrôle croisé : ignorés SUSPECT_MS pour cette crypto seulement. */
const suspects = new Map<string, { until: number; reason: string }>();

function stateOf(channel: string): SourceState {
  let s = states.get(channel);
  if (!s) {
    s = { failures: [], openUntil: 0, trialInFlight: false, trialStartedAt: 0, lastReason: null };
    states.set(channel, s);
  }
  return s;
}

function log(channel: string, message: string): void {
  // eslint-disable-next-line no-console
  console.warn(`[${channel}] ${message}`);
}

/** L'usage peut-il être appelé maintenant ? (faux = mis de côté). */
export function isAvailable(channel: HealthChannel, now: number = Date.now()): boolean {
  const s = states.get(channel);
  if (!s || s.openUntil === 0) return true;
  if (now < s.openUntil) return false;
  // Fin de la mise de côté : un seul appel d'essai à la fois… sauf si l'essai en cours n'a jamais répondu.
  if (s.trialInFlight) {
    if (now - s.trialStartedAt < HEALTH_CONFIG.TRIAL_TIMEOUT_MS) return false;
    log(channel, `essai sans réponse depuis ${Math.round(HEALTH_CONFIG.TRIAL_TIMEOUT_MS / 1000)} s : nouvel essai`);
  } else {
    log(channel, "fin de la mise de côté : nouvel essai");
  }
  s.trialInFlight = true;
  s.trialStartedAt = now;
  return true;
}

export function recordSuccess(channel: HealthChannel): void {
  const s = states.get(channel);
  if (!s) return;
  if (s.openUntil !== 0) log(channel, "rétablie, reprend sa place dans l'ordre de priorité");
  s.failures = [];
  s.openUntil = 0;
  s.trialInFlight = false;
  s.lastReason = null;
}

export function recordFailure(
  channel: HealthChannel,
  reason: string,
  opts: { severe?: boolean; now?: number } = {},
): void {
  const now = opts.now ?? Date.now();
  const s = stateOf(channel);
  s.lastReason = reason;
  if (s.trialInFlight || opts.severe) {
    const ms = opts.severe ? HEALTH_CONFIG.SEVERE_COOLDOWN_MS : HEALTH_CONFIG.COOLDOWN_MS;
    s.trialInFlight = false;
    s.openUntil = now + ms;
    s.failures = [];
    log(channel, `mise de côté ${Math.round(ms / 60_000)} min (${reason})`);
    return;
  }
  s.failures = s.failures.filter((t) => now - t < HEALTH_CONFIG.WINDOW_MS);
  s.failures.push(now);
  if (s.failures.length >= HEALTH_CONFIG.FAILURE_THRESHOLD) {
    s.openUntil = now + HEALTH_CONFIG.COOLDOWN_MS;
    s.failures = [];
    log(
      channel,
      `mise de côté ${Math.round(HEALTH_CONFIG.COOLDOWN_MS / 60_000)} min après ${HEALTH_CONFIG.FAILURE_THRESHOLD} échecs (${reason})`,
    );
  } else {
    log(channel, `échec ${s.failures.length}/${HEALTH_CONFIG.FAILURE_THRESHOLD} (${reason})`);
  }
}

export function markSuspect(source: SourceName, id: string, reason: string, now: number = Date.now()): void {
  suspects.set(`${source}|${id}`, { until: now + HEALTH_CONFIG.SUSPECT_MS, reason });
}

export function isSuspect(source: SourceName, id: string, now: number = Date.now()): boolean {
  const e = suspects.get(`${source}|${id}`);
  if (!e) return false;
  if (now >= e.until) {
    suspects.delete(`${source}|${id}`);
    return false;
  }
  return true;
}

/** État lisible (débogage, sentinelle). Ne contient aucun secret. */
export function healthSnapshot(now: number = Date.now()): Record<string, { open: boolean; openForMs: number; recentFailures: number; lastReason: string | null }> {
  const out: Record<string, { open: boolean; openForMs: number; recentFailures: number; lastReason: string | null }> = {};
  for (const [name, s] of states) {
    out[name] = {
      open: now < s.openUntil,
      openForMs: Math.max(0, s.openUntil - now),
      recentFailures: s.failures.filter((t) => now - t < HEALTH_CONFIG.WINDOW_MS).length,
      lastReason: s.lastReason,
    };
  }
  return out;
}

/** Tests uniquement. */
export function __resetHealthForTests(): void {
  states.clear();
  suspects.clear();
}
