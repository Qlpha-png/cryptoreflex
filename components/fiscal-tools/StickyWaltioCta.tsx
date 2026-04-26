"use client";

/**
 * <StickyWaltioCta /> — bandeau bas d'écran qui apparaît au-delà de 50 % de scroll
 * sur la page /outils/calculateur-fiscalite. Persuasif, dismissible, mémorisé en
 * sessionStorage pour ne pas le rejouer dans la même session.
 *
 * Pourquoi : le CTA Waltio "post-result" ne se voit qu'après calcul.
 * Le visiteur qui scrolle pour lire les sections SEO (PFU vs barème, déclaration
 * pas-à-pas) sans utiliser le calc n'a aucun rappel d'affiliation.
 *
 * Tracking Plausible :
 *  - "waltio-sticky-shown"  → 1× / session quand affiché
 *  - "waltio-sticky-click"  → trackAffiliateClick("waltio", "sticky", "...")
 *  - "waltio-sticky-dismiss" → si l'utilisateur ferme
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, X, Sparkles } from "lucide-react";
import { track, trackAffiliateClick } from "@/lib/analytics";

const STORAGE_KEY = "waltio-sticky-dismissed";
const SCROLL_THRESHOLD = 0.45; // affiche au-delà de 45 % de scroll
const WALTIO_AFFILIATE_URL =
  "https://waltio.com?ref=cryptoreflex&utm_source=cryptoreflex&utm_medium=affiliate&utm_campaign=calculator-sticky";

export default function StickyWaltioCta() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const shownRef = useRef(false);

  // Init : vérifier sessionStorage (dismiss persistant pendant la session)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem(STORAGE_KEY) === "1") {
        setDismissed(true);
      }
    } catch {
      /* SSR/private mode safe */
    }
  }, []);

  // Listener scroll
  useEffect(() => {
    if (dismissed) return;
    if (typeof window === "undefined") return;

    function onScroll() {
      const doc = document.documentElement;
      const scrolled = window.scrollY;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const ratio = scrolled / max;
      if (ratio >= SCROLL_THRESHOLD && !visible) {
        setVisible(true);
        if (!shownRef.current) {
          shownRef.current = true;
          track("waltio-sticky-shown", { placement: "calculator-sticky" });
        }
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [dismissed, visible]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setVisible(false);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    track("waltio-sticky-dismiss", { placement: "calculator-sticky" });
  }, []);

  const handleClick = useCallback(() => {
    trackAffiliateClick("waltio", "sticky", "Économise 40h sur ta déclaration");
  }, []);

  if (dismissed || !visible) return null;

  return (
    <div
      role="complementary"
      aria-label="Promotion Waltio — économise du temps sur ta déclaration crypto"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-6 sm:pb-5 pointer-events-none"
    >
      <div className="mx-auto max-w-5xl pointer-events-auto">
        <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-elevated/95 backdrop-blur shadow-xl p-3 sm:p-4">
          <div
            className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-soft"
            aria-hidden="true"
          >
            <Sparkles className="h-5 w-5 text-background" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              Économise 40h sur ta déclaration crypto
            </p>
            <p className="hidden sm:block text-xs text-white/70 truncate">
              Waltio (FR) génère ton Cerfa 2086 + 3916-bis automatiquement —
              <span className="text-primary-soft font-semibold">
                {" "}
                -30 % via Cryptoreflex
              </span>
            </p>
          </div>
          <a
            href={WALTIO_AFFILIATE_URL}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            onClick={handleClick}
            data-affiliate-platform="waltio"
            data-affiliate-placement="sticky"
            aria-label="Lien d'affiliation publicitaire vers Waltio"
            className="btn-primary text-sm whitespace-nowrap shrink-0"
          >
            Essayer Waltio
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fermer le bandeau Waltio"
            className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
