"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  ExternalLink,
  Fish,
  Layers,
  RotateCw,
  Wallet,
  HelpCircle,
  ArrowRight,
} from "lucide-react";

/**
 * WhaleWatcher — Client Component qui affiche les 5 dernières grosses
 * transactions on-chain ("whale alerts") sur les fiches cryptos majeures.
 *
 * Pattern :
 *  - Fetch /api/whales/{coingeckoId} au mount + sur clic refresh.
 *  - Si 404 (crypto non supportée), si erreur ou si liste vide → return null
 *    (cohérent avec OnChainMetricsLive : on préfère masquer plutôt qu'un placeholder).
 *  - Skeleton custom pendant le 1er chargement uniquement.
 *  - Animations CSS pures via classes Tailwind `whale-card` (staggered fade-up).
 */

interface Props {
  coingeckoId: string;
  cryptoName: string;
  cryptoSymbol: string;
}

type WhaleOwnerType = "exchange" | "wallet" | "unknown" | "defi";

interface WhaleTransaction {
  id: string;
  hash: string;
  timestamp: string;
  amountCrypto: number;
  amountUSD: number;
  fromType: WhaleOwnerType;
  toType: WhaleOwnerType;
  fromName?: string;
  toName?: string;
  blockchain: string;
}

interface ApiResponse {
  whales: WhaleTransaction[] | null;
}

export default function WhaleWatcher({
  coingeckoId,
  cryptoName,
  cryptoSymbol,
}: Props) {
  const [whales, setWhales] = useState<WhaleTransaction[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errored, setErrored] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toISOString());

  const load = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      try {
        const res = await fetch(
          `/api/whales/${encodeURIComponent(coingeckoId)}`,
          { signal, cache: "no-store" },
        );
        if (!res.ok) {
          // 404 (non supporté) ou 5xx → on rend null silencieusement.
          setErrored(true);
          setWhales([]);
          return;
        }
        const json = (await res.json()) as ApiResponse;
        setWhales(Array.isArray(json.whales) ? json.whales : []);
        setLastUpdate(new Date().toISOString());
        setErrored(false);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setErrored(true);
        setWhales([]);
      }
    },
    [coingeckoId],
  );

  useEffect(() => {
    const controller = new AbortController();
    setInitialLoading(true);
    load(controller.signal).finally(() => setInitialLoading(false));
    return () => controller.abort();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load, refreshing]);

  if (initialLoading) {
    return <SkeletonList />;
  }

  // Crypto non supportée OU liste vide OU erreur → on disparaît.
  if (errored || whales.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={`Transactions whales ${cryptoName}`}
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <style jsx>{`
        @keyframes whaleUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .whale-card {
          opacity: 0;
          animation: whaleUp 0.45s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .whale-card {
            opacity: 1;
            animation: none;
          }
        }
      `}</style>

      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Fish className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-base sm:text-lg font-bold tracking-tight">
            Whale Watcher{" "}
            <span className="gradient-text">{cryptoName}</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Rafraîchir les transactions whales"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-elevated/60 px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-fg hover:border-primary/40 transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <RotateCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {refreshing ? "Mise à jour..." : "Rafraîchir"}
        </button>
      </header>

      <p className="mt-2 text-[12px] text-muted">
        Top 5 des plus grosses transactions on-chain récentes (≥ 1 M$).
      </p>

      <ul className="mt-4 space-y-3">
        {whales.map((tx, i) => (
          <WhaleRow
            key={tx.id}
            tx={tx}
            cryptoSymbol={cryptoSymbol}
            index={i}
          />
        ))}
      </ul>

      <p className="mt-4 text-[11px] text-muted">
        Source : Whale Alert · maj {formatRelativeFr(lastUpdate)}
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Row                                                                       */
/* -------------------------------------------------------------------------- */

function WhaleRow({
  tx,
  cryptoSymbol,
  index,
}: {
  tx: WhaleTransaction;
  cryptoSymbol: string;
  index: number;
}) {
  const explorer = useMemo(
    () => buildExplorerUrl(tx.blockchain, tx.hash),
    [tx.blockchain, tx.hash],
  );
  const fromLabel = ownerLabel(tx.fromType, tx.fromName);
  const toLabel = ownerLabel(tx.toType, tx.toName);

  return (
    <li
      className="whale-card rounded-xl border border-border bg-elevated/40 p-3 sm:p-4"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Montants */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-sm sm:text-base font-bold text-fg tabular-nums">
              {formatCryptoAmount(tx.amountCrypto)} {cryptoSymbol.toUpperCase()}
            </span>
            <span className="text-xs text-muted">≈</span>
            <span className="font-mono text-sm font-semibold text-primary tabular-nums">
              {formatCompactUsd(tx.amountUSD)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted flex-wrap">
            <OwnerChip type={tx.fromType} label={fromLabel} />
            <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
            <OwnerChip type={tx.toType} label={toLabel} />
          </div>
        </div>

        {/* Métadonnées : timestamp + lien explorer */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <span className="text-[11px] text-muted whitespace-nowrap">
            {formatRelativeFr(tx.timestamp)}
          </span>
          {explorer && tx.hash && (
            <a
              href={explorer}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Voir la transaction ${tx.hash.slice(0, 10)}… dans l'explorer`}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-mono text-muted hover:text-primary hover:border-primary/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {shortenHash(tx.hash)}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Owner chip                                                                */
/* -------------------------------------------------------------------------- */

function OwnerChip({
  type,
  label,
}: {
  type: WhaleOwnerType;
  label: string;
}) {
  const Icon = ownerIcon(type);
  const cls =
    type === "exchange"
      ? "text-primary border-primary/30 bg-primary/5"
      : type === "defi"
      ? "text-accent-green border-accent-green/30 bg-accent-green/5"
      : type === "wallet"
      ? "text-fg/80 border-border bg-surface"
      : "text-muted border-border bg-surface";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${cls}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate max-w-[120px]">{label}</span>
    </span>
  );
}

function ownerIcon(type: WhaleOwnerType) {
  if (type === "exchange") return Building2;
  if (type === "defi") return Layers;
  if (type === "wallet") return Wallet;
  return HelpCircle;
}

function ownerLabel(type: WhaleOwnerType, name?: string): string {
  if (name && name.trim()) {
    // Capitalize first letter pour cohérence visuelle
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  if (type === "exchange") return "Exchange";
  if (type === "defi") return "DeFi";
  if (type === "wallet") return "Wallet";
  return "Inconnu";
}

/* -------------------------------------------------------------------------- */
/*  Skeleton                                                                  */
/* -------------------------------------------------------------------------- */

function SkeletonList() {
  return (
    <section
      aria-label="Chargement des transactions whales"
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <div className="h-5 w-48 rounded bg-elevated/60 animate-pulse motion-reduce:animate-none" />
      <ul className="mt-5 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={i}
            className="h-16 rounded-xl border border-border bg-elevated/40 animate-pulse motion-reduce:animate-none"
          />
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function buildExplorerUrl(blockchain: string, hash: string): string | null {
  if (!hash) return null;
  const chain = blockchain.toLowerCase();
  // Mapping des chains les plus surveillées par Whale Alert.
  if (chain === "bitcoin") return `https://mempool.space/tx/${hash}`;
  if (chain === "ethereum") return `https://etherscan.io/tx/${hash}`;
  if (chain === "solana") return `https://solscan.io/tx/${hash}`;
  if (chain === "ripple") return `https://xrpscan.com/tx/${hash}`;
  if (chain === "binancechain" || chain === "binance-chain")
    return `https://explorer.bnbchain.org/tx/${hash}`;
  if (chain === "binance-smart-chain" || chain === "bsc")
    return `https://bscscan.com/tx/${hash}`;
  if (chain === "tron") return `https://tronscan.org/#/transaction/${hash}`;
  return null;
}

function shortenHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function formatCompactUsd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCryptoAmount(value: number): string {
  if (!Number.isFinite(value)) return "—";
  // Pour les très grosses quantités on passe en compact (ex: "1,2 K"),
  // sinon on garde 2 décimales max pour BTC/ETH.
  if (value >= 10_000) {
    return new Intl.NumberFormat("fr-FR", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRelativeFr(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "à l'instant";
  const diffMs = Date.now() - t;
  const diffMin = Math.max(0, Math.round(diffMs / 60_000));
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `il y a ${diffD} j`;
}
