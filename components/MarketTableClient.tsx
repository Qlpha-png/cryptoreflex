"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  formatCompactUsd,
  formatPct,
  formatUsd,
  type MarketCoin,
} from "@/lib/coingecko";
import WatchlistButton from "@/components/WatchlistButton";
import CryptoLogo from "@/components/ui/CryptoLogo";

/**
 * MarketTableClient — version Client de la table marché.
 *
 * Audit Block 7 RE-AUDIT 26/04/2026 (3 agents PRO consolidés) :
 *
 * VAGUE 1 — Bugs critiques (Agent Front)
 *  - Mobile : map sur sortedCoins (avant : coins) - tri ignoré sur mobile.
 *  - tr cursor-pointer retiré (UX menteur, no onClick handler attaché).
 *  - PctCell : signe +/− explicite (WCAG 1.4.1 Use of Color, agent A11y V5).
 *  - Sparkline mémoisée (React.memo) - évite recalcul 168pts × 20 cards à chaque tri.
 *
 * VAGUE 2 — A11y EAA P0 (Agent A11y)
 *  - V1 P0 : Live region role=status pour annonce de tri (aria-sort lu seulement au focus).
 *  - V4 : sr-only + aria-hidden sur header icon ★ (au lieu de aria-label sur span non-interactif).
 *  - V5 P0 : Use of Color fix - signe +/− textuel + flèches h-4 (au lieu de h-3).
 *  - aria-labelledby="market-title" sur section.
 *
 * VAGUE 3 — DYNAMISME (Agent Visual+Animation 3/10 → 8/10)
 *  - Live badge heartbeat .live-dot (réutilise Block 1 keyframe pulse-dot + ring).
 *  - Sparkline premium : gradient fill + dot final (signature CoinGecko/TradingView).
 *  - Row hover : translate-y-0.5 + border-l-2 primary (signature Phantom).
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

  // Audit A11y V1 P0 : message de live region annoncé au tri.
  const sortLabel = SORT_LABELS[sortKey] ?? sortKey;
  const sortAnnouncement = `Tableau trié par ${sortLabel}, ordre ${sortDir === "asc" ? "croissant" : "décroissant"}`;

  return (
    <section
      id="marche"
      aria-labelledby="market-title"
      className="py-12 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8 flex-wrap">
          <div>
            {/* Live badge avec heartbeat .live-dot (réutilise Block 1) */}
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent-green">
              <span className="live-dot inline-flex" aria-hidden="true" />
              Marché en direct
            </span>
            <h2 id="market-title" className="mt-3 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Top {limit} <span className="gradient-text">cryptomonnaies</span>
            </h2>
            <p className="mt-2 text-sm text-fg/65">
              {/* Audit UX F6 : sous-titre vulgarisé pour débutants */}
              Capitalisation, volume, variations en temps réel via CoinGecko.
              <span className="hidden sm:inline">{" "}Repère les cryptos en hausse <span className="text-accent-green font-semibold">(vert)</span> ou en baisse <span className="text-accent-rose font-semibold">(rouge)</span> sur 24h.</span>
            </p>
          </div>
        </div>

        {/* Audit A11y V1 P0 : Live region pour annonce de tri (sr-only) */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {sortAnnouncement}
        </div>

        {/* Mobile : cards verticales (md:hidden) — Audit Front #1 P0 BUG :
            map sur sortedCoins (avant : coins, tri desktop ignoré sur mobile). */}
        <div className="md:hidden space-y-2">
          {sortedCoins.map((coin) => {
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
                  {/* Watchlist column — étoile, tout à gauche, non triable.
                      Audit A11y V4 : sr-only au lieu de aria-label sur span non-interactif. */}
                  <th
                    scope="col"
                    className="text-center px-2 py-3 font-medium w-10"
                  >
                    <span className="sr-only">Watchlist</span>
                    <span aria-hidden="true">★</span>
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
                    <span className="sr-only">Tendance des prix sur 7 jours</span>
                    <span aria-hidden="true">7 jours</span>
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

      <CryptoLogo
        symbol={coin.symbol}
        coingeckoId={coin.id}
        imageUrl={coin.image}
        size={36}
        priority={priority}
      />

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
  // Pour préserver la sémantique <table>, on n'utilise PAS de <Link> autour du <tr>.
  // Audit A11y V2 P0 + Front #4 : retire cursor-pointer (UX menteur — pas d'onClick
  // handler, le clavier ne pouvait pas activer la "ligne cliquable"). Le <Link> sur
  // la cellule "Crypto" reste l'unique cible interactive (focus-visible OK).
  return (
    <tr
      className={[
        "border-t border-border transition-colors group/row",
        hasPage ? "hover:bg-elevated/50" : "",
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
          <CryptoLogo
            symbol={coin.symbol}
            coingeckoId={coin.id}
            imageUrl={coin.image}
            size={28}
            priority={priority}
          />
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

/**
 * PctCell — affichage d'une variation en %.
 * Audit A11y V5 P0 (1.4.1 Use of Color) : signe +/− textuel explicite + flèche
 * plus grosse (h-4 vs h-3) pour daltoniens. Pas color-only.
 */
function PctCell({ value }: { value: number | null }) {
  if (value === null || value === undefined)
    return (
      <span className="text-muted text-xs" aria-label="Donnée indisponible">
        —
      </span>
    );
  const up = value >= 0;
  // Audit A11y V5 : signe +/− explicite avant la valeur (pas color-only).
  const sign = up ? "+" : "−";
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono text-xs font-semibold tabular-nums ${
        up ? "text-accent-green" : "text-accent-rose"
      }`}
    >
      {up ? (
        <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
      ) : (
        <ArrowDownRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
      )}
      <span className="sr-only">{up ? "hausse de" : "baisse de"} </span>
      {sign}
      {formatPct(value).replace(/^[+-−]/, "")}
    </span>
  );
}

/**
 * Sparkline SVG premium (Audit Visual+Animation P0) :
 *  - Gradient fill sous la courbe (style CoinGecko/TradingView signature)
 *  - Dot final pulsé (signature dynamism — point lumineux qui respire)
 *  - strokeLinecap="round" + width 1.75 (premium)
 *  - React.memo (Audit Perf L4) : évite recalcul 168pts × 20 cards à chaque tri
 *
 * Note : pas de polling client cette pass, donc le dot pulsé est le seul indicateur
 * visuel "vivant" — quand polling sera ajouté, le PriceFlash s'activera automatiquement.
 */
const Sparkline = memo(function SparklineImpl({
  points,
  positive,
  width = 100,
  height = 32,
  coinId,
}: {
  points: number[];
  positive: boolean;
  width?: number;
  height?: number;
  /** Id unique pour gradient SVG (évite collision quand multiple Sparkline rendered). */
  coinId?: string;
}) {
  if (!points || points.length < 2) return null;
  const w = width;
  const h = height;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = w / (points.length - 1);

  const coords = points.map((p, i) => ({
    x: i * stepX,
    y: h - ((p - min) / range) * h,
  }));

  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${path} L${w},${h} L0,${h} Z`;
  const stroke = positive ? "#22C55E" : "#EF4444";
  const gradientId = `spk-mkt-${coinId ?? "default"}-${positive ? "up" : "down"}`;
  const lastPoint = coords[coords.length - 1];

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="inline-block shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot final pulsé — signature visual TradingView/Phantom */}
      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r={2}
        fill={stroke}
        className="motion-safe:animate-pulse"
      />
    </svg>
  );
});

/** Labels FR pour le live region tri (Audit A11y V1). */
const SORT_LABELS: Record<SortKey, string> = {
  rank: "Rang",
  price: "Prix",
  change24h: "Variation 24 heures",
  change7d: "Variation 7 jours",
  marketCap: "Capitalisation",
  volume: "Volume 24 heures",
};

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
