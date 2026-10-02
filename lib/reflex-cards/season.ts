/**
 * Reflex Cards — jour de saison (heure de Paris).
 *
 * NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE = « AAAA-MM-JJ » du jour 1 (lancement), lisible côté serveur
 * et navigateur. Absente ou invalide : avant-lancement (jour 0), rien n'est sorti — seules les
 * révélations officielles se voient. Les pages qui en dépendent sont régénérées toutes les heures.
 */
const SEASON_DAYS = 90;

/** date « AAAA-MM-JJ » réellement existante (refuse 2026-02-31, que Date.parse accepte) */
const isRealDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;

export function launchDate(): string | null {
  const v = (process.env.NEXT_PUBLIC_REFLEX_CARDS_LAUNCH_DATE ?? process.env.REFLEX_CARDS_LAUNCH_DATE)?.trim();
  return v && isRealDate(v) ? v : null;
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

/** le jeu est-il ouvert ? (formulations « bientôt » / « nouveau ») */
export const isLaunched = (now: Date = new Date()): boolean => seasonDay(now) >= 1;
