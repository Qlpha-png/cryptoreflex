"use client";

import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";
import { trackAffiliateClick } from "@/lib/analytics";

/**
 * AffiliateLink — wrapper standardisé pour TOUS les liens d'affiliation.
 *
 * Pourquoi ce composant ?
 *  - SEO : applique automatiquement `rel="sponsored nofollow noopener noreferrer"`
 *    (Google demande explicitement `sponsored` pour les liens monétisés depuis
 *    septembre 2019 — ne pas oublier `nofollow` pour les vieux crawlers).
 *  - Sécurité : `noopener noreferrer` empêche le tabnabbing.
 *  - UX : ouvre dans un nouvel onglet par défaut.
 *  - Analytics : déclenche `trackAffiliateClick(platform, placement)` à chaque
 *    clic (y compris molette / Cmd+clic, via l'event `auxclick`).
 *
 * Usage :
 *   <AffiliateLink href={url} platform="coinbase" placement="home-card">
 *     S'inscrire sur Coinbase
 *   </AffiliateLink>
 *
 * Le composant accepte toutes les props d'un `<a>` natif et expose la ref.
 */
export interface AffiliateLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "rel" | "target"> {
  /** URL d'affiliation (avec UTM, ?ref=, etc.). Requis. */
  href: string;
  /** Identifiant kebab-case de la plateforme (ex: "coinbase"). Requis pour le tracking. */
  platform: string;
  /** Zone du site (ex: "home-platforms", "comparison-table", "review-cta"). */
  placement?: string;
  /** Forcer un autre target (par défaut "_blank"). */
  target?: "_blank" | "_self";
  /**
   * Si `true`, on ajoute `ugc` au `rel` (User Generated Content — utile si
   * le lien provient d'un commentaire/forum). Par défaut : false.
   */
  ugc?: boolean;
  children: ReactNode;
}

const AffiliateLink = forwardRef<HTMLAnchorElement, AffiliateLinkProps>(
  function AffiliateLink(
    {
      href,
      platform,
      placement,
      target = "_blank",
      ugc = false,
      onClick,
      onAuxClick,
      children,
      ...rest
    },
    ref
  ) {
    // rel SEO conforme aux guidelines Google :
    //  - sponsored : lien monétisé / affiliation
    //  - nofollow  : doublon historique pour anciens crawlers
    //  - noopener noreferrer : sécurité quand target=_blank
    //  - ugc (optionnel) : contenu utilisateur
    const relParts = ["sponsored", "nofollow"];
    if (target === "_blank") relParts.push("noopener", "noreferrer");
    if (ugc) relParts.push("ugc");
    const rel = relParts.join(" ");

    const fire = () => trackAffiliateClick(platform, placement);

    return (
      <a
        ref={ref}
        href={href}
        target={target}
        rel={rel}
        // data-* pour debug & pour permettre des sélecteurs CSS/QA dédiés.
        data-affiliate-platform={platform}
        data-affiliate-placement={placement}
        onClick={(e) => {
          fire();
          onClick?.(e);
        }}
        // Capte aussi le clic-molette / Cmd+clic (ouverture nouvel onglet).
        onAuxClick={(e) => {
          if (e.button === 1) fire();
          onAuxClick?.(e);
        }}
        {...rest}
      >
        {children}
      </a>
    );
  }
);

export default AffiliateLink;
