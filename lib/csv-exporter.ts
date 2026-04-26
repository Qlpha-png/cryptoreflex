/**
 * Helper d'export CSV — Pilier 5 (Portfolio Tracker).
 *
 * Génère un CSV RFC 4180 compatible Excel + Google Sheets, encode UTF-8 BOM
 * pour préserver les accents français à l'ouverture dans Excel Windows,
 * puis déclenche un download via une URL Blob.
 *
 * Client-only (utilise URL.createObjectURL + DOM).
 */

import type {
  PortfolioEntry,
  PortfolioWithPrices,
} from "@/lib/portfolio-types";

/** Échappe un champ CSV (RFC 4180) : double-quote l'entier si contient , " ou \n. */
function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Construit la chaîne CSV à partir des positions enrichies. */
export function buildPortfolioCsv(rows: PortfolioWithPrices[]): string {
  const headers = [
    "Crypto",
    "Symbole",
    "ID CoinGecko",
    "Quantité",
    "Prix unitaire (EUR)",
    "Valeur (EUR)",
    "Variation 24h (%)",
    "Date d'ajout",
  ];

  const lines: string[] = [headers.join(",")];

  for (const r of rows) {
    lines.push(
      [
        csvField(r.entry.cryptoName),
        csvField(r.entry.cryptoSymbol),
        csvField(r.entry.cryptoId),
        csvField(r.entry.quantity),
        csvField(r.currentPrice ?? ""),
        csvField(r.value.toFixed(2)),
        csvField(r.change24h !== null ? r.change24h.toFixed(2) : ""),
        csvField(r.entry.addedAt),
      ].join(",")
    );
  }

  return lines.join("\n");
}

/**
 * Déclenche le download du CSV. Compatible Chrome, Firefox, Safari.
 * UTF-8 BOM ﻿ pour qu'Excel Windows ne casse pas les accents.
 */
export function downloadPortfolioCsv(
  rows: PortfolioWithPrices[],
  filename = "cryptoreflex-portfolio.csv"
): void {
  if (typeof window === "undefined") return;

  const csv = "﻿" + buildPortfolioCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Libère la mémoire (Chrome bug : revoke trop tôt = download annulé).
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Variante minimale : juste les entries brutes (sans prix). */
export function buildEntriesCsv(entries: PortfolioEntry[]): string {
  const headers = ["Crypto", "Symbole", "Quantité", "Date d'ajout"];
  const lines: string[] = [headers.join(",")];
  for (const e of entries) {
    lines.push(
      [
        csvField(e.cryptoName),
        csvField(e.cryptoSymbol),
        csvField(e.quantity),
        csvField(e.addedAt),
      ].join(",")
    );
  }
  return lines.join("\n");
}
