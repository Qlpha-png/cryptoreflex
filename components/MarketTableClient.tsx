"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  formatCompactUsd,
  formatPct,
  formatUsd,
  type MarketCoin,
} from "@/lib/coingecko";
import WatchlistButton from "@/components/WatchlistButton";

/**
 * MarketTableClient — version Client de la table marché (audit P0-3 / P0-4).
 *
 * Responsabilités :
 *  - Tri client-side sur 6 colonnes (rang, prix, 24h, 7j, market cap, volume).
 *  - Indicateur visuel ▲/▼ sur l'en-tête actif + aria-sort ARIA-correct.
 *  - Lignes cliquables vers /cryptos/[slug] uniquement si le slug existe
 *    dans `lib/cryptos.ts` (slugs passés en props par le Server parent).
 *  - Préserve les 2 layouts (mobile cards / desktop table).
 */

type SortKey = "rank" | "price" | "change24h" | "change7d" | "marketCap" | "volume";
type SortDir = "asc" | "desc";

interface Props {
  coins: MarketCoin[];
  limit: number;
  /** Slugs cliquables (intersection avec getCryptoSlugs()). */
  internalSlugs: string[];
}

export default function MarketTableClient({ coins, limit, internalSlugs }: Props) {
  // Tri par défaut : par rang croissant (= ordre market cap décroissant).
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const slugSet = useMemo(() => new Set(internalSlugs), [internalSlugs]);

  const sortedCoins = useMemo(() => {
    const copy = [...coins];
    copy.sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      // Les nulls atterrissent toujours en bas, peu importe la direction.
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const diff = av - bv;
      return sortDir === "asc" ? diff : -diff;
    });
    return copy;
  }, [coins, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Defaults sensés : rang croissant, autres colonnes décroissantes
      // (les users veulent voir "qui est le plus haut").
      setSortDir(key === "rank" ? "asc" : "desc");
    }
  }

  return (
    <section id="marche" className="py-12 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8 flex-wrap">
          <div>
            <span className="badge-info">Marché en direct</span>
            <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Top {limit} <span className="gradient-text">cryptomonnaies</span>
            </h2>
            <p className="mt-2 text-sm text-muted">
              Capitalisation, volume, variations en temps réel via CoinGecko. Mis à jour toutes les 2 min.
            </p>
          </div>
        </div>

        {/* Mobile : cards verticales (md:hidden) — tri non exposé (UX simplifiée),
            mais on respecte l'ordre serveur (rank). */}
        <div className="md:hidden space-y-2">
          {coins.map((coin) => {
            const hasPage = slugSet.has(coin.id);
            return (
              <CoinCardMobile
                key={coin.id}
                coin={coin}
                // P0-1 audit-front : MarketTable n'est pas le LCP de la home.
                // priority retiré pour ne pas concurrencer le Hero.
                priority={false}
                hasPage={hasPage}
              />
            );
          })}
        </div>

        {/* Desktop : tableau classique avec tri (hidden md:block) */}
        <div className="hidden md:block overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Top {limit} cryptomonnaies par capitalisation. Colonnes : rang, nom,
                prix, variations 1h / 24h / 7 jours, capitalisation de marché,
                volume sur 24 heures, et tendance graphique sur 7 jours.
                Cliquez sur un en-tête de colonne pour trier.
              </caption>
              <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
                <tr>
                  {/* Watchlist column — étoile, tout à gauche, non triable */}
                  <th
                    scope="col"
                    className="text-center px-2 py-3 font-medium w-10"
                  >
                    <span aria-label="Ajouter à la watchlist" title="Watchlist">
                      ★
                    </span>
                  </th>
                  <SortableTh
                    label="#"
                    sortKey="rank"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    align="left"
                    widthClass="w-12"
                  />
                  <th scope="col" className="text-left px-4 py-3 font-medium">
                    Crypto
                  </th>
                  <SortableTh
                    label="Prix"
                    sortKey="price"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <th
                    scope="col"
                    className="text-right px-4 py-3 font-medium hidden sm:table-cell"
                  >
                    1h
                  </th>
                  <SortableTh
                    label="24h"
                    sortKey="change24h"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableTh
                    label="7j"
                    sortKey="change7d"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    align="right"
                    extraClass="hidden md:table-cell"
                  />
                  <SortableTh
                    label="Market Cap"
                    sortKey="marketCap"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    align="right"
                    extraClass="hidden lg:table-cell"
                  />
                  <SortableTh
                    label="Volume 24h"
                    sortKey="volume"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    align="right"
                    extraClass="hidden lg:table-cell"
                  />
                  <th
                    scope="col"
                    className="text-center px-2 py-3 font-medium hidden xl:table-cell w-32"
                  >
                    <span aria-label="Tendance des prix sur 7 jours">7 jours</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedCoins.map((coin) => {
                  const hasPage = slugSet.has(coin.id);
                  return (
                    <CoinRow
                      key={coin.id}
                      coin={coin}
                      // P0-1 audit-front : MarketTable est below-the-fold sur la home
                      // (après Hero + Reassurance + WhyTrustUs + Newsletter).
                      // On laisse le navigateur lazy-loader ces 20 logos.
                      priority={false}
                      hasPage={hasPage}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-muted text-right">
          Données :{" "}
          <a href="https://www.coingecko.com" className="hover:text-fg underline">
            CoinGecko
          </a>
        </p>
      </div>
    </section>
  );
}

/* ───────────────────────── SORTABLE TH ───────────────────────── */
function SortableTh({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  align,
  widthClass,
  extraClass,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  align: "left" | "right";
  widthClass?: string;
  extraClass?: string;
}) {
  const isActive = activeKey === sortKey;
  const ariaSort: "ascending" | "descending" | "none" = isActive
    ? dir === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={[
        align === "left" ? "text-left" : "text-right",
        "px-4 py-3 font-medium",
        widthClass ?? "",
        extraClass ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={[
          "inline-flex items-center gap-1 select-none uppercase tracking-wider rounded",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          isActive ? "text-fg" : "hover:text-fg",
          align === "right" ? "ml-auto" : "",
        ].join(" ")}
        aria-label={`Trier par ${label}${
          isActive ? (dir === "asc" ? " (ordre croissant)" : " (ordre décroissant)") : ""
        }`}
      >
        {label}
        <span aria-hidden="true" className="inline-block w-3 text-center text-[10px]">
          {isActive ? (dir === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}

/* ───────────────────────── MOBILE CARD ───────────────────────── */
function CoinCardMobile({
  coin,
  priority,
  hasPage,
}: {
  coin: MarketCoin;
  priority?: boolean;
  hasPage: boolean;
}) {
  const change = coin.priceChange24h ?? 0;
  const up = change >= 0;

  const inner = (
    <div
      className={[
        "rounded-xl border border-border bg-surface p-3 flex items-center gap-3 transition-colors min-h-[68px]",
        hasPage
          ? "active:bg-elevated/60 hover:bg-elevated/40 cursor-pointer"
          : "cursor-default",
      ].join(" ")}
    >
      <span className="text-muted font-mono text-[11px] w-5 text-center shrink-0">
        {coin.marketCapRank}
      </span>

      {coin.image ? (
        <Image
          src={coin.image}
          alt={coin.name}
          width={36}
          height={36}
          className="h-9 w-9 rounded-full shrink-0"
          priority={priority}
          loading={priority ? undefined : "lazy"}
          sizes="36px"
          unoptimized
        />
      ) : (
        <span className="h-9 w-9 rounded-full bg-elevated shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-fg text-[15px] truncate">{coin.name}</span>
          <span className="text-[11px] text-muted font-mono uppercase shrink-0">
            {coin.symbol}
          </span>
        </div>
        <div className="text-[11px] text-muted mt-0.5 font-mono">
          MCap {formatCompactUsd(coin.marketCap)}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="font-mono font-semibold text-fg text-[15px]">
          {formatUsd(coin.currentPrice)}
        </div>
        <div
          className={`inline-flex items-center gap-0.5 font-mono text-xs font-semibold mt-0.5 ${
            up ? "text-accent-green" : "text-accent-rose"
          }`}
          aria-label={`Variation 24 heures : ${up ? "hausse" : "baisse"} de ${formatPct(change)}`}
        >
          {up ? (
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
          )}
          {formatPct(change)}
        </div>
      </div>

      <Sparkline
        points={coin.sparkline7d ?? []}
        positive={up}
        width={50}
        height={28}
      />

      {/* Watchlist toggle — stopPropagation interne dans le bouton pour éviter
          que le clic ne déclenche le <Link> de la carte parente. */}
      <WatchlistButton
        cryptoId={coin.id}
        cryptoName={coin.name}
        size="sm"
        className="shrink-0"
      />
    </div>
  );

  if (hasPage) {
    return (
      <Link
        href={`/cryptos/${coin.id}`}
        className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`Voir la fiche ${coin.name}`}
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

/* ───────────────────────── DESKTOP ROW ───────────────────────── */
function CoinRow({
  coin,
  priority,
  hasPage,
}: {
  coin: MarketCoin;
  priority?: boolean;
  hasPage: boolean;
}) {
  // Pour préserver la sémantique <table>, on n'utilise PAS de <Link> autour du <tr>
  // (HTML invalide). À la place : <Link> sur la cellule "Crypto" + <tr> cliquable
  // par bubbling (onClick) — pattern compatible accessibilité car le focus visible
  // tape déjà sur le <Link> de la 2e colonne.
  return (
    <tr
      className={[
        "border-t border-border transition-colors",
        hasPage ? "hover:bg-elevated/50 cursor-pointer" : "cursor-default",
      ].join(" ")}
    >
      <td className="px-2 py-3 text-center">
        <WatchlistButton
          cryptoId={coin.id}
          cryptoName={coin.name}
          size="sm"
        />
      </td>

      <td className="px-4 py-3 text-muted font-mono text-xs">{coin.marketCapRank}</td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {coin.image ? (
            <Image
              src={coin.image}
              alt={coin.name}
              width={28}
              height={28}
              className="h-7 w-7 rounded-full shrink-0"
              priority={priority}
              loading={priority ? undefined : "lazy"}
              sizes="28px"
              unoptimized
            />
          ) : (
            <span className="h-7 w-7 rounded-full bg-elevated shrink-0" />
          )}
          <div className="min-w-0">
            {hasPage ? (
              <Link
                href={`/cryptos/${coin.id}`}
                className="font-semibold text-fg truncate hover:text-primary focus:outline-none focus-visible:underline rounded"
              >
                {coin.name}
              </Link>
            ) : (
              <div className="font-semibold text-fg truncate">{coin.name}</div>
            )}
            <div className="text-xs text-muted font-mono uppercase">{coin.symbol}</div>
          </div>
        </div>
      </td>

      <td className="px-4 py-3 text-right font-mono font-semibold text-fg">
        {formatUsd(coin.currentPrice)}
      </td>

      <td className="px-4 py-3 text-right hidden sm:table-cell">
        <PctCell value={coin.priceChange1h} />
      </td>

      <td className="px-4 py-3 text-right">
        <PctCell value={coin.priceChange24h} />
      </td>

      <td className="px-4 py-3 text-right hidden md:table-cell">
        <PctCell value={coin.priceChange7d} />
      </td>

      <td className="px-4 py-3 text-right font-mono text-muted hidden lg:table-cell">
        {formatCompactUsd(coin.marketCap)}
      </td>

      <td className="px-4 py-3 text-right font-mono text-muted hidden lg:table-cell">
        {formatCompactUsd(coin.totalVolume)}
      </td>

      <td className="px-2 py-3 hidden xl:table-cell">
        <Sparkline
          points={coin.sparkline7d}
          positive={(coin.priceChange7d ?? 0) >= 0}
        />
      </td>
    </tr>
  );
}

function PctCell({ value }: { value: number | null }) {
  if (value === null || value === undefined)
    return (
      <span className="text-muted text-xs" aria-label="Donnée indisponible">
        —
      </span>
    );
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono text-xs font-semibold ${
        up ? "text-accent-green" : "text-accent-rose"
      }`}
    >
      {up ? (
        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
      ) : (
        <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
      )}
      <span className="sr-only">{up ? "hausse de" : "baisse de"} </span>
      {formatPct(value)}
    </span>
  );
}

/**
 * Sparkline SVG ultra-léger (pas de lib externe).
 * Trace les 168 points de prix 7j en une polyline normalisée.
 */
function Sparkline({
  points,
  positive,
  width = 100,
  height = 32,
}: {
  points: number[];
  positive: boolean;
  width?: number;
  height?: number;
}) {
  if (!points || points.length < 2) return null;
  const w = width;
  const h = height;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = w / (points.length - 1);
  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(2)},${(h - ((p - min) / range) * h).toFixed(2)}`
    )
    .join(" ");
  const stroke = positive ? "#22C55E" : "#EF4444";
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="inline-block shrink-0"
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getSortValue(coin: MarketCoin, key: SortKey): number | null {
  switch (key) {
    case "rank":
      return coin.marketCapRank ?? null;
    case "price":
      return coin.currentPrice ?? null;
    case "change24h":
      return coin.priceChange24h ?? null;
    case "change7d":
      return coin.priceChange7d ?? null;
    case "marketCap":
      return coin.marketCap ?? null;
    case "volume":
      return coin.totalVolume ?? null;
    default:
      return null;
  }
}
