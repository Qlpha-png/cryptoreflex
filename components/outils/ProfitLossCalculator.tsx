"use client";

/**
 * ProfitLossCalculator — Calculateur PnL crypto interactif (BLOC 4, 2026-05-04).
 *
 * Pure client-side, 0 dependance externe. Calcule en temps reel :
 *  - PnL brut (prix_vente - prix_achat) × quantite
 *  - PnL net apres frais (achat + vente)
 *  - PnL net apres impot PFU 30% France (sur cession taxable uniquement)
 *
 * Pattern : controlled inputs + useMemo pour le calc, color-coded
 * (vert si gain, rose si perte). Rendu instantane (pas de submit).
 *
 * NB compliance AMF : "PFU 30%" affiche comme estimation educative
 * uniquement. Pas un conseil fiscal personnalise.
 */

import { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Receipt,
} from "lucide-react";

interface CalcResult {
  amountInvested: number;
  amountReceived: number;
  pnlGross: number;
  feesTotal: number;
  pnlNetFees: number;
  pnlNetTax: number;
  pnlPctNetFees: number;
  pfuApplied: boolean;
}

function compute(
  buyPrice: number,
  sellPrice: number,
  quantity: number,
  buyFeesPct: number,
  sellFeesPct: number,
): CalcResult {
  const amountInvested = buyPrice * quantity;
  const amountReceived = sellPrice * quantity;
  const buyFees = amountInvested * (buyFeesPct / 100);
  const sellFees = amountReceived * (sellFeesPct / 100);
  const feesTotal = buyFees + sellFees;
  const pnlGross = amountReceived - amountInvested;
  const pnlNetFees = pnlGross - feesTotal;
  const pfuApplied = pnlNetFees > 0;
  const pnlNetTax = pfuApplied ? pnlNetFees * 0.7 : pnlNetFees;
  const pnlPctNetFees =
    amountInvested > 0 ? (pnlNetFees / amountInvested) * 100 : 0;
  return {
    amountInvested,
    amountReceived,
    pnlGross,
    feesTotal,
    pnlNetFees,
    pnlNetTax,
    pnlPctNetFees,
    pfuApplied,
  };
}

function fmtEur(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export default function ProfitLossCalculator() {
  const [buyPrice, setBuyPrice] = useState<string>("30000");
  const [sellPrice, setSellPrice] = useState<string>("45000");
  const [quantity, setQuantity] = useState<string>("0.1");
  const [buyFeesPct, setBuyFeesPct] = useState<string>("0.4");
  const [sellFeesPct, setSellFeesPct] = useState<string>("0.4");

  const result = useMemo(() => {
    return compute(
      parseFloat(buyPrice) || 0,
      parseFloat(sellPrice) || 0,
      parseFloat(quantity) || 0,
      parseFloat(buyFeesPct) || 0,
      parseFloat(sellFeesPct) || 0,
    );
  }, [buyPrice, sellPrice, quantity, buyFeesPct, sellFeesPct]);

  const isProfit = result.pnlNetFees > 0;
  const trendIcon = isProfit ? (
    <TrendingUp className="h-5 w-5" aria-hidden="true" />
  ) : (
    <TrendingDown className="h-5 w-5" aria-hidden="true" />
  );
  const accentClass = isProfit
    ? "border-accent-green/40 bg-accent-green/5 text-accent-green"
    : "border-accent-rose/40 bg-accent-rose/5 text-accent-rose";

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* === INPUTS === */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-fg flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Tes parametres
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Prix d'achat (€)"
              value={buyPrice}
              onChange={setBuyPrice}
              placeholder="30000"
            />
            <Field
              label="Prix de vente (€)"
              value={sellPrice}
              onChange={setSellPrice}
              placeholder="45000"
            />
          </div>

          <Field
            label="Quantite (BTC, ETH...)"
            value={quantity}
            onChange={setQuantity}
            placeholder="0.1"
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Frais achat (%)"
              value={buyFeesPct}
              onChange={setBuyFeesPct}
              placeholder="0.4"
              hint="Maker/taker selon ton ordre"
            />
            <Field
              label="Frais vente (%)"
              value={sellFeesPct}
              onChange={setSellFeesPct}
              placeholder="0.4"
              hint="Spread inclus si instant"
            />
          </div>

          <div className="rounded-xl border border-border bg-elevated/30 p-3 text-[11px] text-muted">
            <strong className="text-fg/80">Frais typiques :</strong> Coinbase
            Advanced ~0.4% maker / 0.6% taker · Binance ~0.1% / 0.1% ·
            Instant Buy / Spread 1-2% · Plus d&apos;infos sur{" "}
            <a
              href="/comparatif/frais"
              className="underline hover:text-fg"
            >
              /comparatif/frais
            </a>
            .
          </div>
        </div>

        {/* === RESULTS === */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-fg flex items-center gap-2">
            {trendIcon}
            Resultat
          </h2>

          {/* Top result : PnL net */}
          <div className={`rounded-2xl border p-4 ${accentClass}`}>
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">
              PnL net apres frais
            </div>
            <div className="mt-1 font-mono text-2xl sm:text-3xl font-extrabold tabular-nums">
              {result.pnlNetFees >= 0 ? "+" : ""}
              {fmtEur(result.pnlNetFees)}
            </div>
            <div className="mt-0.5 font-mono text-xs opacity-90">
              {fmtPct(result.pnlPctNetFees)} sur{" "}
              {fmtEur(result.amountInvested)} investi
            </div>
          </div>

          {/* Detail breakdown */}
          <dl className="rounded-xl border border-border bg-elevated/30 p-4 space-y-2 text-sm">
            <Row
              label="Montant investi (achat)"
              value={fmtEur(result.amountInvested)}
            />
            <Row
              label="Montant recu (vente)"
              value={fmtEur(result.amountReceived)}
            />
            <Row
              label="PnL brut"
              value={
                (result.pnlGross >= 0 ? "+" : "") + fmtEur(result.pnlGross)
              }
              tone={result.pnlGross >= 0 ? "green" : "rose"}
            />
            <Row
              label="Frais cumules (achat + vente)"
              value={"-" + fmtEur(result.feesTotal)}
              tone="muted"
            />
            <hr className="border-border/40" />
            <Row
              label="PnL net (apres frais)"
              value={
                (result.pnlNetFees >= 0 ? "+" : "") +
                fmtEur(result.pnlNetFees)
              }
              tone={result.pnlNetFees >= 0 ? "green" : "rose"}
              bold
            />
            <Row
              label={
                result.pfuApplied
                  ? "Impot PFU 30% (estime)"
                  : "Impot PFU (perte = non applicable)"
              }
              value={
                result.pfuApplied
                  ? "-" + fmtEur(result.pnlNetFees - result.pnlNetTax)
                  : "—"
              }
              tone="muted"
            />
            <hr className="border-border/40" />
            <Row
              label="PnL final apres impot"
              value={
                (result.pnlNetTax >= 0 ? "+" : "") + fmtEur(result.pnlNetTax)
              }
              tone={result.pnlNetTax >= 0 ? "green" : "rose"}
              bold
            />
          </dl>

          {/* Disclaimer compact */}
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-[11px] text-amber-100/85 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
            <p>
              <strong className="text-amber-200">Estimation educative.</strong>{" "}
              Le PFU 30% ne s&apos;applique qu&apos;aux{" "}
              <strong className="text-amber-200">cessions taxables</strong>{" "}
              (vers fiat/biens). Token-to-token = non taxable en FR depuis
              2019. Pour la declaration reelle, voir{" "}
              <a
                href="/outils/cerfa-2086-auto"
                className="underline"
              >
                /outils/cerfa-2086-auto
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step="any"
        min="0"
        className="mt-1 w-full h-10 rounded-lg border border-border bg-elevated/60 px-3 font-mono text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
      {hint && <p className="mt-0.5 text-[10px] text-muted">{hint}</p>}
    </label>
  );
}

function Row({
  label,
  value,
  tone = "default",
  bold = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "green" | "rose" | "muted";
  bold?: boolean;
}) {
  const toneClass =
    tone === "green"
      ? "text-accent-green"
      : tone === "rose"
        ? "text-accent-rose"
        : tone === "muted"
          ? "text-muted"
          : "text-fg/85";
  const weight = bold ? "font-bold" : "font-medium";
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={`font-mono text-sm tabular-nums ${weight} ${toneClass}`}
      >
        {value}
      </dd>
    </div>
  );
}
