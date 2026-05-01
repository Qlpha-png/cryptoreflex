"use client";

import { useCallback, useState } from "react";
import { Check, Scale } from "lucide-react";
import { useCompareList } from "@/lib/use-compare-list";

interface Props {
  /** Slug = id de la crypto (clé canonique de getCryptoBySlug). */
  slug: string;
  /** Nom affiché dans le toast. */
  cryptoName: string;
  /** Variant visuel : `solid` (bouton plein) ou `ghost` (lien discret). */
  variant?: "solid" | "ghost";
  /** className additionnelle (positionnement). */
  className?: string;
}

/**
 * AddToCompareButton — bouton 2-états (ajouter / retirer du comparateur)
 * placé sur les fiches `/cryptos/[slug]` à côté du Hero.
 *
 * - Avant ajout : "+ Comparer" (icône Scale, gold subtil)
 * - Après ajout : "Ajouté" (icône Check, vert) — re-clic = retire
 *
 * Toast inline (role="status" aria-live="polite") qui apparaît 2s après l'action.
 *
 * SSR-safe : tant que le hook n'est pas hydraté on rend l'état "ajouter" par
 * défaut. Le bouton est légèrement neutralisé (`disabled`) le temps de la
 * 1re hydratation pour éviter un double-clic envoyant 2 events incohérents.
 */
export default function AddToCompareButton({
  slug,
  cryptoName,
  variant = "solid",
  className = "",
}: Props) {
  const { has, add, remove, hydrated, list, max } = useCompareList();
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    const t = setTimeout(() => setFeedback(null), 2200);
    return () => clearTimeout(t);
  }, []);

  const active = has(slug);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!hydrated) return;

      if (active) {
        remove(slug);
        showFeedback(`${cryptoName} retiré du comparateur`);
        return;
      }
      const ok = add(slug);
      if (ok) {
        showFeedback(`${cryptoName} ajouté au comparateur`);
      } else if (list.length >= max) {
        showFeedback(`Comparateur plein (${max} max)`);
      } else {
        showFeedback("Déjà dans le comparateur");
      }
    },
    [active, add, remove, hydrated, slug, cryptoName, list.length, max, showFeedback]
  );

  const baseSolid = active
    ? "border-accent-green/40 bg-accent-green/10 text-accent-green hover:bg-accent-green/15"
    : "border-primary/30 bg-primary/10 text-primary-soft hover:bg-primary/15";
  const baseGhost = active
    ? "text-accent-green hover:text-accent-green/80"
    : "text-primary-soft hover:text-primary";

  return (
    <div className={`relative inline-flex flex-col items-start ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={!hydrated}
        aria-pressed={active}
        aria-label={
          active
            ? `Retirer ${cryptoName} du comparateur`
            : `Ajouter ${cryptoName} au comparateur`
        }
        title={
          active
            ? `Retirer ${cryptoName} du comparateur`
            : `Ajouter ${cryptoName} au comparateur`
        }
        className={
          variant === "solid"
            ? `inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed ${baseSolid}`
            : `inline-flex items-center gap-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${baseGhost}`
        }
      >
        {active ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Scale className="h-4 w-4" aria-hidden="true" />
        )}
        <span>{active ? "Ajouté au comparateur" : "+ Comparer"}</span>
      </button>

      {feedback && (
        <span
          role="status"
          aria-live="polite"
          className="absolute left-0 top-full mt-2 inline-block rounded-md border border-border bg-elevated px-2.5 py-1 text-[11px] font-medium text-fg shadow-lg shadow-black/30 whitespace-nowrap"
        >
          {feedback}
        </span>
      )}
    </div>
  );
}
