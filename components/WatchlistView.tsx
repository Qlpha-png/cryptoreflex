"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  RefreshCcw,
  Star,
  Trash2,
} from "lucide-react";
import {
  WATCHLIST_EVENT,
  clearWatchlist,
  getWatchlist,
  removeFromWatchlist,
} from "@/lib/watchlist";
import EmptyState from "@/components/ui/EmptyState";

/**
 * Modèle simplifié des prix retournés par /api/prices.
 * On ne dépend pas des types de coingecko.ts pour rester léger côté client.
 */
interface LivePrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  image: string;
}

interface ApiResponse {
  prices: LivePrice[];
  updatedAt: string;
}

const REFRESH_MS = 120_000; // 2 min — aligné avec PriceTicker

/**
 * Vue Client de la page /watchlist.
 *
 * Lifecycle :
 * 1. Mount → lit la watchlist depuis localStorage (gate SSR via watchlist.ts).
 * 2. Si non-vide → fetch /api/prices?ids=... (route déjà existante).
 * 3. Re-fetch toutes les 2 min, et à chaque évènement `watchlist:changed`
 *    (cross-component sync : si l'utilisateur ajoute une crypto depuis un
 *    autre onglet ou une autre page, la liste se rafraîchit).
 * 4. Pause du polling si onglet caché.
 *
 * Empty state premium + bouton "Vider" avec confirmation native (no lib).
 */
export default function WatchlistView() {
  const [ids, setIds] = useState<string[]>([]);
  const [prices, setPrices] = useState<LivePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  /* --------- Sync localStorage <-> state ---------- */
  useEffect(() => {
    setIds(getWatchlist());
    setHydrated(true);

    const onChange = () => setIds(getWatchlist());
    window.addEventListener(WATCHLIST_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(WATCHLIST_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  /* --------- Fetch prix ---------- */
  const fetchPrices = useCallback(async (currentIds: string[]) => {
    if (currentIds.length === 0) {
      setPrices([]);
      setLoading(false);
      return;
    }
    try {
      const url = `/api/prices?ids=${encodeURIComponent(currentIds.join(","))}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = (await res.json()) as ApiResponse;
      if (cancelledRef.current) return;
      // L'API peut renvoyer un sur-ensemble (cache) ; on filtre + on respecte
      // l'ordre de la watchlist user.
      const byId = new Map(data.prices.map((p) => [p.id, p]));
      const ordered = currentIds
        .map((id) => byId.get(id))
        .filter((p): p is LivePrice => Boolean(p));
      setPrices(ordered);
      setUpdatedAt(data.updatedAt);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  /* --------- Polling + visibility ---------- */
  useEffect(() => {
    cancelledRef.current = false;
    fetchPrices(ids);

    const start = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => fetchPrices(ids), REFRESH_MS);
    };
    const stop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchPrices(ids);
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelledRef.current = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ids, fetchPrices]);

  /* --------- Actions ---------- */
  const handleRemove = useCallback((id: string) => {
    removeFromWatchlist(id);
    // Pas besoin de setIds : l'évènement custom déclenche la re-lecture.
  }, []);

  const handleClearAll = useCallback(() => {
    const ok = window.confirm(
      "Vider votre watchlist ? Cette action est irréversible."
    );
    if (!ok) return;
    clearWatchlist();
  }, []);

  const lastUpdateLabel = useMemo(() => {
    if (!updatedAt) return null;
    try {
      return new Date(updatedAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  }, [updatedAt]);

  /* --------- Rendu ---------- */

  // Avant hydratation : on rend un placeholder neutre pour éviter un mismatch
  // (le SSR ne connaît pas la watchlist).
  if (!hydrated) {
    return <WatchlistSkeleton />;
  }

  if (ids.length === 0) {
    return (
      <EmptyState
        icon={<Star className="h-6 w-6" aria-hidden="true" />}
        title="Votre watchlist est vide"
        description="Ajoutez jusqu'à 10 cryptos depuis le marché ou les fiches détaillées pour les retrouver ici, prix live inclus."
        cta={{ label: "Voir le marché", href: "/#marche" }}
        secondaryCta={{ label: "Top 10 cryptos", href: "/top" }}
      />
    );
  }

  return (
    <div>
      {/* Header : compteur + last update + refresh manuel */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="text-sm text-muted">
          {ids.length} crypto{ids.length > 1 ? "s" : ""} suivie
          {ids.length > 1 ? "s" : ""}
          {lastUpdateLabel && (
            <>
              {" · "}
              <span className="font-mono text-[12px]">
                MAJ {lastUpdateLabel}
              </span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => fetchPrices(ids)}
          className="btn-ghost text-xs px-3 py-1.5 min-h-0"
          aria-label="Rafraîchir les prix maintenant"
        >
          <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Rafraîchir
        </button>
      </div>

      {/* Table simple — desktop. Sur mobile : cards. */}
      <div className="hidden sm:block overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Cryptos dans votre watchlist : prix actuel, variation 24h, et
            actions de retrait.
          </caption>
          <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
            <tr>
              <th
                scope="col"
                className="text-left px-4 py-3 font-medium"
              >
                Crypto
              </th>
              <th
                scope="col"
                className="text-right px-4 py-3 font-medium"
              >
                Prix
              </th>
              <th
                scope="col"
                className="text-right px-4 py-3 font-medium"
              >
                24h
              </th>
              <th
                scope="col"
                className="text-right px-4 py-3 font-medium"
              >
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && prices.length === 0
              ? ids.map((id) => <RowSkeleton key={`skel-${id}`} />)
              : prices.map((p) => (
                  <PriceRow key={p.id} price={p} onRemove={handleRemove} />
                ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {loading && prices.length === 0
          ? ids.map((id) => <CardSkeleton key={`skel-card-${id}`} />)
          : prices.map((p) => (
              <PriceCardMobile key={p.id} price={p} onRemove={handleRemove} />
            ))}
      </div>

      {/* Bouton Vider tout — séparé visuellement, requiert confirmation */}
      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={handleClearAll}
          className="inline-flex items-center gap-2 rounded-lg border border-danger/40
                     bg-danger/5 text-danger-fg px-4 py-2 text-sm font-medium
                     hover:bg-danger/10 transition-colors
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-danger
                     focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Vider entièrement la watchlist"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Vider la watchlist
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sous-composants                                                            */
/* -------------------------------------------------------------------------- */

function PriceRow({
  price,
  onRemove,
}: {
  price: LivePrice;
  onRemove: (id: string) => void;
}) {
  const up = price.change24h >= 0;
  return (
    <tr className="border-t border-border hover:bg-elevated/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {price.image ? (
            <Image
              src={price.image}
              alt={price.name}
              width={28}
              height={28}
              className="h-7 w-7 rounded-full shrink-0"
              sizes="28px"
              unoptimized
            />
          ) : (
            <span className="h-7 w-7 rounded-full bg-elevated shrink-0" />
          )}
          <div className="min-w-0">
            <Link
              href={`/cryptos/${price.id}`}
              className="font-semibold text-fg hover:text-primary truncate
                         focus:outline-none focus-visible:underline rounded"
            >
              {price.name}
            </Link>
            <div className="text-xs text-muted font-mono uppercase">
              {price.symbol}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono font-semibold text-fg tabular-nums">
        {formatPrice(price.price)}
      </td>
      <td className="px-4 py-3 text-right">
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
          {formatPct(price.change24h)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => onRemove(price.id)}
          aria-label={`Retirer ${price.name} de la watchlist`}
          title="Retirer de la watchlist"
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg
                     border border-border/60 text-muted hover:text-danger-fg
                     hover:border-danger/40 hover:bg-danger/5 transition-colors
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-danger
                     focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

function PriceCardMobile({
  price,
  onRemove,
}: {
  price: LivePrice;
  onRemove: (id: string) => void;
}) {
  const up = price.change24h >= 0;
  return (
    <div className="rounded-xl border border-border bg-surface p-3 flex items-center gap-3">
      {price.image ? (
        <Image
          src={price.image}
          alt={price.name}
          width={36}
          height={36}
          className="h-9 w-9 rounded-full shrink-0"
          sizes="36px"
          unoptimized
        />
      ) : (
        <span className="h-9 w-9 rounded-full bg-elevated shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <Link
          href={`/cryptos/${price.id}`}
          className="font-semibold text-fg text-[15px] truncate block
                     focus:outline-none focus-visible:underline rounded"
        >
          {price.name}
        </Link>
        <div className="text-[11px] text-muted font-mono uppercase">
          {price.symbol}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono font-semibold text-fg text-[15px] tabular-nums">
          {formatPrice(price.price)}
        </div>
        <div
          className={`inline-flex items-center gap-0.5 font-mono text-xs font-semibold mt-0.5 ${
            up ? "text-accent-green" : "text-accent-rose"
          }`}
        >
          {up ? (
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
          )}
          {formatPct(price.change24h)}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(price.id)}
        aria-label={`Retirer ${price.name}`}
        className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg
                   border border-border/60 text-muted hover:text-danger-fg
                   hover:border-danger/40 hover:bg-danger/5 transition-colors
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-danger
                   focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function WatchlistSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-4 w-40 skeleton" />
      <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full skeleton" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 skeleton" />
              <div className="h-2.5 w-16 skeleton" />
            </div>
            <div className="h-3 w-20 skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full skeleton" />
          <div className="space-y-1.5">
            <div className="h-3 w-24 skeleton" />
            <div className="h-2.5 w-12 skeleton" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-3 w-16 skeleton ml-auto" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-3 w-12 skeleton ml-auto" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-7 w-7 skeleton ml-auto rounded-lg" />
      </td>
    </tr>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-full skeleton" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-24 skeleton" />
        <div className="h-2.5 w-12 skeleton" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-16 skeleton" />
        <div className="h-2.5 w-12 skeleton" />
      </div>
    </div>
  );
}

/* Helpers locaux : on évite d'importer formatUsd qui pull tout coingecko.ts dans le bundle client */
function formatPrice(value: number): string {
  if (!value) return "—";
  if (value >= 1000) {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 4 : 2,
  });
}

function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
