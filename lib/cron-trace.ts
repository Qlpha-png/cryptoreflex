/**
 * lib/cron-trace.ts — trace « dernier passage + résultat » des tâches Vercel sans autre preuve (lot fraîcheur A, 08/10/2026,
 * audit n° 2, 50, 51 : instantané de secours des prix, série d'e-mails fiscalité et rappels de série du jeu tournaient
 * sans aucune trace ; un échec ou une absence de passage était invisible).
 *
 * Lue par scripts/sentinelle.mjs (scripts/lib/sentinelle-robots.mjs : TRACES_CRON, seuils 3 h / 30 h / 30 h).
 * Contenu : heure du passage, résultat, NOMBRES seulement (aucune adresse, aucun identifiant de personne).
 * Une écriture par passage (≤ 24 par jour pour la tâche horaire) ; un KV en panne ne fait jamais échouer la tâche.
 */
import { getKv } from "@/lib/kv";

export const CRON_TRACE_KEYS = {
  updateStaticPrices: "cron:update-static-prices:last",
  streakReminders: "cron:streak-reminders:last",
  emailSeriesFiscalite: "cron:email-series-fiscalite:last",
} as const;

export type CronTraceKey = (typeof CRON_TRACE_KEYS)[keyof typeof CRON_TRACE_KEYS];

/** Conservée 3 jours : au-delà, la sentinelle voit « pas de trace » (et la cadence la signale déjà en échec). */
const TTL_S = 3 * 86_400;

export interface CronTrace {
  /** heure du passage (ISO) */
  at: string;
  ok: boolean;
  /** raison courte d'un échec (jamais de donnée personnelle ni de secret) */
  raison?: string;
  [compteur: string]: string | number | boolean | undefined;
}

/** Écrit la trace ; ne lève jamais (le journal garde l'échec d'écriture). */
export async function writeCronTrace(
  key: CronTraceKey,
  result: { ok: boolean; raison?: string } & Record<string, number | boolean | string | undefined>,
  now: Date = new Date(),
): Promise<void> {
  const trace: CronTrace = { ...result, at: now.toISOString(), ok: result.ok };
  if (trace.raison) trace.raison = String(trace.raison).slice(0, 120);
  try {
    await getKv().set(key, trace, { ex: TTL_S });
  } catch (e) {
    console.warn(`[cron-trace] trace ${key} non écrite`, e instanceof Error ? e.message : e);
  }
}
