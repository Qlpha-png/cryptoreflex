import Link from "next/link";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

/**
 * Empty state premium — utilisé par MarketTable, BlogPreview et
 * tout composant qui peut recevoir un dataset vide.
 *
 * Pas de spinner basique : on affiche un message friendly + CTA optionnel.
 * Aligné avec le design system (glass / primary gold / texte muted).
 */
export interface EmptyStateProps {
  /**
   * Icône Lucide ou n'importe quel ReactNode (svg, image…).
   * Défaut : Inbox.
   */
  icon?: ReactNode;
  /** Titre principal — court, friendly. */
  title: string;
  /** Sous-titre / explication. */
  description?: string;
  /** CTA primaire optionnel (interne ou externe). */
  cta?: {
    label: string;
    href: string;
    /** Si externe : ouvre dans un nouvel onglet. */
    external?: boolean;
  };
  /** Action secondaire optionnelle. */
  secondaryCta?: {
    label: string;
    href: string;
  };
  /** Compact : padding réduit pour les zones contraintes (cards). */
  compact?: boolean;
  /** className additionnelle pour customisation. */
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  cta,
  secondaryCta,
  compact = false,
  className = "",
}: EmptyStateProps) {
  const padding = compact ? "py-8 px-4" : "py-12 sm:py-16 px-6";

  return (
    <div
      className={`glass rounded-2xl ${padding} text-center flex flex-col items-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary-soft border border-primary/20">
        {icon ?? <Inbox className="h-6 w-6" aria-hidden="true" />}
      </div>

      <h3 className="text-lg sm:text-xl font-semibold text-fg">{title}</h3>

      {description ? (
        <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
      ) : null}

      {(cta || secondaryCta) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {cta ? (
            cta.external ? (
              <a
                href={cta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm"
              >
                {cta.label}
              </a>
            ) : (
              <Link href={cta.href} className="btn-primary text-sm">
                {cta.label}
              </Link>
            )
          ) : null}
          {secondaryCta ? (
            <Link href={secondaryCta.href} className="btn-ghost text-sm">
              {secondaryCta.label}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
