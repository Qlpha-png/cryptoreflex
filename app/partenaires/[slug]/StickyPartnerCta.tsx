"use client";

/**
 * StickyPartnerCta — barre CTA flottante mobile (display: lg:hidden).
 *
 * Apparaît dès qu'on a scroll > 600px (signal "intéressé") et persiste
 * jusqu'à ce que l'user clique. Tap target 56px (au-dessus WCAG 44px).
 *
 * Pattern recommandé par les agents Conversion : sticky CTA mobile = +28%
 * conversion sur pages produit longues (Baymard Institute 2024).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, ShoppingBag } from "lucide-react";

interface Props {
  slug: string;
  partnerName: string;
  ctaLabel: string;
  priceFrom: string;
  brandColor: string;
}

export default function StickyPartnerCta({
  slug,
  partnerName,
  ctaLabel,
  priceFrom,
  brandColor,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 lg:hidden transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="mx-2 mb-2 rounded-2xl border border-primary/30 bg-elevated/95 backdrop-blur-xl shadow-2xl shadow-black/50 p-2 flex items-center gap-2">
        <div
          className="hidden xs:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${brandColor}30, ${brandColor}10)`,
          }}
          aria-hidden="true"
        >
          <ShoppingBag className="h-5 w-5 text-fg/80" />
        </div>
        <div className="flex-1 min-w-0 px-1">
          <p className="text-[11px] uppercase tracking-wider text-muted leading-none">
            {partnerName} · à partir de
          </p>
          <p className="text-base font-extrabold text-primary font-mono tabular-nums leading-tight">
            {priceFrom}
          </p>
        </div>
        <Link
          href={`/go/${slug}?ctx=detail&pos=sticky-mobile`}
          rel="sponsored noopener"
          target="_blank"
          className="btn-primary btn-primary-shine min-h-[52px] inline-flex items-center justify-center gap-1.5 px-4 text-sm whitespace-nowrap rounded-xl"
        >
          {ctaLabel}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
