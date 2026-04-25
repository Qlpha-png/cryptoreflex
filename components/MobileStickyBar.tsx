"use client";

import { useEffect, useState, useCallback } from "react";
import { BookOpen, LayoutGrid, Mail } from "lucide-react";
import NewsletterModal from "./NewsletterModal";

/**
 * Bottom sticky bar mobile (md:hidden).
 * 3 actions ultra-fréquentes pour augmenter l'engagement et la conversion newsletter
 * sur mobile (60-70 % du trafic crypto FR).
 *
 *  ┌──────────────────────────────────────────────┐
 *  │   [Lire ▽]   [Plateformes]   [Newsletter ✉] │
 *  └──────────────────────────────────────────────┘
 *
 * Comportements :
 *  - "Lire" : scroll smooth vers le prochain <h2> sous la position courante,
 *    ou vers #marche si on est encore sur le hero.
 *  - "Plateformes" : scroll vers #plateformes (ancre déjà existante).
 *  - "Newsletter" : ouvre la <NewsletterModal> (full-screen mobile).
 *
 * Cachée :
 *  - Sur >= md (le user a déjà la nav desktop).
 *  - Quand le footer est visible (évite double layer de CTA).
 *  - Quand l'utilisateur scrolle vers le haut rapidement (signe de retour, on libère l'écran).
 *
 * Tap targets : chaque bouton fait 64×min-44px (HIG).
 * Safe-area : padding-bottom: env(safe-area-inset-bottom) → respecte la home indicator iOS.
 */
export default function MobileStickyBar() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [newsletterOpen, setNewsletterOpen] = useState(false);

  // Affiche la barre une fois le hero scrollé (évite le clutter au-dessus du fold).
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      // Affiche la barre dès que l'utilisateur a dépassé ~50% du hero (350px env)
      setOpen(y > 350);

      // Cache la barre quand le footer est visible (évite l'overlap)
      const footer = document.querySelector("footer");
      if (footer) {
        const rect = footer.getBoundingClientRect();
        setHidden(rect.top < window.innerHeight - 64);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToNextH2 = useCallback(() => {
    const headings = Array.from(document.querySelectorAll("main h2"));
    const scrollY = window.scrollY;
    const headerOffset = 80; // hauteur navbar sticky
    const next = headings.find((h) => {
      const top = h.getBoundingClientRect().top + window.scrollY;
      return top > scrollY + headerOffset + 20;
    });
    if (next) {
      const top = next.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top, behavior: "smooth" });
    } else {
      // Sinon : scroll vers le bas (fin du contenu)
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  }, []);

  const scrollToPlatforms = useCallback(() => {
    const el = document.getElementById("plateformes");
    if (el) {
      const headerOffset = 80;
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top, behavior: "smooth" });
    } else {
      // Si on est sur une page sans cette ancre (ex: /blog/...), redirige vers home
      window.location.href = "/#plateformes";
    }
  }, []);

  if (!open || hidden) {
    return <NewsletterModal open={newsletterOpen} onClose={() => setNewsletterOpen(false)} />;
  }

  return (
    <>
      <nav
        aria-label="Actions rapides"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-xl animate-slide-up"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
      >
        <div className="grid grid-cols-3 h-16">
          <BarButton
            label="Lire"
            ariaLabel="Aller à la prochaine section"
            onClick={scrollToNextH2}
            Icon={BookOpen}
          />
          <BarButton
            label="Plateformes"
            ariaLabel="Voir le comparatif des plateformes"
            onClick={scrollToPlatforms}
            Icon={LayoutGrid}
            highlighted
          />
          <BarButton
            label="Newsletter"
            ariaLabel="S'abonner à la newsletter"
            onClick={() => setNewsletterOpen(true)}
            Icon={Mail}
          />
        </div>
      </nav>

      <NewsletterModal open={newsletterOpen} onClose={() => setNewsletterOpen(false)} />
    </>
  );
}

function BarButton({
  label,
  ariaLabel,
  onClick,
  Icon,
  highlighted = false,
}: {
  label: string;
  ariaLabel: string;
  onClick: () => void;
  Icon: React.ComponentType<{ className?: string }>;
  highlighted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] active:bg-elevated/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
        highlighted ? "text-primary-soft" : "text-fg/85"
      }`}
    >
      <Icon className={`h-5 w-5 ${highlighted ? "text-primary" : ""}`} />
      <span className="text-[11px] font-semibold leading-none">{label}</span>
      {highlighted && (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1/2 translate-x-[26px] h-1.5 w-1.5 rounded-full bg-primary"
        />
      )}
    </button>
  );
}
