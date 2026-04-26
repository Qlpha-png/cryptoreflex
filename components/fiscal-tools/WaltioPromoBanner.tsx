"use client";

/**
 * <WaltioPromoBanner /> — Banner promo top of page (above-the-fold).
 *
 * Affiche : "-30 % sur Waltio jusqu'au 31 mai 2026 — Code CRYPTOREFLEX"
 * Dismissible (persiste en localStorage 7 jours).
 *
 * Tracking :
 *  - "waltio-promo-banner-click"  → trackAffiliateClick("waltio", "promo-banner", "...")
 *  - "waltio-promo-banner-dismiss"
 */

import { useCallback, useEffect, useState } from "react";
import { Tag, X } from "lucide-react";
import { track, trackAffiliateClick } from "@/lib/analytics";

const STORAGE_KEY = "waltio-promo-banner-dismissed-2026-05";
const WALTIO_AFFILIATE_URL =
  "https://waltio.com?ref=cryptoreflex&utm_source=cryptoreflex&utm_medium=affiliate&utm_campaign=calculator-promo-banner&utm_content=fr-2026-05";

export default function WaltioPromoBanner() {
  const [dismissed, setDismissed] = useState(true); // hidden until we check storage

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const flag = window.localStorage.getItem(STORAGE_KEY);
      if (!flag) {
        setDismissed(false);
      } else {
        // Expire après 7 jours
        const ts = parseInt(flag, 10);
        if (Number.isFinite(ts) && Date.now() - ts > 7 * 24 * 3600 * 1000) {
          window.localStorage.removeItem(STORAGE_KEY);
          setDismissed(false);
        }
      }
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleClick = useCallback(() => {
    trackAffiliateClick(
      "waltio",
      "promo-banner",
      "-30 % Waltio jusqu'au 31 mai",
    );
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    track("waltio-promo-banner-dismiss", { placement: "calculator-top" });
  }, []);

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Promotion Waltio limitée"
      className="relative w-full bg-gradient-to-r from-primary/20 via-primary/15 to-primary/5 border-b border-primary/40"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Tag
              className="h-4 w-4 shrink-0 text-primary-soft"
              aria-hidden="true"
            />
            <p className="truncate text-white/90">
              <span aria-hidden="true">💸 </span>
              <strong className="text-white">-30 % sur Waltio</strong>
              <span className="hidden sm:inline">
                {" "}jusqu'au 31 mai 2026 — Code{" "}
              </span>
              <span className="sm:hidden"> — </span>
              <span className="font-mono font-bold text-primary-soft">
                CRYPTOREFLEX
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={WALTIO_AFFILIATE_URL}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              onClick={handleClick}
              data-affiliate-platform="waltio"
              data-affiliate-placement="promo-banner"
              aria-label="Lien d'affiliation publicitaire vers Waltio (promo -30 %)"
              className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-background hover:bg-primary-soft focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              J'en profite
            </a>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Fermer la promotion Waltio"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
