/**
 * <FiscalToolCard /> — carte outil fiscal réutilisable.
 *
 * Affiche logo + nom + score + 3 pros + 1 con + prix dès + CTA affilié.
 * Server Component (pas d'interactivité, data statique).
 *
 * Conformité loi Influenceurs (juin 2023) : le CTA passe par <AffiliateLink />
 * qui gère automatiquement `rel="sponsored noopener noreferrer"` + caption
 * "Publicité — Cryptoreflex perçoit une commission".
 */

import Image from "next/image";
import Link from "next/link";
import { Check, Star, X, ArrowRight } from "lucide-react";
import AffiliateLink from "@/components/AffiliateLink";
import { formatStartingPrice } from "@/lib/fiscal-tools";
import type { FiscalTool } from "@/lib/fiscal-tools-types";

interface FiscalToolCardProps {
  tool: FiscalTool;
  /** Position sur la page pour le tracking analytics. */
  placement?: string;
  /** Affiche un badge "Recommandé" si tool.recommended === true. */
  showRecommendedBadge?: boolean;
  /** Si true, le CTA principal pointe vers la page d'avis interne ; sinon vers l'affilié. */
  primaryToInternal?: boolean;
}

export default function FiscalToolCard({
  tool,
  placement = "fiscal-tool-card",
  showRecommendedBadge = true,
  primaryToInternal = false,
}: FiscalToolCardProps) {
  const startingPrice = formatStartingPrice(tool);
  const topPros = tool.pros.slice(0, 3);
  const topCon = tool.cons[0];
  const ctaLabel = `Essayer ${tool.name}`;

  return (
    <article
      className={`relative glass rounded-2xl p-5 sm:p-6 flex flex-col h-full
                  ${
                    tool.recommended
                      ? "border-primary/60 ring-1 ring-primary/30"
                      : "border-border"
                  }`}
      aria-labelledby={`fiscal-tool-${tool.id}-name`}
    >
      {/* Badge recommandé */}
      {showRecommendedBadge && tool.recommended && (
        <span
          className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary-soft px-3 py-1 text-xs font-bold text-background shadow"
          aria-label="Outil recommandé par Cryptoreflex"
        >
          <Star className="h-3.5 w-3.5" aria-hidden="true" />
          Recommandé Cryptoreflex
        </span>
      )}

      {/* Header : logo + nom + score */}
      <header className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-elevated/70 border border-border overflow-hidden">
          <Image
            src={tool.logoUrl}
            alt={`Logo ${tool.name}`}
            width={40}
            height={40}
            className="object-contain"
            unoptimized
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3
            id={`fiscal-tool-${tool.id}-name`}
            className="font-display font-bold text-lg text-white leading-tight"
          >
            {tool.name}
          </h3>
          <p className="mt-1 text-xs text-muted">
            {tool.country === "FR"
              ? "Édité en France"
              : tool.country === "DE"
              ? "Édité en Allemagne"
              : "Édité au Royaume-Uni"}
            {tool.supportFr ? " · Support FR" : " · Support EN"}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-elevated px-2.5 py-1 text-xs font-bold text-primary-soft border border-primary/30">
          <Star className="h-3 w-3 fill-current" aria-hidden="true" />
          {tool.score.toFixed(1)}/10
        </div>
      </header>

      {/* Prix de départ */}
      <p className="mt-4 text-sm">
        <span className="text-muted">Tarif : </span>
        <strong className="text-white">{startingPrice}</strong>
        {tool.freeTrial && (
          <span className="ml-2 inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
            Essai gratuit
          </span>
        )}
      </p>

      {/* Pros (3) */}
      <ul className="mt-4 space-y-1.5 text-sm text-white/80">
        {topPros.map((pro) => (
          <li key={pro} className="flex gap-2">
            <Check
              className="h-4 w-4 shrink-0 text-success mt-0.5"
              aria-hidden="true"
            />
            <span>{pro}</span>
          </li>
        ))}
      </ul>

      {/* Con (1) */}
      {topCon && (
        <p className="mt-3 flex gap-2 text-sm text-white/60">
          <X
            className="h-4 w-4 shrink-0 text-danger-fg mt-0.5"
            aria-hidden="true"
          />
          <span>{topCon}</span>
        </p>
      )}

      {/* CTA */}
      <div className="mt-auto pt-5 space-y-2">
        {primaryToInternal ? (
          <>
            <Link
              href="/outils/declaration-fiscale-crypto"
              className="btn-primary w-full justify-center"
            >
              Voir le comparatif détaillé
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <AffiliateLink
              href={tool.affiliateUrl}
              platform={tool.id}
              placement={placement}
              ctaText={ctaLabel}
              className="btn-ghost w-full justify-center"
              showCaption={false}
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </AffiliateLink>
          </>
        ) : (
          <AffiliateLink
            href={tool.affiliateUrl}
            platform={tool.id}
            placement={placement}
            ctaText={ctaLabel}
            className="btn-primary w-full justify-center"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </AffiliateLink>
        )}
      </div>
    </article>
  );
}
