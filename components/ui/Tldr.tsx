import { Sparkles, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * <Tldr /> — composant réutilisable "TLDR-first" pour pages longues.
 *
 * Mantra UX 2026-05-02 : *« Aucune page > 800 mots ne sort sans TLDR en
 * haut. »*
 *
 * Pattern Stripe docs / Brilliant.org — donne au visiteur une carte
 * récapitulative scannable en <10 sec qui contient :
 *  - Une phrase héro (1-2 lignes)
 *  - 3-5 bullets emoji-prefixed
 *  - Optionnel : temps de lecture, niveau, badge "À retenir"
 *
 * Server Component pur (zéro JS shippé). Marqueur ARIA `region` +
 * `aria-labelledby` pour annonce lecteur d'écran.
 *
 * Usage :
 *
 *   <Tldr
 *     headline="Bitcoin est rare, décentralisé, et limité à 21M d'unités."
 *     bullets={[
 *       { emoji: "💰", text: "Créé en 2009 par Satoshi Nakamoto" },
 *       { emoji: "🏦", text: "Aucune banque ni État ne peut bloquer un compte" },
 *       { emoji: "⛏️", text: "Halving tous les 4 ans = offre divisée par 2" },
 *     ]}
 *     readingTime="8 min"
 *     level="Débutant"
 *   />
 */

export interface TldrBullet {
  /** Emoji prefix (1 caractère idéalement). Visuel scannable. */
  emoji: string;
  /** Texte du bullet (idéalement < 100 chars). */
  text: string;
}

export interface TldrProps {
  /** Phrase héro de la TLDR — 1-2 lignes max. */
  headline: string;
  /** 3-5 bullets emoji-prefixed (au-delà = trop long, casse le scan). */
  bullets: TldrBullet[];
  /** Temps de lecture estimé (optionnel — ex: "8 min"). */
  readingTime?: string;
  /** Niveau du contenu (optionnel — ex: "Débutant", "Intermédiaire", "Expert"). */
  level?: string;
  /** Classes Tailwind additionnelles. */
  className?: string;
  /** Icône custom à gauche du headline (défaut : Sparkles). */
  Icon?: LucideIcon;
  /** ID unique pour aria-labelledby (auto-généré si absent). */
  id?: string;
  /** Children optionnel — rendu sous les bullets si fourni. */
  children?: ReactNode;
}

export default function Tldr({
  headline,
  bullets,
  readingTime,
  level,
  className = "",
  Icon = Sparkles,
  id,
  children,
}: TldrProps) {
  const headingId = id ?? `tldr-${headline.slice(0, 20).replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;

  return (
    <section
      role="region"
      aria-labelledby={headingId}
      className={`rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 ${className}`}
    >
      <header className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-primary-soft font-bold">
            En 60 secondes
          </div>
          <h2
            id={headingId}
            className="mt-0.5 text-base sm:text-lg font-bold text-fg leading-snug"
          >
            {headline}
          </h2>
        </div>
      </header>

      <ul className="mt-4 space-y-2.5">
        {bullets.map((b, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-sm text-fg/90 leading-relaxed"
          >
            <span
              aria-hidden="true"
              className="text-base leading-tight pt-0.5 shrink-0"
            >
              {b.emoji}
            </span>
            <span>{b.text}</span>
          </li>
        ))}
      </ul>

      {(readingTime || level) && (
        <div className="mt-4 flex items-center gap-3 text-[11px] text-muted">
          {readingTime && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {readingTime}
            </span>
          )}
          {level && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/40 px-2 py-0.5 font-medium text-fg/85">
              {level}
            </span>
          )}
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
