"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { trackAffiliateClick } from "@/lib/analytics";

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

export default function MobileStickyCTA({
  platformId,
  label,
  href,
  title,
  disclaimer = "Capital à risque · 18+",
  surface = "mobile-sticky",
}: Props) {
  const [visible, setVisible] = useState(false);

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

  if (!visible) return null;

  return (
    <div
      aria-label="Action d'achat rapide"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/80
                 bg-background/95 backdrop-blur-xl animate-slide-up"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          {title && (
            <p className="text-xs font-semibold text-fg/90 truncate">{title}</p>
          )}
          <p className="text-[10px] text-muted leading-tight truncate">
            {disclaimer}
          </p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="sponsored noopener noreferrer"
          onClick={handleClick}
          className="inline-flex shrink-0 items-center justify-center gap-1.5
                     min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold
                     bg-primary text-background hover:bg-primary-glow
                     transition-colors focus:outline-none focus-visible:ring-2
                     focus-visible:ring-primary focus-visible:ring-offset-2
                     focus-visible:ring-offset-background"
        >
          {label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
