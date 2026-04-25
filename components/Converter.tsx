"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Loader2, RefreshCw } from "lucide-react";
import { COIN_NAMES } from "@/lib/historical-prices";

/* -------------------------------------------------------------------------- */
/*  Listes (alignées sur lib/historical-prices.ts)                            */
/* -------------------------------------------------------------------------- */

const CRYPTO_OPTIONS = [
  "btc",
  "eth",
  "sol",
  "bnb",
  "xrp",
  "ada",
  "usdt",
  "usdc",
  "doge",
  "matic",
  "dot",
  "avax",
  "link",
  "ltc",
  "trx",
];
const FIAT_OPTIONS = ["eur", "usd"];

export interface ConverterProps {
  /** Pré-remplissage SEO (depuis pages /convertisseur/[from]-[to]) */
  defaultFrom?: string;
  defaultTo?: string;
  defaultAmount?: number;
}

export default function Converter({
  defaultFrom = "btc",
  defaultTo = "eur",
  defaultAmount = 1,
}: ConverterProps) {
  const [from, setFrom] = useState(defaultFrom.toLowerCase());
  const [to, setTo] = useState(defaultTo.toLowerCase());
  const [amount, setAmount] = useState<number>(defaultAmount);

  const [rate, setRate] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/convert?from=${from}&to=${to}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("rate unavailable");
      const data = (await res.json()) as { rate: number; lastUpdated: string };
      setRate(data.rate);
      setLastUpdated(data.lastUpdated);
    } catch (err) {
      setError("Conversion temporairement indisponible. Réessaie dans 1 min.");
      setRate(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const converted = useMemo(() => {
    if (rate === null || amount <= 0) return null;
    return amount * rate;
  }, [rate, amount]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <div id="converter" className="glass glow-border rounded-2xl p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent-cyan">
          <ArrowDownUp className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-xl text-white">Convertisseur Crypto</h2>
          <p className="text-sm text-muted">
            Taux en temps réel via CoinGecko — supporte cross-crypto et fiat
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {/* From */}
        <Row
          amount={amount}
          onAmountChange={setAmount}
          symbol={from}
          onSymbolChange={setFrom}
          label="Depuis"
          editable
        />

        {/* Swap */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={swap}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background hover:border-primary/60 hover:text-primary transition-colors text-white/70"
            aria-label="Inverser les devises"
          >
            <ArrowDownUp className="h-4 w-4" />
          </button>
        </div>

        {/* To */}
        <Row
          amount={converted ?? 0}
          symbol={to}
          onSymbolChange={setTo}
          label="Vers"
          editable={false}
          loading={loading}
        />
      </div>

      {/* Footer info */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-muted">
          {error ? (
            <span className="text-accent-rose">{error}</span>
          ) : rate !== null ? (
            <>
              <span className="font-mono text-white/80">
                1 {from.toUpperCase()} = {formatRate(rate)} {to.toUpperCase()}
              </span>
              {lastUpdated && (
                <span className="ml-2 text-muted">
                  • MAJ {fmtRelative(lastUpdated)}
                </span>
              )}
            </>
          ) : (
            <span>Chargement…</span>
          )}
        </div>
        <button
          type="button"
          onClick={fetchRate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-primary-soft hover:text-primary-glow transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Actualiser
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Row({
  amount,
  onAmountChange,
  symbol,
  onSymbolChange,
  label,
  editable,
  loading,
}: {
  amount: number;
  onAmountChange?: (v: number) => void;
  symbol: string;
  onSymbolChange: (v: string) => void;
  label: string;
  editable: boolean;
  loading?: boolean;
}) {
  const isFiat = FIAT_OPTIONS.includes(symbol);
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="text-[10px] font-semibold text-muted uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-3">
        {editable ? (
          <input
            type="number"
            value={amount}
            min={0}
            step="any"
            onChange={(e) => onAmountChange?.(parseFloat(e.target.value) || 0)}
            className="flex-1 bg-transparent text-2xl font-mono font-bold text-white focus:outline-none"
          />
        ) : (
          <div className="flex-1 text-2xl font-mono font-bold text-white">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted" />
            ) : (
              formatAmount(amount, isFiat)
            )}
          </div>
        )}

        <select
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          className="rounded-lg border border-border bg-elevated px-3 py-2 font-semibold text-white focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <optgroup label="Crypto">
            {CRYPTO_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()} — {COIN_NAMES[s] ?? s.toUpperCase()}
              </option>
            ))}
          </optgroup>
          <optgroup label="Fiat">
            {FIAT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()} — {COIN_NAMES[s] ?? s.toUpperCase()}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers format                                                            */
/* -------------------------------------------------------------------------- */

function formatAmount(v: number, isFiat: boolean): string {
  if (!isFinite(v)) return "—";
  if (isFiat) {
    return v.toLocaleString("fr-FR", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });
  }
  // crypto : précision adaptative
  const digits = v >= 1 ? 6 : 8;
  return v.toLocaleString("fr-FR", { maximumFractionDigits: digits });
}

function formatRate(v: number): string {
  if (v >= 1000) return v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  if (v >= 1) return v.toLocaleString("fr-FR", { maximumFractionDigits: 4 });
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 8 });
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `il y a ${sec} s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleString("fr-FR");
}
