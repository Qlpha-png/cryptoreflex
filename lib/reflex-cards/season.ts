/**
 * Reflex Cards — jour de saison (heure de Paris).
 *
 * REFLEX_CARDS_LAUNCH_DATE = « AAAA-MM-JJ » du jour 1 (lancement). Absente ou invalide :
 * avant-lancement (jour 0), rien n'est sorti — seules les révélations officielles se voient.
 * Les pages qui en dépendent sont régénérées toutes les heures (revalidate).
 */
const SEASON_DAYS = 90;

export function launchDate(): string | null {
  const v = process.env.REFLEX_CARDS_LAUNCH_DATE?.trim();
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
}

/** date du jour à Paris, « AAAA-MM-JJ » */
export function parisToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** 0 avant le lancement, puis 1, 2, 3… (plafonné à la fin de saison) */
export function seasonDay(now: Date = new Date()): number {
  const L = launchDate();
  if (!L) return 0;
  const d = Math.round((Date.parse(parisToday(now)) - Date.parse(L)) / 86_400_000) + 1;
  return Math.max(0, Math.min(d, SEASON_DAYS));
}
