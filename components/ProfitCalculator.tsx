"use client";

import { useMemo, useState } from "react";
import { Calculator, TrendingUp, TrendingDown } from "lucide-react";

export default function ProfitCalculator() {
  const [invested, setInvested] = useState(1000);
  const [buyPrice, setBuyPrice] = useState(30000);
  const [sellPrice, setSellPrice] = useState(45000);
  const [feesPct, setFeesPct] = useState(0.5);

  const result = useMemo(() => {
    if (buyPrice <= 0 || invested <= 0) {
      return { quantity: 0, gross: 0, fees: 0, net: 0, roi: 0 };
    }
    const quantity = invested / buyPrice;
    const gross = quantity * sellPrice;
    const fees = (gross * feesPct) / 100 + (invested * feesPct) / 100;
    const net = gross - fees - invested;
    const roi = (net / invested) * 100;
    return { quantity, gross, fees, net, roi };
  }, [invested, buyPrice, sellPrice, feesPct]);

  const positive = result.net >= 0;

  return (
    <div id="calculateur" className="glass glow-border rounded-2xl p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent-cyan">
          <Calculator className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-xl text-white">Calculateur de profits</h2>
          <p className="text-sm text-muted">Simule un achat / une vente avec les frais</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Field
            label="Montant investi (€)"
            value={invested}
            onChange={setInvested}
            step={100}
          />
          <Field
            label="Prix d'achat (€)"
            value={buyPrice}
            onChange={setBuyPrice}
            step={100}
          />
          <Field
            label="Prix de vente (€)"
            value={sellPrice}
            onChange={setSellPrice}
            step={100}
          />
          <Field
            label="Frais aller-retour (%)"
            value={feesPct}
            onChange={setFeesPct}
            step={0.1}
          />
        </div>

        <div className="rounded-xl border border-border bg-elevated/40 p-5 space-y-3">
          <Row label="Quantité achetée" value={`${result.quantity.toFixed(6)}`} />
          <Row label="Valeur à la vente" value={fmtEur(result.gross)} />
          <Row label="Frais totaux" value={fmtEur(result.fees)} />
          <hr className="border-border/60" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Profit net</span>
            <span
              className={`font-mono font-bold text-lg ${
                positive ? "text-accent-green" : "text-accent-rose"
              }`}
            >
              {fmtEur(result.net)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">ROI</span>
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                positive ? "text-accent-green" : "text-accent-rose"
              }`}
            >
              {positive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {result.roi.toFixed(2)}%
            </span>
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
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted uppercase tracking-wide">
        {label}
      </span>
      <input
        type="number"
        value={value}
        step={step}
        min={0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="mt-1 w-full rounded-lg bg-background border border-border px-3 py-2.5 font-mono text-white
                   focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/70">{label}</span>
      <span className="font-mono text-white">{value}</span>
    </div>
  );
}

function fmtEur(v: number) {
  return v.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });
}
