"use client";

import Link from "next/link";
import { Check, Sparkles, type LucideIcon } from "lucide-react";

/**
 * <TieredPricing /> — composant réutilisable de pricing 2 ou 3 colonnes.
 *
 * Utilisé sur :
 *  - /sponsoring (offres B2B)
 *  - /pro (plans abonnement)
 *
 * Pourquoi un seul composant pour deux usages différents :
 *  - Même grille visuelle (1 colonne mobile, n colonnes desktop).
 *  - Même logique de "highlight" sur 1 plan (ring or + ombre dorée).
 *  - Même CTA (Link interne ou ancre selon le préfixe `#` ou `/`).
 *
 * On garde côté client à cause de l'usage de Link et des classNames
 * dynamiques — pas de Server Action ici.
 */

export interface PricingTier {
  id: string;
  name: string;
  /** Badge facultatif au-dessus du nom (ex : « Le plus populaire ») */
  badge?: string;
  price: string;
  priceUnit: string;
  description?: string;
  features: string[];
  /** Features barrées (uniquement plan free pour comparaison). */
  excluded?: string[];
  ctaLabel: string;
  ctaHref: string;
  /** Indique le plan recommandé (1 seul par grille). */
  highlight?: boolean;
  /** Étiquette d'availability — V1 / V2 dispo / Bientôt etc. */
  availability?: string;
  /** Icône Lucide affichée au-dessus du titre. */
  Icon?: LucideIcon;
}

interface TieredPricingProps {
  tiers: PricingTier[];
  /** Optionnel : titre H2 affiché au-dessus de la grille. */
  heading?: string;
  subheading?: string;
}

export default function TieredPricing({
  tiers,
  heading,
  subheading,
}: TieredPricingProps) {
  const cols =
    tiers.length === 4
      ? "lg:grid-cols-4"
      : tiers.length === 2
        ? "lg:grid-cols-2"
        : "lg:grid-cols-3";

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {(heading || subheading) && (
        <div className="text-center mb-10">
          {heading && (
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg">
              {heading}
            </h2>
          )}
          {subheading && <p className="mt-2 text-fg/70">{subheading}</p>}
        </div>
      )}

      <div className={`grid grid-cols-1 ${cols} gap-6`}>
        {tiers.map((tier) => {
          const isAnchor = tier.ctaHref.startsWith("#");
          const isExternal = /^https?:\/\//.test(tier.ctaHref);
          const ctaClass = tier.highlight ? "btn-primary w-full" : "btn-ghost w-full";

          return (
            <article
              key={tier.id}
              aria-labelledby={`tier-${tier.id}-name`}
              className={`relative rounded-3xl p-6 sm:p-8 flex flex-col ${
                tier.highlight
                  ? "card-premium ring-2 ring-primary/40 shadow-[0_20px_60px_-20px_rgba(245,165,36,0.4)]"
                  : "glass"
              }`}
            >
              {tier.badge && (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${
                    tier.highlight
                      ? "bg-primary text-background"
                      : "bg-elevated border border-border text-primary-soft"
                  }`}
                >
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  {tier.badge}
                </span>
              )}

              {tier.Icon && (
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary mb-3">
                  <tier.Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              )}

              <h3
                id={`tier-${tier.id}-name`}
                className="text-xl font-extrabold text-white"
              >
                {tier.name}
              </h3>

              {tier.availability && (
                <p className="mt-1 text-xs uppercase tracking-wide text-primary-soft font-semibold">
                  {tier.availability}
                </p>
              )}

              {tier.description && (
                <p className="mt-2 text-sm text-white/70">{tier.description}</p>
              )}

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">
                  {tier.price}
                </span>
                <span className="text-sm text-white/60">{tier.priceUnit}</span>
              </div>

              <ul className="mt-5 space-y-2 text-sm flex-1" role="list">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-white/90">
                    <Check
                      className="h-4 w-4 mt-0.5 text-success shrink-0"
                      aria-hidden="true"
                    />
                    <span>{f}</span>
                  </li>
                ))}
                {tier.excluded?.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-white/40 line-through"
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/30 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isExternal ? (
                  <a
                    href={tier.ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={ctaClass}
                  >
                    {tier.ctaLabel}
                  </a>
                ) : isAnchor ? (
                  <a href={tier.ctaHref} className={ctaClass}>
                    {tier.ctaLabel}
                  </a>
                ) : (
                  <Link href={tier.ctaHref} className={ctaClass}>
                    {tier.ctaLabel}
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
