"use client";

import Link from "next/link";
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
 *  - Analytics : déclenche `trackAffiliateClick(platform, placement, ctaText)`
 *    à chaque clic (y compris molette / Cmd+clic, via l'event `auxclick`).
 *    Le `ctaText` est dérivé automatiquement du contenu textuel des children
 *    (utile pour mesurer quel wording de bouton convertit le mieux), avec un
 *    override possible via la prop `ctaText`.
 *  - Conformité loi Influenceurs (n°2023-451 du 9 juin 2023) + DGCCRF :
 *    rend visible la mention « Publicité — Cryptoreflex perçoit une commission »
 *    sous chaque CTA, cliquable vers /transparence. La formulation reprend
 *    explicitement le terme « Publicité » exigé par la loi pour qualifier
 *    une communication commerciale, ainsi que l'information de rémunération
 *    (Art. L121-1 du Code de la consommation modifié).
 *    Désactivable via `showCaption={false}` quand un disclaimer global est
 *    déjà présent à proximité (ex : sidebar /avis, table de comparatif).
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
  /**
   * Wording exact du CTA pour le tracking. Si absent, dérivé du contenu
   * textuel des children. Utile pour A/B-tester le label des boutons.
   */
  ctaText?: string;
  /** Forcer un autre target (par défaut "_blank"). */
  target?: "_blank" | "_self";
  /**
   * Si `true`, on ajoute `ugc` au `rel` (User Generated Content — utile si
   * le lien provient d'un commentaire/forum). Par défaut : false.
   */
  ugc?: boolean;
  /**
   * Affiche la mention légale « Publicité — commission » sous le CTA (loi
   * Influenceurs juin 2023). Par défaut `true`. Mettre `false` quand un
   * disclaimer plus complet est déjà rendu à proximité (ex : sidebar /avis).
   */
  showCaption?: boolean;
  children: ReactNode;
}

/**
 * Best-effort : extrait le texte d'un ReactNode pour en faire un ctaText.
 * - Pour `<>S'inscrire <span>sur X</span><Icon/></>`, retourne "S'inscrire sur X".
 * - Stoppé à 80 chars pour éviter de pousser un wording absurdement long.
 */
function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (
    typeof node === "object" &&
    node !== null &&
    "props" in node &&
    typeof (node as { props?: { children?: ReactNode } }).props?.children !== "undefined"
  ) {
    return extractText((node as { props: { children: ReactNode } }).props.children);
  }
  return "";
}

const AffiliateLink = forwardRef<HTMLAnchorElement, AffiliateLinkProps>(
  function AffiliateLink(
    {
      href,
      platform,
      placement,
      ctaText,
      target = "_blank",
      ugc = false,
      showCaption = true,
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

    // Texte effectif du CTA : prop explicite > extraction children > undefined.
    const effectiveCta =
      ctaText ??
      (extractText(children).replace(/\s+/g, " ").trim().slice(0, 80) ||
        undefined);

    const fire = () => trackAffiliateClick(platform, placement, effectiveCta);

    return (
      <>
        <a
          ref={ref}
          href={href}
          target={target}
          rel={rel}
          aria-label="Lien d'affiliation publicitaire"
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
        {showCaption && (
          <Link
            href="/transparence"
            className="mt-1 block text-[10px] text-muted/70 hover:text-muted underline underline-offset-2"
            aria-label="En savoir plus sur nos liens d'affiliation et nos partenariats"
          >
            Publicité — Cryptoreflex perçoit une commission
          </Link>
        )}
      </>
    );
  }
);

export default AffiliateLink;
