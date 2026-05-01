"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { ArrowRight, X, Scale } from "lucide-react";
import { useCompareList } from "@/lib/use-compare-list";
import { getAllCryptos } from "@/lib/cryptos";
import { resolveCryptoLogo } from "@/lib/crypto-logos";

/**
 * CompareDrawer — barre flottante "comparateur" visible dès que ≥ 1 crypto
 * a été ajoutée au comparateur, sur toutes les pages du site.
 *
 * Position :
 *  - Mobile  : bottom-right, au-dessus du MobileBottomNav (z-index élevé).
 *  - Desktop : bottom-center, ancré façon "bottom toast" Stripe / Linear.
 *
 * Animation : slide-up + fade-in à l'entrée (CSS keyframe locale, désactivée
 * via `prefers-reduced-motion`).
 *
 * UX :
 *  - Avatars/symbols cliquables = retire la crypto correspondante (X au hover).
 *  - Bouton "Comparer (X)" → /cryptos/comparer?ids=slug1,slug2,...
 *    Désactivé visuellement tant que list.length < 2 (mais reste cliquable
 *    pour donner du feedback : redirige vers /cryptos pour en ajouter une 2e).
 *  - Bouton "Vider" discret en haut à droite.
 */
export default function CompareDrawer() {
  const { list, remove, clear, hydrated, max } = useCompareList();

  // Lookup synchrone (toutes les fiches sont en mémoire — 100 entrées).
  const all = useMemo(() => getAllCryptos(), []);
  const items = useMemo(
    () =>
      list
        .map((slug) => all.find((c) => c.id === slug))
        .filter((c): c is NonNullable<typeof c> => Boolean(c)),
    [list, all]
  );

  // Tant qu'on n'est pas hydraté ou que la liste est vide → on ne rend rien.
  // Cache l'UI au SSR (évite mismatch hydration), ne pollue pas le DOM.
  if (!hydrated || items.length === 0) {
    return null;
  }

  const canCompare = items.length >= 2;
  const ids = items.map((c) => c.id).join(",");
  const href = canCompare ? `/cryptos/comparer?ids=${ids}` : "/cryptos";

  return (
    <>
      <style jsx>{`
        @keyframes compareSlideUp {
          from {
            transform: translateY(120%) translateX(var(--cx, 0));
            opacity: 0;
          }
          to {
            transform: translateY(0) translateX(var(--cx, 0));
            opacity: 1;
          }
        }
        .compare-drawer {
          animation: compareSlideUp 220ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .compare-drawer {
            animation: none;
          }
        }
      `}</style>

      <div
        role="region"
        aria-label="Comparateur de cryptos"
        className="compare-drawer fixed z-[95] left-3 right-3 bottom-[calc(var(--mobile-bar-h,64px)+12px)] sm:left-1/2 sm:right-auto sm:bottom-6 sm:-translate-x-1/2 sm:max-w-2xl"
        style={{ ["--cx" as string]: "0" }}
      >
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-elevated/95 p-3 sm:p-4 shadow-2xl shadow-black/40 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          {/* Header / clear */}
          <div className="flex items-center justify-between sm:justify-start sm:gap-3">
            <div className="flex items-center gap-2 text-fg">
              <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Comparateur{" "}
                <span className="font-mono text-primary-soft">
                  {items.length}/{max}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={clear}
              className="text-[11px] font-medium text-muted hover:text-fg transition-colors sm:ml-2"
              aria-label="Vider le comparateur"
            >
              Vider
            </button>
          </div>

          {/* Avatars */}
          <div className="flex items-center gap-2 overflow-x-auto sm:flex-1 sm:justify-center">
            {items.map((c) => {
              const logo = resolveCryptoLogo({
                coingeckoId: c.coingeckoId,
                symbol: c.symbol,
              });
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => remove(c.id)}
                  title={`Retirer ${c.name} du comparateur`}
                  aria-label={`Retirer ${c.name} du comparateur`}
                  className="group relative shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-1 text-xs font-semibold text-fg hover:border-accent-rose/50 hover:bg-accent-rose/5 transition-all hover:scale-[1.04]"
                >
                  {logo ? (
                    <Image
                      src={logo}
                      alt=""
                      width={18}
                      height={18}
                      className="h-[18px] w-[18px] rounded-full"
                      unoptimized
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary-soft"
                    >
                      {c.symbol.slice(0, 2)}
                    </span>
                  )}
                  <span className="font-mono">{c.symbol}</span>
                  <X
                    className="h-3 w-3 text-muted opacity-60 group-hover:opacity-100 group-hover:text-accent-rose transition-opacity"
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <Link
            href={href}
            className={`shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              canCompare
                ? "bg-primary text-white hover:bg-primary/90 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                : "bg-surface text-muted border border-border cursor-help"
            }`}
            aria-disabled={!canCompare}
            title={
              canCompare
                ? "Ouvrir le comparatif"
                : "Ajoute au moins 2 cryptos pour comparer"
            }
          >
            {canCompare ? `Comparer (${items.length})` : "+1 pour comparer"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </>
  );
}
