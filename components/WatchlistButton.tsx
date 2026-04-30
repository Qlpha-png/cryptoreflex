"use client";

import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import {
  WATCHLIST_EVENT,
  addToWatchlist,
  isInWatchlist,
  removeFromWatchlist,
} from "@/lib/watchlist";
import { useUserPlan } from "@/lib/use-user-plan";

interface Props {
  cryptoId: string;
  cryptoName: string;
  /** sm = 28x28 (table row), md = 36x36 (hero / pages dédiées). Défaut sm. */
  size?: "sm" | "md";
  /** className additionnelle pour positionnement. */
  className?: string;
}

/**
 * Bouton "ajouter à la watchlist" — étoile cliquable persistée en localStorage.
 *
 * Sync cross-component : on s'abonne à `window["watchlist:changed"]` pour
 * refléter immédiatement l'état si l'utilisateur a (dé)stoilé la même crypto
 * depuis une autre instance (ex: même crypto dans MarketTable + page détail).
 *
 * SSR-safe : l'état initial est `false` (pas d'accès à localStorage au render),
 * puis hydraté dans un `useEffect`. Pas de mismatch.
 *
 * a11y :
 * - `aria-pressed` reflète l'état (toggle button pattern WAI-ARIA).
 * - `aria-label` dynamique pour les screen readers.
 * - `title` pour le tooltip natif au hover.
 * - Feedback à la limite (toast inline) avec `role="status"` aria-live.
 *
 * Motion : micro-pulse au clic (CSS keyframe locale). Désactivée si
 * `prefers-reduced-motion`.
 */
export default function WatchlistButton({
  cryptoId,
  cryptoName,
  size = "sm",
  className = "",
}: Props) {
  // État initial = false : on n'accède PAS à localStorage au premier render
  // (sinon hydration mismatch SSR ↔ client).
  const [active, setActive] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Récupère la limite watchlist selon le plan (Free 10, Pro 200).
  // Si /api/me n'a pas encore répondu, `loading=true` → on bloque l'ajout
  // (l'utilisateur clique 50ms après mount, on évite d'appliquer une mauvaise
  // limite par défaut).
  const { limits, isPro, loading: planLoading } = useUserPlan();
  const maxWatchlist = limits.watchlist;

  // Sync initiale + abonnement aux events cross-component.
  useEffect(() => {
    setActive(isInWatchlist(cryptoId));

    const onChange = () => {
      setActive(isInWatchlist(cryptoId));
    };
    window.addEventListener(WATCHLIST_EVENT, onChange);
    // Aussi : storage event = sync cross-tab (autre onglet du site).
    window.addEventListener("storage", onChange);

    return () => {
      window.removeEventListener(WATCHLIST_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [cryptoId]);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    const t = setTimeout(() => setFeedback(null), 2200);
    return () => clearTimeout(t);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Évite que le clic ne propage vers une row Link / une card cliquable.
      e.stopPropagation();
      e.preventDefault();

      if (active) {
        removeFromWatchlist(cryptoId);
        setActive(false);
        showFeedback(`${cryptoName} retiré de la watchlist`);
      } else {
        if (planLoading) {
          showFeedback("Chargement…");
          return;
        }
        const ok = addToWatchlist(cryptoId, maxWatchlist);
        if (ok) {
          setActive(true);
          setPulse(true);
          // Reset pulse après 1 anim
          setTimeout(() => setPulse(false), 420);
          showFeedback(`${cryptoName} ajouté à la watchlist`);
        } else {
          // Distinction Free vs Pro pour le hint d'upgrade.
          const upgradeHint = isPro
            ? ""
            : " — passe Soutien sur /pro pour étendre";
          showFeedback(`Watchlist pleine (max ${maxWatchlist})${upgradeHint}`);
        }
      }
    },
    [active, cryptoId, cryptoName, showFeedback, maxWatchlist, isPro, planLoading]
  );

  const sizeBox = size === "md" ? "h-9 w-9" : "h-7 w-7";
  const sizeIcon = size === "md" ? "h-5 w-5" : "h-4 w-4";

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        aria-label={
          active
            ? `Retirer ${cryptoName} de la watchlist`
            : `Ajouter ${cryptoName} à la watchlist`
        }
        title={active ? "Retirer de la watchlist" : "Ajouter à la watchlist"}
        className={`${sizeBox} inline-flex items-center justify-center rounded-lg
                    border transition-colors duration-fast ease-standard
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                    focus-visible:ring-offset-2 focus-visible:ring-offset-background
                    ${
                      active
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/60 text-muted hover:border-primary/40 hover:text-primary-soft hover:bg-primary/5"
                    }
                    ${pulse ? "watchlist-pulse" : ""}
                    `}
      >
        <Star
          className={sizeIcon}
          strokeWidth={1.75}
          fill={active ? "currentColor" : "none"}
          aria-hidden="true"
        />
      </button>

      {/* Feedback inline — discret, aria-live polite pour les SR */}
      {feedback && (
        <span
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2
                     whitespace-nowrap rounded-lg border border-border bg-elevated/95
                     px-3 py-1.5 text-[11px] font-medium text-fg shadow-e3 z-30
                     animate-fade-in"
        >
          {feedback}
        </span>
      )}

      {/* Pulse local — pure CSS, pas de framer-motion. */}
      <style>{`
        @keyframes watchlist-pulse {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        .watchlist-pulse {
          animation: watchlist-pulse 380ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .watchlist-pulse { animation: none !important; }
        }
      `}</style>
    </span>
  );
}
