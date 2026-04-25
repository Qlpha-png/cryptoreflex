"use client";

/**
 * TradingViewWidget — Embed TradingView via leur "lightweight widget".
 *
 * Choix d'implémentation :
 * - <iframe> simple (lazy-loaded), aucun script TradingView injecté → poids
 *   minimal et meilleur perf que les widgets officiels (qui chargent ~200 KB JS).
 * - URL : https://s.tradingview.com/widgetembed/?symbol=BINANCE:{SYMBOL}EUR&interval=D
 *   Si BINANCE n'a pas la paire EUR, le widget retombe naturellement sur USD.
 * - Fallback : detection passive via `onError` impossible sur iframe cross-origin.
 *   On affiche donc en permanence un petit lien externe "Ouvrir sur TradingView"
 *   sous l'iframe — ce lien fait office de fallback gracieux pour les users dont
 *   l'iframe est bloquée par adblock/privacy extension.
 *
 * CSP : `frame-src https://s.tradingview.com https://www.tradingview.com` ajouté
 * dans next.config.js. `frame-ancestors 'none'` reste actif (on ne peut pas être
 * embarqué nous-mêmes — c'est l'autre sens de la directive).
 *
 * A11y : <iframe title> + label visible. Bouton toggle pour cacher le widget si
 * jamais l'utilisateur n'en veut pas (accessible clavier, aria-expanded).
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, BarChart3 } from "lucide-react";

interface Props {
  /** Symbole de la crypto (ex: "BTC", "ETH"). Utilisé pour BINANCE:{symbol}EUR. */
  symbol: string;
  /** Nom complet pour les labels A11y. */
  name: string;
  /** Intervalle TradingView : "1", "5", "15", "60", "240", "D", "W", "M". */
  interval?: string;
  /** Affichage initial déplié ou replié. Défaut : déplié. */
  defaultOpen?: boolean;
}

const TV_BASE = "https://s.tradingview.com/widgetembed";

export default function TradingViewWidget({
  symbol,
  name,
  interval = "D",
  defaultOpen = true,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const tvSymbol = `BINANCE:${symbol.toUpperCase()}EUR`;
  const src = `${TV_BASE}/?frameElementId=tradingview_${symbol.toLowerCase()}&symbol=${encodeURIComponent(
    tvSymbol
  )}&interval=${interval}&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=rgba(0,0,0,0)&studies=[]&theme=dark&style=1&timezone=Europe%2FParis&withdateranges=1&hideideas=1&hidetrading=1&locale=fr`;
  const externalUrl = `https://www.tradingview.com/symbols/${symbol.toUpperCase()}EUR/?exchange=BINANCE`;

  return (
    <section
      className="rounded-2xl border border-border bg-surface overflow-hidden"
      aria-label={`Graphique TradingView ${name}`}
    >
      <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-elevated/40">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-fg">
            Graphique avancé TradingView ·{" "}
            <span className="font-mono">{tvSymbol}</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={`tv-frame-${symbol.toLowerCase()}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                     focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded px-2 py-1"
        >
          {open ? (
            <>
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
              Réduire
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
              Afficher
            </>
          )}
        </button>
      </header>

      {open && (
        <div className="relative">
          {/* Container fixed-height (480px) avec fallback visuel en arrière-plan */}
          <div
            className="relative w-full bg-elevated/30"
            style={{ height: 480 }}
          >
            {/* Fallback graphique (affiché derrière l'iframe ; iframe le masque
                quand elle se charge correctement). Pour les users adblock/privacy,
                seul ce fallback reste visible. */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center pointer-events-none">
              <div
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary-soft border border-primary/20"
                aria-hidden="true"
              >
                <BarChart3 className="h-6 w-6" />
              </div>
              <p className="text-sm text-fg/85 max-w-md">
                Le graphique TradingView ne s'affiche pas ? C'est probablement
                ton bloqueur de pubs ou ton extension de confidentialité qui
                bloque l'iframe. Tu peux désactiver le bloqueur sur cette page,
                ou consulter directement le graphique sur TradingView.
              </p>
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary-soft hover:bg-primary/15 pointer-events-auto"
              >
                Ouvrir sur TradingView
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>

            {/* Iframe TradingView par-dessus le fallback */}
            <iframe
              id={`tv-frame-${symbol.toLowerCase()}`}
              title={`Graphique prix ${name} (${tvSymbol}) sur TradingView`}
              src={src}
              loading="lazy"
              referrerPolicy="origin"
              sandbox="allow-scripts allow-same-origin allow-popups"
              className="absolute inset-0 h-full w-full border-0"
              style={{ background: "transparent" }}
            />
          </div>

          {/* Footer du widget : lien externe systématique */}
          <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-t border-border bg-elevated/40 text-[11px] text-muted">
            <span>
              Graphique fourni par{" "}
              <a
                href="https://www.tradingview.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-fg"
              >
                TradingView
              </a>{" "}
              · Données BINANCE
            </span>
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-fg"
            >
              Ouvrir en grand
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
