"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from "lucide-react";
import type { MarketCoin } from "@/lib/coingecko";
import { formatUsd, formatCompactUsd } from "@/lib/coingecko";
import CryptoLogo from "@/components/ui/CryptoLogo";
import Sparkline from "@/components/Sparkline";

/**
 * CryptoScreener — table marché dense triable (DA Obsidian sprint 2b).
 *
 * Le screener "pro" : top 100 par cap, tri par n'importe quelle colonne,
 * recherche instantanée, sparkline 7j par ligne, chiffres mono tabular.
 * ≠ CryptosBrowser (/cryptos) qui est le navigateur ÉDITORIAL des 780
 * fiches (sans données marché) — les deux se complètent et se lient.
 *
 * Données : MarketCoin[] du Server Component parent (fetchTopMarket(100),
 * sparkline7d incluse par CoinGecko dans le même appel → zéro fetch
 * client, zéro coût quota supplémentaire).
 *
 * Perf : 100 lignes max dans le DOM (pas de pagination nécessaire),
 * tri/filtre en useMemo.
 */

// NB : pas de colonne "1 h" — la source primaire des données top market
// est l'aggregator maison (CoinCap + Binance, BATCH 51) qui n'expose PAS
// la variation 1h (priceChange1h toujours null). Une colonne toujours
// vide serait pire que pas de colonne.
type SortKey =
  | "rank"
  | "name"
  | "price"
  | "change24h"
  | "change7d"
  | "marketCap"
  | "volume";

interface Props {
  coins: MarketCoin[];
  internalSlugs?: string[];
}

const COLUMNS: Array<{
  key: SortKey;
  label: string;
  /** Colonnes cachées sous lg pour tenir sur mobile (overflow-x en filet). */
  hideBelowLg?: boolean;
  align: "left" | "right";
}> = [
  { key: "rank", label: "#", align: "left" },
  { key: "name", label: "Crypto", align: "left" },
  { key: "price", label: "Prix", align: "right" },
  { key: "change24h", label: "24 h", align: "right" },
  { key: "change7d", label: "7 j", align: "right" },
  { key: "marketCap", label: "Market cap", align: "right" },
  { key: "volume", label: "Volume 24h", align: "right", hideBelowLg: true },
];

function sortValue(c: MarketCoin, key: SortKey): number | string {
  switch (key) {
    case "rank":
      return c.marketCapRank;
    case "name":
      return c.name.toLowerCase();
    case "price":
      return c.currentPrice;
    case "change24h":
      return c.priceChange24h;
    case "change7d":
      return c.priceChange7d ?? -Infinity;
    case "marketCap":
      return c.marketCap;
    case "volume":
      return c.totalVolume;
  }
}

export default function CryptoScreener({ coins, internalSlugs = [] }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);
  const [query, setQuery] = useState("");

  const slugSet = useMemo(() => new Set(internalSlugs), [internalSlugs]);

  const rows = useMemo(() => {
    let list = coins;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      const cmp =
        typeof va === "string"
          ? va.localeCompare(vb as string)
          : (va as number) - (vb as number);
      return sortAsc ? cmp : -cmp;
    });
  }, [coins, query, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      // Par défaut : rank/name ascendant, les métriques en descendant
      // (on veut voir les plus grosses valeurs d'abord).
      setSortAsc(key === "rank" || key === "name");
    }
  }

  return (
    <div>
      {/* Recherche */}
      <div className="relative max-w-xs">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrer par nom ou symbole…"
          aria-label="Filtrer le screener par nom ou symbole"
          className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-8 text-sm text-fg placeholder:text-muted focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Effacer la recherche"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-muted" aria-live="polite">
        <span className="font-semibold text-fg">{rows.length}</span> crypto
        {rows.length > 1 ? "s" : ""}
        {rows.length !== coins.length && ` sur ${coins.length}`} · tri :{" "}
        {COLUMNS.find((c) => c.key === sortKey)?.label}{" "}
        {sortAsc ? "croissant" : "décroissant"}
      </p>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <caption className="sr-only">
            Screener du top 100 crypto par capitalisation — colonnes triables
          </caption>
          <thead className="sticky top-0 z-10 bg-elevated/95 backdrop-blur-sm">
            <tr>
              {COLUMNS.map((col) => {
                const active = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      active ? (sortAsc ? "ascending" : "descending") : "none"
                    }
                    className={`border-b border-border px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted ${
                      col.hideBelowLg ? "hidden lg:table-cell" : ""
                    } ${col.align === "right" ? "text-right" : "text-left"}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1 hover:text-fg ${
                        active ? "text-primary-soft" : ""
                      }`}
                    >
                      {col.label}
                      {active ? (
                        sortAsc ? (
                          <ArrowUp className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="h-3 w-3" aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown
                          className="h-3 w-3 opacity-40"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </th>
                );
              })}
              <th
                scope="col"
                className="border-b border-border px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted"
              >
                7 jours
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const hasPage = slugSet.has(c.id);
              return (
                <tr
                  key={c.id}
                  className="border-b border-border/40 last:border-b-0 transition-colors hover:bg-elevated/40"
                >
                  <td className="px-3 py-2.5 num-data text-muted">
                    {c.marketCapRank}
                  </td>
                  <td className="px-3 py-2.5">
                    {hasPage ? (
                      <Link
                        href={`/cryptos/${c.id}`}
                        className="group inline-flex items-center gap-2"
                      >
                        <CryptoLogo
                          symbol={c.symbol}
                          coingeckoId={c.id}
                          imageUrl={c.image}
                          size={20}
                        />
                        <span className="font-semibold text-fg group-hover:text-primary-soft">
                          {c.name}
                        </span>
                        <span className="text-xs uppercase text-muted">
                          {c.symbol}
                        </span>
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <CryptoLogo
                          symbol={c.symbol}
                          coingeckoId={c.id}
                          imageUrl={c.image}
                          size={20}
                        />
                        <span className="font-semibold text-fg">{c.name}</span>
                        <span className="text-xs uppercase text-muted">
                          {c.symbol}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right num-data text-fg">
                    {formatUsd(c.currentPrice)}
                  </td>
                  <PctCell value={c.priceChange24h} />
                  <PctCell value={c.priceChange7d} />
                  <td className="px-3 py-2.5 text-right num-data text-fg/80">
                    {formatCompactUsd(c.marketCap)}
                  </td>
                  <td className="hidden px-3 py-2.5 text-right num-data text-fg/80 lg:table-cell">
                    {formatCompactUsd(c.totalVolume)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {c.sparkline7d && c.sparkline7d.length > 1 ? (
                      <Sparkline
                        data={c.sparkline7d}
                        width={96}
                        height={28}
                        animated={false}
                        ariaLabel={`Évolution de ${c.name} sur 7 jours`}
                      />
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length + 1}
                  className="px-3 py-8 text-center text-sm text-muted"
                >
                  Aucune crypto ne correspond à « {query} ».
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PctCell({
  value,
  hideBelowLg = false,
}: {
  value: number | null;
  hideBelowLg?: boolean;
}) {
  const cls = hideBelowLg ? "hidden lg:table-cell" : "";
  if (value === null || !Number.isFinite(value)) {
    return (
      <td className={`px-3 py-2.5 text-right text-xs text-muted ${cls}`}>—</td>
    );
  }
  const up = value >= 0;
  return (
    <td
      className={`px-3 py-2.5 text-right num-data ${cls} ${
        up ? "text-success-fg" : "text-danger-fg"
      }`}
    >
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "Hausse de" : "Baisse de"}</span>{" "}
      {Math.abs(value).toFixed(2)}%
    </td>
  );
}
