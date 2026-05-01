"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface StickyBreadcrumbProps {
  /** Nom de la crypto (ex: "Bitcoin"). */
  cryptoName: string;
  /** Symbol uppercase (ex: "BTC"). Affiché sticky en mono. */
  cryptoSymbol: string;
  /** URL du logo (PNG / SVG). Optionnel — fallback : pastille initiale. */
  logoUrl?: string | null;
  /** Slug pour le lien du nom (ex: "bitcoin"). Default : pas de lien. */
  slug?: string;
  /** Seuil de scroll (px) au-delà duquel on devient sticky. Default 200. */
  stickyThreshold?: number;
}

/**
 * StickyBreadcrumb — Breadcrumb classique au-dessus du fold qui devient
 * sticky avec glassmorphism + nom de la crypto fade-in après 200px de scroll.
 *
 * Architecture :
 *  - Toujours rendu au flux normal (fixed top-0 quand sticky).
 *  - Hauteur ~48px, glassmorphism (bg-background/70 + backdrop-blur).
 *  - Contient le breadcrumb + (sticky only) un petit logo + nom crypto.
 *  - Scroll threshold (200px) : on bascule la classe `sticky-on` qui pilote
 *    transform / opacity du nom crypto via CSS pure (zéro re-render).
 *  - prefers-reduced-motion : pas de transition.
 *  - z-30 pour passer SOUS la ReadingProgressBar (z-50) mais au-dessus
 *    de tout le contenu.
 */
export default function StickyBreadcrumb({
  cryptoName,
  cryptoSymbol,
  logoUrl,
  slug,
  stickyThreshold = 200,
}: StickyBreadcrumbProps) {
  const [sticky, setSticky] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        setSticky(window.scrollY > stickyThreshold);
        rafRef.current = null;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [stickyThreshold]);

  // Quand sticky : on rend en fixed top-0. Sinon, dans le flux normal en
  // tant que breadcrumb classique. On garde un placeholder pour éviter
  // le content-jump lors de la bascule.
  return (
    <>
      {/* Placeholder — réservation hauteur quand sticky pour éviter le jump.
          On le maintient toujours visible pour stabilité du layout. */}
      <div className={sticky ? "h-12" : "h-0"} aria-hidden="true" />

      <div
        className={[
          "z-30 transition-all duration-300 ease-out",
          sticky
            ? "fixed inset-x-0 top-0 border-b border-border bg-background/70 backdrop-blur-md shadow-e2"
            : "relative bg-transparent",
        ].join(" ")}
      >
        <div
          className={[
            "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8",
            sticky ? "h-12 flex items-center" : "py-0",
          ].join(" ")}
        >
          <nav className="text-xs text-muted flex items-center gap-2 min-w-0 w-full">
            <Link href="/" className="hover:text-fg shrink-0">
              Accueil
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/cryptos" className="hover:text-fg shrink-0">
              Cryptos
            </Link>
            <span aria-hidden="true">/</span>

            {/* Nom de la crypto :
                - Hors sticky : simple texte
                - Sticky : logo + nom + symbol mis en avant, fade-in */}
            <span
              className={[
                "flex items-center gap-2 min-w-0 truncate",
                sticky ? "text-fg font-semibold" : "text-fg/80",
              ].join(" ")}
            >
              {sticky && logoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logoUrl}
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-full ring-1 ring-border shrink-0 motion-safe:animate-[fade-in-up_300ms_ease-out]"
                  loading="lazy"
                />
              )}
              {slug ? (
                <Link
                  href={`/cryptos/${slug}`}
                  className="truncate hover:text-primary"
                >
                  {cryptoName}
                </Link>
              ) : (
                <span className="truncate">{cryptoName}</span>
              )}
              {sticky && (
                <span className="font-mono text-[11px] text-muted shrink-0 motion-safe:animate-[fade-in-up_300ms_ease-out]">
                  {cryptoSymbol}
                </span>
              )}
            </span>
          </nav>
        </div>
      </div>
    </>
  );
}
