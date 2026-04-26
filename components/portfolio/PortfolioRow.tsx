"use client";

/**
 * <PortfolioRow /> — Ligne du tableau Portfolio Tracker.
 *
 * Pilier 5. Affiche : logo, nom, quantité, prix actuel, valeur €, part %,
 * variation 24 h colorée, bouton Supprimer.
 *
 * Pas de clic sur la ligne entière : on reste sur des actions explicites
 * pour éviter les fausses manips sur mobile.
 */

import Image from "next/image";
import { Trash2, AlertCircle } from "lucide-react";
import type { PortfolioWithPrices } from "@/lib/portfolio-types";

interface PortfolioRowProps {
  row: PortfolioWithPrices;
  totalValue: number;
  onRemove: (id: string) => void;
}

function fmtEur(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtQty(value: number): string {
  if (!Number.isFinite(value)) return "—";
  // Petite quantité (<1) → 6 décimales, sinon 4.
  const decimals = value < 1 ? 6 : 4;
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function fmtPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} %`;
}

export default function PortfolioRow({
  row,
  totalValue,
  onRemove,
}: PortfolioRowProps) {
  const { entry, currentPrice, value, change24h, stale } = row;
  const sharePct =
    totalValue > 0 && Number.isFinite(value) ? (value / totalValue) * 100 : 0;

  const positiveChange = change24h !== null && change24h >= 0;
  const changeClass =
    change24h === null
      ? "text-muted"
      : positiveChange
        ? "text-success-fg"
        : "text-danger-fg";

  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-elevated/40 transition">
      {/* Crypto (logo + nom + symbol) */}
      <td className="py-3 px-3 sm:px-4">
        <div className="flex items-center gap-3 min-w-0">
          {entry.cryptoImage ? (
            <Image
              src={entry.cryptoImage}
              alt=""
              width={28}
              height={28}
              className="rounded-full shrink-0"
              unoptimized
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-elevated border border-border shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-fg truncate">
                {entry.cryptoName}
              </span>
              {stale && (
                <AlertCircle
                  className="h-3.5 w-3.5 text-warning-fg shrink-0"
                  aria-label="Prix non mis à jour"
                />
              )}
            </div>
            <span className="text-xs text-muted">{entry.cryptoSymbol}</span>
          </div>
        </div>
      </td>

      {/* Quantité */}
      <td className="py-3 px-3 sm:px-4 text-right tabular-nums text-sm text-fg">
        {fmtQty(entry.quantity)}
      </td>

      {/* Prix actuel */}
      <td className="py-3 px-3 sm:px-4 text-right tabular-nums text-sm text-fg">
        {currentPrice !== null ? fmtEur(currentPrice) : "—"}
      </td>

      {/* Valeur */}
      <td className="py-3 px-3 sm:px-4 text-right tabular-nums font-semibold text-fg">
        {fmtEur(value)}
      </td>

      {/* Part % */}
      <td className="py-3 px-3 sm:px-4 text-right tabular-nums text-sm text-muted hidden md:table-cell">
        {sharePct.toFixed(1)} %
      </td>

      {/* Variation 24h */}
      <td
        className={`py-3 px-3 sm:px-4 text-right tabular-nums text-sm font-semibold ${changeClass}`}
      >
        {fmtPct(change24h)}
      </td>

      {/* Action supprimer */}
      <td className="py-3 px-2 sm:px-4 text-right">
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted hover:bg-danger/15 hover:text-danger-fg transition"
          aria-label={`Supprimer ${entry.cryptoName} du portefeuille`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
