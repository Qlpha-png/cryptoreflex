"use client";

/**
 * <CalculateurROI /> — Calculateur ROI / Plus-value crypto.
 *
 * Pilier 5. Page : /outils/calculateur-roi-crypto.
 *
 * UX :
 *  - Recalcul on input change (instantané, pas de bouton "Calculer").
 *  - 4 result cards avec animations de chiffres (AnimatedNumber).
 *  - Encart "Si tu vendais maintenant : tu paierais X€ d'impôts" + lien.
 *  - Boutons : Réinitialiser + Copier les résultats.
 *  - Validation visuelle : champ rouge si invalide.
 *  - Disclaimer YMYL.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Receipt,
  Coins,
  RotateCcw,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { calculateROI, formatEur, formatPctSigned } from "@/lib/roi-calculator";

const DEFAULTS = {
  buyPrice: 100,
  sellPrice: 200,
  quantity: 5,
  buyFeeRate: 0.5,
  sellFeeRate: 0.5,
};

export default function CalculateurROI() {
  const [buyPrice, setBuyPrice] = useState<number>(DEFAULTS.buyPrice);
  const [sellPrice, setSellPrice] = useState<number>(DEFAULTS.sellPrice);
  const [quantity, setQuantity] = useState<number>(DEFAULTS.quantity);
  const [buyFeeRate, setBuyFeeRate] = useState<number>(DEFAULTS.buyFeeRate);
  const [sellFeeRate, setSellFeeRate] = useState<number>(DEFAULTS.sellFeeRate);
  const [copied, setCopied] = useState(false);

  // Calcul mémoisé — pure function, instant.
  const result = useMemo(
    () =>
      calculateROI({
        buyPrice,
        sellPrice,
        quantity,
        buyFeeRate,
        sellFeeRate,
      }),
    [buyPrice, sellPrice, quantity, buyFeeRate, sellFeeRate]
  );

  const positive = result.profitNet >= 0;

  const handleReset = useCallback(() => {
    setBuyPrice(DEFAULTS.buyPrice);
    setSellPrice(DEFAULTS.sellPrice);
    setQuantity(DEFAULTS.quantity);
    setBuyFeeRate(DEFAULTS.buyFeeRate);
    setSellFeeRate(DEFAULTS.sellFeeRate);
  }, []);

  const handleCopy = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    const lines = [
      "Résultats calculateur ROI Cryptoreflex.fr",
      "----",
      `Investissement initial : ${formatEur(result.investmentInitial)}`,
      `Valeur finale : ${formatEur(result.valueFinal)}`,
      `Frais totaux : ${formatEur(result.totalFees)}`,
      `Plus-value brute : ${formatEur(result.profitGross)}`,
      `Plus-value nette : ${formatEur(result.profitNet)}`,
      `ROI : ${formatPctSigned(result.roiPercent)}`,
      `Impôt FR estimé (PFU 30 %) : ${formatEur(result.taxFr)}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore (permission denied)
    }
  }, [result]);

  return (
    <div className="glass glow-border rounded-2xl p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow">
          <Calculator className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-xl text-fg">Calculateur ROI crypto</h2>
          <p className="text-sm text-muted">
            Plus-value, frais et impôt français estimé en temps réel.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="grid sm:grid-cols-2 gap-5">
        <Field
          label="Prix d'achat (€ / coin)"
          value={buyPrice}
          onChange={setBuyPrice}
          step={1}
          min={0.0001}
        />
        <Field
          label="Prix de vente (€ / coin)"
          value={sellPrice}
          onChange={setSellPrice}
          step={1}
          min={0.0001}
        />
        <Field
          label="Quantité"
          value={quantity}
          onChange={setQuantity}
          step={0.01}
          min={0.0001}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Frais achat (%)"
            value={buyFeeRate}
            onChange={setBuyFeeRate}
            step={0.05}
            min={0}
            compact
          />
          <Field
            label="Frais vente (%)"
            value={sellFeeRate}
            onChange={setSellFeeRate}
            step={0.05}
            min={0}
            compact
          />
        </div>
      </div>

      {/* Validation error */}
      {result.invalid && result.error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger-fg"
        >
          {result.error}
        </p>
      )}

      {/* 4 result cards */}
      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ResultCard
          label="ROI net"
          value={result.roiPercent}
          format="pct"
          tone={positive ? "success" : "danger"}
          Icon={positive ? TrendingUp : TrendingDown}
        />
        <ResultCard
          label="Plus-value brute"
          value={result.profitGross}
          format="eur"
          tone={result.profitGross >= 0 ? "success" : "danger"}
          Icon={Coins}
        />
        <ResultCard
          label="Plus-value nette"
          value={result.profitNet}
          format="eur"
          tone={positive ? "success" : "danger"}
          Icon={TrendingUp}
        />
        <ResultCard
          label="Impôt estimé (PFU)"
          value={result.taxFr}
          format="eur"
          tone="warning"
          Icon={Receipt}
        />
      </div>

      {/* Tax callout */}
      {result.profitNet > 0 && (
        <div className="mt-6 rounded-2xl border border-warning/30 bg-warning/5 p-5">
          <div className="flex items-start gap-3">
            <Receipt className="h-5 w-5 text-warning-fg mt-0.5 shrink-0" />
            <div className="flex-1">
              {result.taxFr > 0 ? (
                <>
                  <p className="text-sm text-fg leading-relaxed">
                    <strong>Si tu vendais maintenant :</strong> tu paierais
                    environ{" "}
                    <span className="text-warning-fg font-bold tabular-nums">
                      {formatEur(result.taxFr)}
                    </span>{" "}
                    d'impôts français (PFU 30 % : 12,8 % IR + 17,2 %
                    prélèvements sociaux).
                  </p>
                </>
              ) : (
                <p className="text-sm text-fg leading-relaxed">
                  <strong>Bonne nouvelle :</strong> ta plus-value nette de{" "}
                  <span className="text-success-fg font-bold tabular-nums">
                    {formatEur(result.profitNet)}
                  </span>{" "}
                  reste sous le seuil annuel d'exonération de 305 € — donc
                  aucun impôt si c'est ta seule cession de l'année.
                </p>
              )}
              <Link
                href="/outils/calculateur-fiscalite"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft hover:text-primary-glow"
              >
                Calcul fiscal complet (barème, BIC, abattements)
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-2 rounded-xl bg-elevated hover:bg-surface text-fg border border-border px-4 py-2 text-sm font-semibold transition"
        >
          <RotateCcw className="h-4 w-4" />
          Réinitialiser
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary-soft border border-primary/40 px-4 py-2 text-sm font-semibold transition"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" /> Copié !
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> Copier les résultats
            </>
          )}
        </button>
      </div>

      {/* YMYL disclaimer */}
      <p className="mt-6 text-xs text-muted leading-relaxed">
        Cet outil est purement pédagogique et ne constitue pas un conseil
        fiscal ou en investissement. L'impôt affiché applique le PFU à 30 %
        sans tenir compte du barème progressif, de l'option BIC ni des
        moins-values reportables. Pour une déclaration officielle, consultez
        un expert-comptable agréé crypto-actifs.
      </p>
    </div>
  );
}

/* ============================== Field ============================= */

interface FieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  compact?: boolean;
}
function Field({ label, value, onChange, step = 1, min, compact }: FieldProps) {
  const [raw, setRaw] = useState<string>(String(value));

  // Sync externe (Reset, ou changement programmatique de `value`) :
  // si la prop `value` diverge du raw ET que l'input n'a pas le focus,
  // on resync — typique d'un bouton "Réinitialiser".
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (raw !== String(value) && document.activeElement?.id !== `roi-${label}`) {
      setRaw(String(value));
    }
  }, [value, raw, label]);

  return (
    <label className="block">
      <span className={`block ${compact ? "text-xs" : "text-sm"} text-muted mb-1.5`}>
        {label}
      </span>
      <input
        id={`roi-${label}`}
        type="number"
        inputMode="decimal"
        value={raw}
        step={step}
        min={min}
        onChange={(e) => {
          setRaw(e.target.value);
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        onBlur={() => {
          const n = parseFloat(raw);
          if (!Number.isFinite(n)) {
            setRaw(String(value));
          }
        }}
        className="w-full rounded-xl bg-elevated border border-border px-3 py-2.5 text-fg tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition"
      />
    </label>
  );
}

/* ============================== ResultCard ============================== */

interface ResultCardProps {
  label: string;
  value: number;
  format: "eur" | "pct";
  tone: "success" | "danger" | "warning";
  Icon: typeof TrendingUp;
}
function ResultCard({ label, value, format, tone, Icon }: ResultCardProps) {
  const toneClass =
    tone === "success"
      ? "border-success/30 bg-success/5 text-success-fg"
      : tone === "danger"
        ? "border-danger/30 bg-danger/5 text-danger-fg"
        : "border-warning/30 bg-warning/5 text-warning-fg";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide opacity-80">
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="mt-2 text-2xl font-extrabold tabular-nums">
        {format === "pct" ? (
          <AnimatedNumber
            value={value}
            decimals={2}
            duration={500}
            suffix=" %"
            once={false}
          />
        ) : (
          <AnimatedNumber
            value={value}
            decimals={2}
            duration={500}
            prefix=""
            suffix=" €"
            once={false}
          />
        )}
      </div>
    </div>
  );
}
