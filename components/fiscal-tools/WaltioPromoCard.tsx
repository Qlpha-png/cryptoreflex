/**
 * <WaltioPromoCard /> — encart promotionnel Waltio réutilisable.
 *
 * Utilisé sur : /outils/declaration-fiscale-crypto (variante "banner").
 *
 * Server Component (data statique). Le CTA passe par <AffiliateLink />
 * (rel="sponsored nofollow noopener noreferrer" + caption "Publicité — commission").
 *
 * Variantes via prop `variant` :
 *  - "compact" : 1 ligne, lien inline
 *  - "card"    : carte CTA classique (par défaut)
 *  - "banner"  : pleine largeur, dans une section
 *
 * 07/10/2026 :
 *  - encart <WaltioFranchise /> (fuite de données de janvier 2026, sourcée) juste avant le bouton, sauf si la page
 *    l'affiche déjà plus haut (`showFranchise={false}`) ;
 *  - mention visible « Publicité — Cryptoreflex perçoit une commission » sur les 3 variantes (la variante "compact"
 *    n'en avait aucune ; "banner" disait « Lien d'affiliation publicitaire ») ;
 *  - « 220+ exchanges » et « réponse < 24h » retirés : waltio.com/fr annonce « plus de 700 exchanges, wallets et
 *    blockchains » (relu le 07/10/2026) et la fiche partenaire relève 72 h (Starter, Smart) / 24 h (Unlimited).
 */

import Link from "next/link";
import { ArrowRight, FileText, Sparkles, Target } from "lucide-react";
import AffiliateLink from "@/components/AffiliateLink";
import WaltioFranchise from "@/components/fiscal-tools/WaltioFranchise";
import { getRecommendedFiscalTool } from "@/lib/fiscal-tools";
import { paidLinkCaption } from "@/lib/partnerships";

interface WaltioPromoCardProps {
  /** Placement analytics (ex: "calculator-after-result", "blog-cerfa-inline"). */
  placement: string;
  /** Variante visuelle. */
  variant?: "compact" | "card" | "banner";
  /** Surcharge du headline si besoin. */
  headline?: string;
  /** Surcharge de la description. */
  description?: string;
  /** false si la page affiche déjà l'encart <WaltioFranchise /> plus haut. */
  showFranchise?: boolean;
}

export default function WaltioPromoCard({
  placement,
  variant = "card",
  headline,
  description,
  showFranchise = true,
}: WaltioPromoCardProps) {
  const waltio = getRecommendedFiscalTool();
  const caption = paidLinkCaption(waltio.id, waltio.affiliateUrl) ?? "Publicité — Cryptoreflex perçoit une commission";
  const finalHeadline =
    headline ??
    "Générez votre Cerfa 3916-bis automatiquement avec Waltio";
  const finalDescription =
    description ??
    "Pour des centaines de transactions, le formulaire 2086 et le 3916-bis manuels deviennent ingérables. Waltio (édité en France) connecte vos exchanges, calcule vos plus-values et pré-remplit les formulaires fiscaux français — rapport fiscal dès 39 €/an.";

  if (variant === "compact") {
    return (
      <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm text-fg-max/85 flex items-start gap-3">
        <Target
          className="h-5 w-5 shrink-0 text-primary-soft mt-0.5"
          aria-hidden="true"
        />
        <div className="flex-1">
          {showFranchise && <WaltioFranchise variant="line" className="mb-2" />}
          <p>
            Pour générer votre Cerfa automatiquement,{" "}
            <AffiliateLink
              href={waltio.affiliateUrl}
              platform={waltio.id}
              placement={placement}
              ctaText="Waltio compact inline"
              className="font-semibold text-primary-soft underline hover:text-primary"
              showCaption={false}
            >
              essayez Waltio
            </AffiliateLink>{" "}
            <span className="text-[11px] text-muted">({caption})</span>{" "}
            (notre outil recommandé, édité en France, rapport fiscal dès 39 €/an). Voir le{" "}
            <Link
              href="/outils/declaration-fiscale-crypto"
              className="underline hover:text-primary-soft"
            >
              comparatif complet
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <section
        aria-labelledby="waltio-banner-title"
        className="rounded-2xl border border-primary/50 bg-gradient-to-br from-primary/10 via-elevated/40 to-background p-6 sm:p-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Outil partenaire
            </span>
            <h3
              id="waltio-banner-title"
              className="mt-3 font-display text-xl sm:text-2xl font-bold text-fg-max"
            >
              {finalHeadline}
            </h3>
            <p className="mt-2 text-sm sm:text-base text-fg-max/75 max-w-2xl">
              {finalDescription}
            </p>
            {showFranchise && <WaltioFranchise variant="compact" className="mt-4 max-w-2xl" />}
          </div>
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <AffiliateLink
              href={waltio.affiliateUrl}
              platform={waltio.id}
              placement={`${placement}-banner`}
              ctaText="Essayer Waltio (banner)"
              className="btn-primary justify-center"
              showCaption={false}
            >
              Essayer Waltio gratuitement
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </AffiliateLink>
            <Link
              href="/outils/declaration-fiscale-crypto"
              className="text-xs text-muted underline hover:text-primary-soft"
            >
              Voir le comparatif complet
            </Link>
            <p className="text-[10px] text-muted/70">{caption}</p>
          </div>
        </div>
      </section>
    );
  }

  // variant "card" — défaut
  return (
    <section
      aria-labelledby="waltio-card-title"
      className="rounded-2xl border border-primary/40 bg-primary/5 p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-soft"
          aria-hidden="true"
        >
          <FileText className="h-5 w-5 text-background" />
        </div>
        <div className="flex-1">
          <h4
            id="waltio-card-title"
            className="font-display font-bold text-fg-max"
          >
            <span aria-hidden="true">🎯 </span>
            {finalHeadline}
          </h4>
          <p className="mt-2 text-sm text-fg-max/75">{finalDescription}</p>

          <ul className="mt-3 space-y-1 text-xs text-fg-max/70">
            <li>· Plus de 700 exchanges, wallets et blockchains synchronisés (selon Waltio)</li>
            <li>· Formulaires 2086 et 3916-bis à recopier sur impots.gouv.fr</li>
            <li>· Accès en lecture seule à vos données (selon Waltio)</li>
          </ul>

          {showFranchise && <WaltioFranchise variant="compact" className="mt-4" />}

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <Link
              href="/outils/declaration-fiscale-crypto"
              className="btn-ghost justify-center text-sm"
            >
              Comparatif Waltio vs Koinly vs CoinTracking
            </Link>
            <AffiliateLink
              href={waltio.affiliateUrl}
              platform={waltio.id}
              placement={placement}
              ctaText="Essayer Waltio (card)"
              className="btn-primary justify-center text-sm"
            >
              Essayer Waltio
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </AffiliateLink>
          </div>
        </div>
      </div>
    </section>
  );
}
