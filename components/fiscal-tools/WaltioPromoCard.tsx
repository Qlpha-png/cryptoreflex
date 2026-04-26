/**
 * <WaltioPromoCard /> — encart promotionnel Waltio réutilisable.
 *
 * Utilisé sur :
 *  - /outils/calculateur-fiscalite (sous le résultat)
 *  - /blog/comment-declarer-crypto-impots
 *  - /blog/cerfa-3916-bis-crypto
 *  - /blog/fiscalite-defi
 *  - /blog/fiscalite-staking
 *  - /blog/fiscalite-nft
 *
 * Server Component (data statique). Le CTA passe par <AffiliateLink />
 * (rel="sponsored noopener noreferrer" + caption "Publicité — commission").
 *
 * Variantes via prop `variant` :
 *  - "compact" : 1 ligne, lien inline
 *  - "card"    : carte CTA classique (par défaut)
 *  - "banner"  : pleine largeur, dans une section
 */

import Link from "next/link";
import { ArrowRight, FileText, Sparkles, Target } from "lucide-react";
import AffiliateLink from "@/components/AffiliateLink";
import { getRecommendedFiscalTool } from "@/lib/fiscal-tools";

interface WaltioPromoCardProps {
  /** Placement analytics (ex: "calculator-after-result", "blog-cerfa-inline"). */
  placement: string;
  /** Variante visuelle. */
  variant?: "compact" | "card" | "banner";
  /** Surcharge du headline si besoin. */
  headline?: string;
  /** Surcharge de la description. */
  description?: string;
}

export default function WaltioPromoCard({
  placement,
  variant = "card",
  headline,
  description,
}: WaltioPromoCardProps) {
  const waltio = getRecommendedFiscalTool();
  const finalHeadline =
    headline ??
    "Génère ton Cerfa 3916-bis automatiquement avec Waltio";
  const finalDescription =
    description ??
    "Pour des centaines de transactions, le formulaire 2086 et le 3916-bis manuels deviennent ingérables. Waltio (édité en France) connecte tes exchanges, calcule tes plus-values et pré-remplit les formulaires fiscaux français — 30 % de réduction via Cryptoreflex.";

  if (variant === "compact") {
    return (
      <p className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm text-white/85 flex items-start gap-3">
        <Target
          className="h-5 w-5 shrink-0 text-primary-soft mt-0.5"
          aria-hidden="true"
        />
        <span>
          Pour générer ton Cerfa automatiquement,{" "}
          <AffiliateLink
            href={waltio.affiliateUrl}
            platform={waltio.id}
            placement={placement}
            ctaText="Waltio compact inline"
            className="font-semibold text-primary-soft underline hover:text-primary"
            showCaption={false}
          >
            essaie Waltio
          </AffiliateLink>{" "}
          (notre outil recommandé, FR, 30 % de réduction Cryptoreflex). Voir le{" "}
          <Link
            href="/outils/declaration-fiscale-crypto"
            className="underline hover:text-primary-soft"
          >
            comparatif complet
          </Link>
          .
        </span>
      </p>
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
              className="mt-3 font-display text-xl sm:text-2xl font-bold text-white"
            >
              {finalHeadline}
            </h3>
            <p className="mt-2 text-sm sm:text-base text-white/75 max-w-2xl">
              {finalDescription}
            </p>
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
            <p className="text-[10px] text-muted/70">
              Lien d'affiliation publicitaire — commission Cryptoreflex
            </p>
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
            className="font-display font-bold text-white"
          >
            <span aria-hidden="true">🎯 </span>
            {finalHeadline}
          </h4>
          <p className="mt-2 text-sm text-white/75">{finalDescription}</p>

          <ul className="mt-3 space-y-1 text-xs text-white/70">
            <li>· Connexion à 220+ exchanges et wallets (Binance, Kraken, Ledger…)</li>
            <li>· Pré-remplissage du formulaire 2086 + 3916-bis prêt à téléverser</li>
            <li>· Support client en français par chat (réponse &lt; 24h)</li>
          </ul>

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
