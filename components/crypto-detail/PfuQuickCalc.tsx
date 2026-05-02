"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, ArrowRight, Info } from "lucide-react";

interface Props {
  symbol: string;
  cryptoName: string;
  /** Prix de la crypto en USD (depuis CoinGecko, server-side). */
  priceUsd: number;
}

/**
 * PfuQuickCalc — innovation BATCH 28, différenciation FR maximum.
 *
 * Mini-calculateur PFU 30% (Prélèvement Forfaitaire Unique, art. 150 VH bis CGI)
 * pour simuler la note fiscale française sur une plus-value crypto au moment
 * de la conversion en euros. Cas d'usage retail FR ultra-fréquent et NICHE
 * (aucun comparateur crypto FR ne propose ça inline sur la fiche).
 *
 * Logique simplifiée :
 *  - User entre prix d'achat moyen (€) + quantité possédée
 *  - On utilise le prix actuel (CoinGecko) pour estimer la valeur courante
 *  - Plus-value brute = (valeur courante − coût d'acquisition)
 *  - Note fiscale = plus-value × 30% (PFU)
 *  - Si plus-value < 0 → moins-value (no tax, on prévient le user)
 *
 * IMPORTANT : c'est un calcul INDICATIF par opération. Le PFU réel est calculé
 * sur la PLUS-VALUE CUMULÉE ANNUELLE et impose la formule prorata du Cerfa
 * 2086 (formule complexe : prix de cession - prix d'acquisition × valeur globale
 * portefeuille / valeur globale après cession). Pour le calcul exact, on
 * redirige vers /outils/calculateur-fiscalite.
 *
 * Disclaimer obligatoire : "indicatif, pas un conseil fiscal".
 *
 * Tax-EUR (2026) : USD→EUR ≈ 0.92, plafond pas important pour ce calc.
 */
export default function PfuQuickCalc({ symbol, cryptoName, priceUsd }: Props) {
  const usdToEur = 0.92; // approximatif 2026
  const priceEur = priceUsd * usdToEur;

  const [purchasePriceEur, setPurchasePriceEur] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");

  const result = useMemo(() => {
    const buy = parseFr(purchasePriceEur);
    const qty = parseFr(quantity);
    if (!Number.isFinite(buy) || !Number.isFinite(qty) || buy <= 0 || qty <= 0) {
      return null;
    }
    const acquisitionCost = buy * qty;
    const currentValue = priceEur * qty;
    const gain = currentValue - acquisitionCost;
    const tax = gain > 0 ? gain * 0.3 : 0;
    const net = gain > 0 ? currentValue - tax : currentValue;
    return {
      acquisitionCost,
      currentValue,
      gain,
      tax,
      net,
      gainPct: (gain / acquisitionCost) * 100,
    };
  }, [purchasePriceEur, quantity, priceEur]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  const fmtPct = (n: number) =>
    `${n >= 0 ? "+" : ""}${new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    }).format(n)}%`;

  return (
    <section
      role="region"
      aria-labelledby="pfu-quick-calc-title"
      className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 sm:p-6"
    >
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3
            id="pfu-quick-calc-title"
            className="inline-flex items-center gap-2 text-base sm:text-lg font-bold text-fg"
          >
            <span
              aria-hidden="true"
              className="grid place-items-center h-7 w-7 rounded-md bg-primary/15 text-primary"
            >
              <Calculator className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
            Combien d&apos;impôt sur ta plus-value {symbol} ?
          </h3>
          <p className="mt-1 text-[12px] text-muted">
            Simulation PFU 30% (article 150 VH bis CGI) — calcul indicatif par opération.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
          🇫🇷 Spécifique FR
        </span>
      </header>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="pfu-buy"
            className="block text-[11px] uppercase tracking-wider text-muted mb-1"
          >
            Prix d&apos;achat moyen (€/{symbol})
          </label>
          <div className="relative">
            <input
              id="pfu-buy"
              type="text"
              inputMode="decimal"
              value={purchasePriceEur}
              onChange={(e) => setPurchasePriceEur(e.target.value)}
              className="w-full rounded-lg border border-border bg-elevated px-3 py-2.5 pr-10 font-mono text-base font-bold text-fg tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="ex: 25 000"
              autoComplete="off"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted"
            >
              €
            </span>
          </div>
        </div>
        <div>
          <label
            htmlFor="pfu-qty"
            className="block text-[11px] uppercase tracking-wider text-muted mb-1"
          >
            Quantité possédée
          </label>
          <div className="relative">
            <input
              id="pfu-qty"
              type="text"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-lg border border-border bg-elevated px-3 py-2.5 pr-14 font-mono text-base font-bold text-fg tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="ex: 0,5"
              autoComplete="off"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted"
            >
              {symbol}
            </span>
          </div>
        </div>
      </div>

      {/* Résultat */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="mt-4 rounded-xl border border-border bg-surface p-4"
      >
        {!result ? (
          <p className="text-[13px] text-muted">
            Saisis ton prix d&apos;achat moyen et la quantité de {symbol} pour voir
            ta plus-value estimée et l&apos;impôt PFU dû à la cession en euros.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <ResultCell
              label="Coût d'acquisition"
              value={fmt(result.acquisitionCost)}
              tone="muted"
            />
            <ResultCell
              label="Valeur actuelle"
              value={fmt(result.currentValue)}
              tone="default"
            />
            <ResultCell
              label="Plus-value"
              value={fmt(result.gain)}
              hint={fmtPct(result.gainPct)}
              tone={result.gain > 0 ? "success" : result.gain < 0 ? "danger" : "muted"}
            />
            {/* BATCH 38 — fix audit YMYL fiscal P0 : "moins-value reportable"
                était FAUX. Les moins-values crypto au régime PFU NE SONT PAS
                reportables sur les années suivantes (art. 150 VH bis CGI),
                ni imputables sur d'autres types de plus-values. Correction
                obligatoire pour crédibilité éditoriale. */}
            <ResultCell
              label={result.gain > 0 ? "Impôt PFU 30 %" : "Aucun impôt"}
              value={fmt(result.tax)}
              hint={result.gain > 0 ? "à la cession en €" : "moins-value (non reportable au PFU)"}
              tone={result.gain > 0 ? "danger" : "success"}
            />
          </div>
        )}
      </div>

      {/* Disclaimer + lien calc complète */}
      <div className="mt-3 flex items-start gap-2">
        <Info className="h-3.5 w-3.5 text-muted shrink-0 mt-0.5" strokeWidth={2} aria-hidden="true" />
        <p className="text-[11px] text-muted leading-relaxed">
          Calcul <strong className="text-fg/80">indicatif par opération</strong>. Le PFU réel
          est dû sur la <strong className="text-fg/80">plus-value cumulée annuelle</strong>{" "}
          (formule prorata Cerfa 2086). Pour le calcul exact (multi-opérations + déclaration),
          utilise notre{" "}
          <Link
            href="/outils/calculateur-fiscalite"
            className="inline-flex items-center gap-1 text-primary hover:text-primary-glow underline underline-offset-2 font-semibold"
          >
            calculateur fiscal complet
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
          . Pas un conseil fiscal.
        </p>
      </div>
    </section>
  );
}

function ResultCell({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "muted" | "default" | "success" | "danger";
}) {
  const valueColor =
    tone === "success"
      ? "text-success-fg"
      : tone === "danger"
        ? "text-danger-fg"
        : tone === "muted"
          ? "text-fg/70"
          : "text-fg";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold tabular-nums ${valueColor}`}>
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-[10px] text-muted/80 font-mono">{hint}</div>
      )}
    </div>
  );
}

function parseFr(s: string): number {
  if (!s) return NaN;
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}
