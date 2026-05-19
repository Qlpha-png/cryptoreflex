import { CalendarCheck2 } from "lucide-react";

/**
 * LastReviewedBadge — affiche la date de dernière vérification éditoriale
 * de la fiche, en E-E-A-T signal pour Google + transparence user.
 *
 * Standard fiche crypto premium (audit Kev phase 3 — 19/05/2026).
 *
 * Conventions :
 *  - On préfère "vérifié" à "mis à jour" : signale un acte éditorial
 *    (humain a relu), pas un timestamp auto qui dérive.
 *  - Format date FR : "25 avr. 2026" (court, sans ambigüité).
 *  - Variante `compact` : pour insertion dans un Hero serré.
 *  - Variante `full` : pour insertion sous le H1 ou en bas de fiche.
 *
 * Server Component pur — aucun JS shippé.
 */

interface Props {
  /** Date ISO (ex: "2026-04-25") — si invalide, le composant retourne null. */
  dateIso: string | undefined | null;
  /** Variante d'affichage. Default "compact". */
  variant?: "compact" | "full";
  /** Label personnalisable. Default "Vérifié éditorialement". */
  label?: string;
  /** Classe CSS additionnelle. */
  className?: string;
}

function formatFr(dateIso: string): string {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function LastReviewedBadge({
  dateIso,
  variant = "compact",
  label = "Vérifié éditorialement",
  className = "",
}: Props) {
  if (!dateIso) return null;
  const formatted = formatFr(dateIso);
  if (!formatted) return null;

  if (variant === "full") {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-lg border border-border bg-elevated/60 px-3 py-1.5 text-xs ${className}`.trim()}
        role="note"
        aria-label={`${label} le ${formatted}`}
      >
        <CalendarCheck2 className="h-3.5 w-3.5 text-primary-soft" aria-hidden="true" />
        <span className="font-semibold text-fg">{label} :</span>
        <time dateTime={dateIso} className="font-mono text-fg/85">
          {formatted}
        </time>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/40 px-2 py-0.5 text-[11px] font-medium text-muted ${className}`.trim()}
      role="note"
      aria-label={`${label} le ${formatted}`}
    >
      <CalendarCheck2 className="h-3 w-3" aria-hidden="true" />
      <span className="hidden sm:inline">Vérif. </span>
      <time dateTime={dateIso} className="font-mono text-fg/80">
        {formatted}
      </time>
    </span>
  );
}
