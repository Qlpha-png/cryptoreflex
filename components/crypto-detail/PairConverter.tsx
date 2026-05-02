"use client";

import { useState, useMemo, useCallback } from "react";
import { ArrowRightLeft, Calculator } from "lucide-react";

interface Props {
  /** Symbole de la crypto (ex: BTC). */
  symbol: string;
  /** Nom complet (ex: Bitcoin) — utilisé en label. */
  name: string;
  /**
   * Prix de référence en USD (depuis CoinGecko, server-side).
   * On l'utilise comme prix initial. Pour la conversion EUR on applique le taux
   * USD→EUR fourni en prop (ou 0.92 par défaut, fallback raisonnable 2026).
   */
  priceUsd: number;
  /**
   * Taux de change USD→EUR optionnel. Si absent on prend 0.92 (≈ avril 2026).
   * Le composant accepte un override depuis la fiche pour précision.
   */
  usdToEur?: number;
}

type Direction = "crypto-to-fiat" | "fiat-to-crypto";
type Fiat = "EUR" | "USD";

/**
 * PairConverter — innovation BATCH 28 (quick win expert agents #2).
 *
 * Convertisseur live entre la crypto courante et EUR/USD. Cas d'usage retail
 * français hyper concret : « combien ça vaut 0,05 BTC en € ? » sans devoir
 * sortir une calculatrice ou un site tiers.
 *
 * - 100% client-side (pas de fetch supplémentaire) : utilise le prix CoinGecko
 *   déjà rendu dans la page (passé en prop).
 * - Bidirectionnel : tape dans un champ, l'autre se met à jour.
 * - Toggle EUR ⇄ USD pour comparer.
 * - Format FR : « 1 234,56 € » (Intl.NumberFormat fr-FR).
 * - Accessibilité : labels associés, role="region", aria-live sur résultats
 *   secondaires (annonce vocale lors du basculement direction).
 *
 * Pas de useEffect / pas de polling : composant statique en termes de cycle
 * de vie (tout dépend de l'input user). Optimisé pour 0 re-render parasite.
 */
export default function PairConverter({
  symbol,
  name,
  priceUsd,
  usdToEur = 0.92,
}: Props) {
  const [direction, setDirection] = useState<Direction>("fiat-to-crypto");
  const [fiat, setFiat] = useState<Fiat>("EUR");
  const [cryptoAmount, setCryptoAmount] = useState<string>("1");
  const [fiatAmount, setFiatAmount] = useState<string>(() => {
    // Init : 100 € converti en crypto (cas le plus représentatif retail)
    const ratePerEur = priceUsd * usdToEur;
    if (!Number.isFinite(ratePerEur) || ratePerEur <= 0) return "";
    return "100";
  });

  const fiatRate = useMemo(
    () => (fiat === "EUR" ? priceUsd * usdToEur : priceUsd),
    [fiat, priceUsd, usdToEur],
  );

  const computedCrypto = useMemo(() => {
    const f = parseLocaleNumber(fiatAmount);
    if (!Number.isFinite(f) || fiatRate <= 0) return "";
    return formatCryptoAmount(f / fiatRate);
  }, [fiatAmount, fiatRate]);

  const computedFiat = useMemo(() => {
    const c = parseLocaleNumber(cryptoAmount);
    if (!Number.isFinite(c)) return "";
    return formatFiatAmount(c * fiatRate, fiat);
  }, [cryptoAmount, fiatRate, fiat]);

  const handleCryptoChange = useCallback(
    (v: string) => {
      setCryptoAmount(v);
      setDirection("crypto-to-fiat");
      const c = parseLocaleNumber(v);
      if (Number.isFinite(c)) {
        setFiatAmount(formatPlainNumber(c * fiatRate));
      } else {
        setFiatAmount("");
      }
    },
    [fiatRate],
  );

  const handleFiatChange = useCallback(
    (v: string) => {
      setFiatAmount(v);
      setDirection("fiat-to-crypto");
      const f = parseLocaleNumber(v);
      if (Number.isFinite(f) && fiatRate > 0) {
        setCryptoAmount(formatPlainCrypto(f / fiatRate));
      } else {
        setCryptoAmount("");
      }
    },
    [fiatRate],
  );

  const toggleFiat = useCallback(() => {
    const nextFiat: Fiat = fiat === "EUR" ? "USD" : "EUR";
    const nextRate = nextFiat === "EUR" ? priceUsd * usdToEur : priceUsd;
    // Conserver la logique courante : on garde le montant côté direction "active"
    if (direction === "crypto-to-fiat") {
      const c = parseLocaleNumber(cryptoAmount);
      if (Number.isFinite(c)) setFiatAmount(formatPlainNumber(c * nextRate));
    } else {
      const f = parseLocaleNumber(fiatAmount);
      if (Number.isFinite(f) && nextRate > 0) {
        setCryptoAmount(formatPlainCrypto(f / nextRate));
      }
    }
    setFiat(nextFiat);
  }, [fiat, priceUsd, usdToEur, direction, cryptoAmount, fiatAmount]);

  const flipDirection = useCallback(() => {
    setDirection((d) => (d === "fiat-to-crypto" ? "crypto-to-fiat" : "fiat-to-crypto"));
  }, []);

  return (
    <section
      role="region"
      aria-labelledby="pair-converter-title"
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3
          id="pair-converter-title"
          className="inline-flex items-center gap-2 text-base sm:text-lg font-bold text-fg"
        >
          <span
            aria-hidden="true"
            className="grid place-items-center h-7 w-7 rounded-md bg-primary/15 text-primary"
          >
            <Calculator className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          Convertisseur {symbol} ⇄ {fiat}
        </h3>
        <button
          type="button"
          onClick={toggleFiat}
          className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary hover:text-primary-glow rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 transition-colors"
          aria-label={`Basculer la devise vers ${fiat === "EUR" ? "USD" : "EUR"}`}
        >
          Voir en {fiat === "EUR" ? "USD" : "EUR"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
        {/* Crypto input */}
        <div>
          <label
            htmlFor="pair-converter-crypto"
            className="block text-[11px] uppercase tracking-wider text-muted mb-1"
          >
            {name} ({symbol})
          </label>
          <div className="relative">
            <input
              id="pair-converter-crypto"
              type="text"
              inputMode="decimal"
              value={cryptoAmount}
              onChange={(e) => handleCryptoChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-elevated px-3 py-2.5 pr-14 font-mono text-base font-bold text-fg tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="0,00"
              autoComplete="off"
              aria-describedby="pair-converter-rate"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted"
            >
              {symbol}
            </span>
          </div>
        </div>

        {/* Flip direction */}
        <button
          type="button"
          onClick={flipDirection}
          className="self-end mb-1.5 grid place-items-center h-10 w-10 rounded-full border border-border bg-elevated text-muted hover:text-primary hover:border-primary/50 transition-colors"
          aria-label="Inverser le sens de conversion"
          title="Inverser"
        >
          <ArrowRightLeft className="h-4 w-4" strokeWidth={2} />
        </button>

        {/* Fiat input */}
        <div>
          <label
            htmlFor="pair-converter-fiat"
            className="block text-[11px] uppercase tracking-wider text-muted mb-1"
          >
            Montant en {fiat}
          </label>
          <div className="relative">
            <input
              id="pair-converter-fiat"
              type="text"
              inputMode="decimal"
              value={fiatAmount}
              onChange={(e) => handleFiatChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-elevated px-3 py-2.5 pr-12 font-mono text-base font-bold text-fg tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="0,00"
              autoComplete="off"
              aria-describedby="pair-converter-rate"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted"
            >
              {fiat === "EUR" ? "€" : "$"}
            </span>
          </div>
        </div>
      </div>

      {/* Live rate hint + secondary preview (annonce vocale via aria-live) */}
      <div
        id="pair-converter-rate"
        aria-live="polite"
        aria-atomic="true"
        className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted"
      >
        <span>
          1 {symbol} ={" "}
          <span className="font-mono font-bold text-fg/80 tabular-nums">
            {formatFiatAmount(fiatRate, fiat)}
          </span>
          {" — "}
          <span className="text-muted/80">prix indicatif (CoinGecko)</span>
        </span>
        <span className="font-mono">
          {direction === "fiat-to-crypto" ? (
            <>
              ≈{" "}
              <span className="text-primary font-bold tabular-nums">
                {computedCrypto || "—"} {symbol}
              </span>
            </>
          ) : (
            <>
              ≈{" "}
              <span className="text-primary font-bold tabular-nums">
                {computedFiat || "—"}
              </span>
            </>
          )}
        </span>
      </div>

      {/* Quick presets retail FR : 50€ / 100€ / 500€ / 1000€ — un clic = simulation */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="text-[11px] text-muted self-center mr-1">Test rapide&nbsp;:</span>
        {[50, 100, 500, 1000].map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => handleFiatChange(String(amount))}
            className="rounded-md border border-border bg-elevated px-2 py-0.5 text-[11px] font-mono text-fg/80 hover:border-primary/50 hover:text-primary transition-colors"
            aria-label={`Convertir ${amount} ${fiat === "EUR" ? "euros" : "dollars"}`}
          >
            {amount} {fiat === "EUR" ? "€" : "$"}
          </button>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Parse "1 234,56" / "1234.56" / "1,234.56" en number. NaN sinon. */
function parseLocaleNumber(s: string): number {
  if (!s) return NaN;
  // Retire espaces (séparateurs FR) puis remplace virgule par point
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  // Tolère un seul point décimal max
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/** Format "1 234,56 €" pour la zone de hint. */
function formatFiatAmount(n: number, fiat: Fiat): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: fiat,
    maximumFractionDigits: n >= 100 ? 2 : 4,
  }).format(n);
}

/**
 * Format crypto avec précision adaptative : BTC à 0,00012345 → 8 décimales,
 * SOL à 1,234567 → 6, ETH à 1234,56 → 4.
 */
function formatCryptoAmount(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const decimals = n >= 1000 ? 2 : n >= 1 ? 4 : n >= 0.01 ? 6 : 8;
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(n);
}

/** Format pour réinjection dans <input> : pas de symbole, FR. */
function formatPlainNumber(n: number): string {
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(n);
}

function formatPlainCrypto(n: number): string {
  if (!Number.isFinite(n)) return "";
  const decimals = n >= 1000 ? 2 : n >= 1 ? 4 : n >= 0.01 ? 6 : 8;
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
    useGrouping: false,
  }).format(n);
}
