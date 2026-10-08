/**
 * scripts/lib/sentinelle-robots.mjs — listes et règles des contrôles « robots » de scripts/sentinelle.mjs, isolées pour
 * être testées (tests/lib/robots-prouves.test.ts). Zéro dépendance.
 *
 * Règle (lot fraîcheur A, 08/10/2026) : un robot vert doit prouver son travail ; un robot qui ne tourne plus, ou qui
 * tourne sans rien produire, doit se voir.
 */

/**
 * Âge maximal du dernier passage d'un workflow GitHub (heures). GitHub retarde souvent ses tâches programmées de
 * plusieurs heures, d'où la marge. 08/10/2026 : la veille officielle y entre (30 h ; elle restait hors de toute
 * surveillance : exclue du contrôle des échecs, absente des cadences) ; le robot FOMC aussi (hebdomadaire).
 * @type {Array<[string, string, number]>}
 */
export const CADENCE = [
  ["daily-content.yml", "actus et analyses du jour", 30],
  ["audit-navigateur.yml", "audit navigateur de nuit", 32],
  ["health-check.yml", "contrôle de santé", 16],
  ["freshness-check.yml", "contrôle de fraîcheur", 40],
  ["refresh-prices-db.yml", "prix de la base", 16],
  ["refresh-static-details-kv.yml", "détails des fiches", 16],
  ["weekly-blog.yml", "article de la semaine", 8 * 24 + 12],
  ["veille-officielle.yml", "veille officielle de nuit (lois, BOFiP, registre MiCA, frais)", 30],
  ["refresh-fomc.yml", "calendrier FOMC de la Fed", 8 * 24 + 12],
];

/**
 * Traces KV « dernier passage + résultat » écrites par les tâches Vercel (lib/cron-trace.ts), âge maximal en heures.
 * update-static-prices : toutes les heures (vercel.json « 0 * * * * ») → 3 h ; série d'e-mails (orchestrateur de 7 h)
 * et rappels de série (19 h) : une fois par jour → 30 h.
 * @type {Array<[string, string, number]>}
 */
export const TRACES_CRON = [
  ["cron:update-static-prices:last", "instantané de secours des prix (update-static-prices)", 3],
  ["cron:streak-reminders:last", "rappels de série du jeu (streak-reminders)", 30],
  ["cron:email-series-fiscalite:last", "série d'e-mails fiscalité", 30],
];

/**
 * Verdict d'une trace : { level: "ok" | "warn" | "fail", msg }.
 * Pas encore de trace : avertissement (premier passage attendu après la mise en ligne) ; trop vieille ou en échec : défaut.
 */
export function jugerTrace(trace, label, maxH, nowMs) {
  if (!trace || typeof trace !== "object" || !trace.at) return { level: "warn", msg: `${label} : pas encore de trace de passage` };
  const t = Date.parse(trace.at);
  if (!Number.isFinite(t)) return { level: "fail", msg: `${label} : trace illisible (heure « ${String(trace.at).slice(0, 40)} »)` };
  const h = (nowMs - t) / 3_600_000;
  if (h > maxH) return { level: "fail", msg: `${label} : dernier passage il y a ${Math.round(h)} h (maximum ${maxH} h)` };
  if (trace.ok !== true) return { level: "fail", msg: `${label} : dernier passage en échec il y a ${Math.round(h)} h (${String(trace.raison ?? "raison inconnue").slice(0, 120)})` };
  return { level: "ok", msg: `${label} : passage réussi il y a ${Math.round(h)} h` };
}
