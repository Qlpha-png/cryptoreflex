"use client";

import { avecTypoSync } from "@/components/ui/Typo";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { trackAffiliateClick } from "@/lib/analytics";
import { isPaidLink, outboundRel } from "@/lib/partnerships";

/**
 * Mobile sticky CTA — barre fixe bas d'écran, mono-CTA, pages transactionnelles.
 *
 * À la différence de <MobileStickyBar /> (3 actions, contexte home/blog),
 * cette barre cible **un seul produit** (plateforme, crypto, comparatif…)
 * et expose un bouton d'affiliation unique.
 *
 * Visible :
 *  - md:hidden (mobile uniquement)
 *  - après ~350 px de scroll (laisse le hero respirer)
 *  - cachée quand le footer entre dans le viewport
 *
 * Tracking : `trackAffiliateClick(platformId, surface)` au tap.
 *
 * Safe-area iOS : padding-bottom env(safe-area-inset-bottom).
 */
interface Props {
  /** Identifiant de la plateforme/crypto pour le tracking analytics. */
  platformId: string;
  /** Libellé du CTA — court, action verbe (≤ 30 chars). */
  label: string;
  /** URL d'affiliation (ouverte dans nouvelle fenêtre). */
  href: string;
  /** Petit titre au-dessus du CTA, ex : "Coinbase" ou "Acheter Bitcoin". */
  title?: string;
  /** Mention légale courte sous le CTA. Défaut : disclaimer générique. */
  disclaimer?: string;
  /** Surface analytics, ex : "avis-page" / "comparatif-page" / "crypto-page". */
  surface?: string;
}

function MobileStickyCTA({
  platformId,
  label,
  href,
  title,
  disclaimer = "Capital à risque · 18+",
  surface = "mobile-sticky",
}: Props) {
  const [visible, setVisible] = useState(false);
  // Passe finale B4 : texte agrandi (≥ 150 %) = le bandeau couvrait ~90 % de l'écran. Au-delà de 25 % de la hauteur de l'écran :
  // version compacte (une ligne, le bouton seul), puis masqué si elle dépasse encore (le lien existe dans la page).
  const [mode, setMode] = useState<"complet" | "compact" | "masque">("complet");
  const racine = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reset = () => setMode("complet");
    window.addEventListener("resize", reset);
    return () => window.removeEventListener("resize", reset);
  }, []);

  useLayoutEffect(() => {
    if (!visible || !racine.current) return;
    if (racine.current.offsetHeight > window.innerHeight * 0.25) setMode((m) => (m === "complet" ? "compact" : "masque"));
  }, [visible, mode]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const showAfterScroll = y > 350;

      // Cache la barre quand le footer entre dans le viewport (évite overlap).
      const footer = document.querySelector("footer");
      let footerVisible = false;
      if (footer) {
        const rect = footer.getBoundingClientRect();
        footerVisible = rect.top < window.innerHeight - 80;
      }

      setVisible(showAfterScroll && !footerVisible);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    try {
      // Le `label` est exactement le wording affiché à l'utilisateur
      // (ex: "S'inscrire", "Acheter") : utile pour A/B-tester le wording.
      trackAffiliateClick(platformId, surface, label);
    } catch {
      // analytics never blocks UX
    }
  };

  if (!visible || mode === "masque") return null;

  // 06/10/2026 : « sponsored » et mention « Publicité » seulement si le lien est réellement rémunéré
  // (lib/partnerships.ts) ; un lien interne (/comparatif/frais) s'ouvre dans le même onglet.
  const internal = href.startsWith("/");
  const paid = isPaidLink(platformId, href);
  const shownDisclaimer = paid ? `Publicité · ${disclaimer}` : disclaimer;

  return (
    // Positionné EN DESSUS de la barre du bas (components/cplus/BarreBas.tsx, --mobile-bar-h)
    // + z-30 (sous la barre, z-57 : la navigation reste prioritaire).
    // a11y : div décoratif → pas d'aria-label invalide (le <a> interne
    // porte déjà son nom accessible).
    <div
      ref={racine}
      role="region"
      aria-label="Achat rapide"
      className="md:hidden fixed inset-x-0 z-30 border-t border-border/80
                 bg-background/95 backdrop-blur-xl animate-slide-up"
      // Lot B3c : au-dessus de la barre du bas ET de sa zone sûre iOS (la barre fait 64 px + la zone sûre).
      style={{
        bottom: "calc(var(--mobile-bar-h, 64px) + var(--safe-bottom, 0px))",
      }}
    >
      <div className={`flex items-center gap-3 px-4 ${mode === "compact" ? "py-2" : "py-3"}`}>
        <div className={mode === "compact" ? "sr-only" : "min-w-0 flex-1"}>
          {title && (
            <p className="text-sm font-semibold leading-tight text-fg">{title}</p>
          )}
          {/* Mention de risque : jamais tronquée (jury B1 : « Capital à risque ·… » à 14 px), elle passe à la ligne. */}
          <p className="text-sm leading-tight text-muted">
            {shownDisclaimer}
          </p>
        </div>
        <a
          href={href}
          target={internal ? undefined : "_blank"}
          rel={internal ? undefined : outboundRel(platformId, href)}
          onClick={handleClick}
          className={`inline-flex items-center justify-center gap-1.5 ${mode === "compact" ? "w-full" : "shrink-0"}
                     min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold
                     bg-primary text-background hover:bg-primary-glow
                     transition-colors focus:outline-none focus-visible:ring-2
                     focus-visible:ring-primary focus-visible:ring-offset-2
                     focus-visible:ring-offset-background`}
        >
          {label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

export default avecTypoSync(MobileStickyCTA);
