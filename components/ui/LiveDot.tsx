/**
 * <LiveDot /> — pastille pulse "live" pour signaler une donnée en temps réel.
 *
 * Pattern UX 2026-05-02 #18 (audit dynamisme expert) : "tout chiffre
 * temps-réel doit être accompagné d'un signal visuel de live status".
 * Sans ce signal, le user ne sait pas distinguer une donnée fraîche d'une
 * donnée gelée.
 *
 * Usage :
 *   <LiveDot />                     // vert pulse (data live OK)
 *   <LiveDot variant="amber" />     // jaune (data légèrement stale)
 *   <LiveDot variant="red" />       // rouge (data error / down)
 *   <LiveDot label="Mise à jour il y a 2 sec" />
 *
 * Server Component pur. Pulse via CSS animation (motion-safe).
 */

export type LiveDotVariant = "green" | "amber" | "red";

export interface LiveDotProps {
  /** Couleur du dot — green = OK live, amber = stale, red = error. Défaut green. */
  variant?: LiveDotVariant;
  /** Texte d'accompagnement (ex: "il y a 2 sec"). Optionnel. */
  label?: string;
  /** Classes Tailwind additionnelles. */
  className?: string;
  /** Taille en px (défaut 8px). */
  size?: number;
}

const COLORS: Record<LiveDotVariant, { bg: string; ring: string; text: string }> = {
  green: {
    bg: "bg-success",
    ring: "ring-success/30",
    text: "text-success",
  },
  amber: {
    bg: "bg-amber-400",
    ring: "ring-amber-400/30",
    text: "text-amber-300",
  },
  red: {
    bg: "bg-danger",
    ring: "ring-danger/30",
    text: "text-danger",
  },
};

export default function LiveDot({
  variant = "green",
  label,
  className = "",
  size = 8,
}: LiveDotProps) {
  const c = COLORS[variant];
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      role="status"
      aria-label={label ? `Live — ${label}` : "Live"}
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex shrink-0 rounded-full ${c.bg} motion-safe:animate-pulse motion-reduce:opacity-90`}
        style={{ width: size, height: size }}
      >
        {/* Halo doux pour renforcer l'effet pulse */}
        <span
          className={`absolute inset-0 rounded-full ${c.bg} opacity-50 motion-safe:animate-ping motion-reduce:hidden`}
          style={{ width: size, height: size }}
        />
      </span>
      {label && (
        <span className={`text-[11px] font-medium uppercase tracking-wider ${c.text}`}>
          {label}
        </span>
      )}
    </span>
  );
}
