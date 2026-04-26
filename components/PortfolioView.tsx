"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import CryptoLogo from "@/components/ui/CryptoLogo";
import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  Download,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  PORTFOLIO_EVENT,
  clearHoldings,
  getHoldings,
  removeHolding,
  type Holding,
} from "@/lib/portfolio";
import EmptyState from "@/components/ui/EmptyState";
import AddHoldingDialog from "@/components/AddHoldingDialog";
import EditHoldingDialog from "@/components/EditHoldingDialog";
import PortfolioPieChart, {
  type PieSlice,
} from "@/components/PortfolioPieChart";

const REFRESH_MS = 120_000; // 2 min — aligné avec le ticker / watchlist

interface LivePrice {
  id: string;
  priceEur: number;
  change24hPct: number;
  symbol?: string;
  name?: string;
  image?: string;
}

interface ApiResponse {
  prices: LivePrice[];
  updatedAt: string;
}

/**
 * Vue Client de la page /portefeuille.
 *
 * Lifecycle :
 *   1. Mount → setHydrated(true) puis lecture localStorage (gate SSR via lib).
 *   2. Si holdings non-vide → fetch /api/portfolio-prices?ids=cgIds
 *   3. Re-fetch toutes les 2 min, et à chaque évènement portfolio:changed
 *      (cross-component sync : ajout/edit déclenchent re-fetch automatique).
 *   4. Pause polling si onglet caché (économie quota CoinGecko).
 *
 * Calculs :
 *   - totalCost = Σ (qty × pru)
 *   - totalValue = Σ (qty × pricesEur[cgId])  (ignore positions sans prix)
 *   - gain = totalValue - totalCost ; gainPct = gain / totalCost
 *   - allocation = (qty × prixActuel) / totalValue → pour le pie
 */
export default function PortfolioView() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [prices, setPrices] = useState<LivePrice[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Holding | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  /* -------- Sync localStorage <-> state ---------------------------------- */
  useEffect(() => {
    setHoldings(getHoldings());
    setHydrated(true);

    const onChange = () => setHoldings(getHoldings());
    window.addEventListener(PORTFOLIO_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(PORTFOLIO_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  /* -------- Fetch prix -------------------------------------------------- */
  const cgIds = useMemo(
    () => Array.from(new Set(holdings.map((h) => h.cryptoId))),
    [holdings]
  );

  const fetchPrices = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setPrices([]);
      setLoading(false);
      return;
    }
    try {
      const url = `/api/portfolio-prices?ids=${encodeURIComponent(
        ids.join(",")
      )}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = (await res.json()) as ApiResponse;
      if (cancelledRef.current) return;
      setPrices(data.prices ?? []);
      setUpdatedAt(data.updatedAt);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  /* -------- Polling + visibility gating --------------------------------- */
  useEffect(() => {
    cancelledRef.current = false;
    fetchPrices(cgIds);

    const start = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => fetchPrices(cgIds), REFRESH_MS);
    };
    const stop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchPrices(cgIds);
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
  }, [cgIds, fetchPrices]);

  /* -------- Indexation prix par id (lookup O(1)) ------------------------ */
  const pricesById = useMemo(() => {
    const map = new Map<string, LivePrice>();
    for (const p of prices) map.set(p.id, p);
    return map;
  }, [prices]);

  /* -------- Calculs agrégés --------------------------------------------- */
  const stats = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    let coveredCost = 0; // coût des positions qui ont un prix live (pour gain réaliste)

    for (const h of holdings) {
      totalCost += h.quantity * h.avgBuyPriceEur;
      const lp = pricesById.get(h.cryptoId);
      if (lp && Number.isFinite(lp.priceEur)) {
        totalValue += h.quantity * lp.priceEur;
        coveredCost += h.quantity * h.avgBuyPriceEur;
      }
    }
    const gain = totalValue - coveredCost;
    const gainPct = coveredCost > 0 ? (gain / coveredCost) * 100 : 0;
    return { totalValue, totalCost, gain, gainPct };
  }, [holdings, pricesById]);

  /* -------- Slices pour le pie chart ------------------------------------ */
  const slices: PieSlice[] = useMemo(() => {
    const out: PieSlice[] = [];
    for (const h of holdings) {
      const lp = pricesById.get(h.cryptoId);
      const value =
        lp && Number.isFinite(lp.priceEur)
          ? h.quantity * lp.priceEur
          : h.quantity * h.avgBuyPriceEur; // fallback : valeur au PRU si pas de live
      if (value <= 0) continue;
      out.push({
        id: h.id,
        label: `${h.name} (${h.symbol})`,
        value,
      });
    }
    return out;
  }, [holdings, pricesById]);

  /* -------- Actions ----------------------------------------------------- */
  const handleRemove = useCallback((h: Holding) => {
    const ok = window.confirm(
      `Supprimer ${h.name} (${h.quantity} ${h.symbol}) du portefeuille ?`
    );
    if (!ok) return;
    removeHolding(h.id);
  }, []);

  const handleClearAll = useCallback(() => {
    const ok = window.confirm(
      "Vider l'intégralité du portefeuille ? Cette action est irréversible (les données sont stockées uniquement sur ton appareil)."
    );
    if (!ok) return;
    clearHoldings();
  }, []);

  const handleExportCsv = useCallback(() => {
    if (holdings.length === 0) return;
    const header = [
      "crypto_id",
      "symbol",
      "name",
      "quantity",
      "avg_buy_price_eur",
      "current_price_eur",
      "value_eur",
      "gain_eur",
      "gain_pct",
      "added_at_iso",
    ];
    const rows = holdings.map((h) => {
      const lp = pricesById.get(h.cryptoId);
      const cost = h.quantity * h.avgBuyPriceEur;
      const cur = lp?.priceEur ?? 0;
      const value = h.quantity * cur;
      const gain = value - cost;
      const pct = cost > 0 ? (gain / cost) * 100 : 0;
      return [
        h.cryptoId,
        h.symbol,
        h.name,
        h.quantity,
        h.avgBuyPriceEur,
        cur || "",
        value || "",
        cur ? gain : "",
        cur ? pct.toFixed(2) : "",
        new Date(h.addedAt).toISOString(),
      ];
    });
    const csv = [header, ...rows]
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            // Quote si virgule, guillemet ou retour ligne
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `cryptoreflex-portefeuille-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [holdings, pricesById]);

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

  /* -------- Rendu ------------------------------------------------------- */

  // Avant hydratation : skeleton stable pour éviter mismatch SSR.
  if (!hydrated) {
    return <PortfolioSkeleton />;
  }

  if (holdings.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Briefcase className="h-6 w-6" aria-hidden="true" />}
          title="Tu n'as pas encore ajouté de crypto à ton portefeuille"
          description="Ajoute jusqu'à 30 positions (jeton + quantité + prix moyen d'achat) pour suivre ta valeur en temps réel et tes plus/moins-values latentes. Les données restent sur ton appareil."
        />
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="btn-primary text-sm py-2.5"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajouter une position
          </button>
        </div>

        <AddHoldingDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          currentCount={holdings.length}
        />
      </>
    );
  }

  const gainPositive = stats.gain >= 0;

  return (
    <div>
      {/* Toolbar : actions principales */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="text-sm text-muted">
          {holdings.length} position{holdings.length > 1 ? "s" : ""}
          {lastUpdateLabel && (
            <>
              {" · "}
              <span className="font-mono text-[12px]">
                MAJ {lastUpdateLabel}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fetchPrices(cgIds)}
            className="btn-ghost text-xs px-3 py-1.5 min-h-0"
            aria-label="Rafraîchir les prix maintenant"
          >
            <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Rafraîchir
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-white font-semibold text-xs px-3 py-1.5 hover:bg-primary-glow transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-0"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Stats top — 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Valeur totale"
          value={formatEur(stats.totalValue)}
          accent="primary"
        />
        <StatCard
          label="Gain / perte"
          value={`${gainPositive ? "+" : ""}${formatEur(stats.gain)}`}
          accent={gainPositive ? "green" : "rose"}
        />
        <StatCard
          label="Performance"
          value={`${gainPositive ? "+" : ""}${stats.gainPct.toFixed(2)}%`}
          accent={gainPositive ? "green" : "rose"}
        />
        <StatCard
          label="Positions"
          value={String(holdings.length)}
          subtitle={`/ 30 max`}
        />
      </div>

      {/* Allocation pie chart */}
      {slices.length > 0 && (
        <section
          aria-labelledby="allocation-heading"
          className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6"
        >
          <h2
            id="allocation-heading"
            className="text-base font-semibold text-fg flex items-center gap-2"
          >
            <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
            Répartition du portefeuille
          </h2>
          <p className="mt-1 text-xs text-muted">
            Top 5 positions individualisées, les autres regroupées dans
            «&nbsp;Autres&nbsp;».
          </p>
          <div className="mt-5">
            <PortfolioPieChart slices={slices} topN={5} size={200} />
          </div>
        </section>
      )}

      {/* Table desktop */}
      <div className="hidden md:block mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Positions du portefeuille : crypto, quantité, prix moyen d&apos;achat,
            prix actuel, valeur, gain et actions.
          </caption>
          <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="text-left px-4 py-3 font-medium">
                Crypto
              </th>
              <th scope="col" className="text-right px-4 py-3 font-medium">
                Quantité
              </th>
              <th scope="col" className="text-right px-4 py-3 font-medium">
                PRU (€)
              </th>
              <th scope="col" className="text-right px-4 py-3 font-medium">
                Prix actuel (€)
              </th>
              <th scope="col" className="text-right px-4 py-3 font-medium">
                Valeur (€)
              </th>
              <th scope="col" className="text-right px-4 py-3 font-medium">
                Gain
              </th>
              <th scope="col" className="text-right px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <HoldingRow
                key={h.id}
                holding={h}
                price={pricesById.get(h.cryptoId)}
                onRemove={handleRemove}
                onEdit={setEditTarget}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden mt-8 space-y-2">
        {holdings.map((h) => (
          <HoldingCardMobile
            key={h.id}
            holding={h}
            price={pricesById.get(h.cryptoId)}
            onRemove={handleRemove}
            onEdit={setEditTarget}
          />
        ))}
      </div>

      {/* Bas de page : export + reset */}
      <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border/60 pt-6">
        <button
          type="button"
          onClick={handleExportCsv}
          className="btn-ghost text-sm py-2 sm:py-2.5"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Exporter en CSV
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-danger/40 bg-danger/5 text-danger-fg px-4 py-2 sm:py-2.5 text-sm font-medium hover:bg-danger/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-tap"
          aria-label="Vider entièrement le portefeuille"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Vider le portefeuille
        </button>
      </div>

      {/* Dialogs (montés en permanence — gérés par open boolean) */}
      <AddHoldingDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        currentCount={holdings.length}
      />
      <EditHoldingDialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        holding={editTarget}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composants                                                           */
/* -------------------------------------------------------------------------- */

function StatCard({
  label,
  value,
  subtitle,
  accent,
}: {
  label: string;
  value: string;
  subtitle?: string;
  accent?: "primary" | "green" | "rose";
}) {
  const valueClass =
    accent === "green"
      ? "text-accent-green"
      : accent === "rose"
        ? "text-accent-rose"
        : accent === "primary"
          ? "text-primary-glow"
          : "text-fg";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className={`mt-1.5 text-xl font-bold tabular-nums ${valueClass}`}>
        {value}
      </div>
      {subtitle && (
        <div className="mt-0.5 text-[11px] text-muted font-mono">
          {subtitle}
        </div>
      )}
    </div>
  );
}

function HoldingRow({
  holding,
  price,
  onRemove,
  onEdit,
}: {
  holding: Holding;
  price: LivePrice | undefined;
  onRemove: (h: Holding) => void;
  onEdit: (h: Holding) => void;
}) {
  const cur = price?.priceEur ?? 0;
  const cost = holding.quantity * holding.avgBuyPriceEur;
  const value = holding.quantity * cur;
  const gain = value - cost;
  const pct = cost > 0 ? (gain / cost) * 100 : 0;
  const up = gain >= 0;
  const hasPrice = cur > 0;

  return (
    <tr className="border-t border-border hover:bg-elevated/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <CryptoLogo
            symbol={holding.symbol}
            coingeckoId={holding.cryptoId}
            imageUrl={price?.image}
            size={28}
          />
          <div className="min-w-0">
            <Link
              href={`/cryptos/${holding.cryptoId}`}
              className="font-semibold text-fg hover:text-primary truncate focus:outline-none focus-visible:underline rounded"
            >
              {holding.name}
            </Link>
            <div className="text-xs text-muted font-mono uppercase">
              {holding.symbol}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono text-fg/90 tabular-nums">
        {formatQty(holding.quantity)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-fg/80 tabular-nums">
        {formatEur(holding.avgBuyPriceEur)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-fg/85 tabular-nums">
        {hasPrice ? formatEur(cur) : "—"}
      </td>
      <td className="px-4 py-3 text-right font-mono font-semibold text-fg tabular-nums">
        {hasPrice ? formatEur(value) : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        {hasPrice ? (
          <span
            className={`inline-flex flex-col items-end font-mono text-xs font-semibold ${
              up ? "text-accent-green" : "text-accent-rose"
            }`}
          >
            <span className="inline-flex items-center gap-0.5">
              {up ? (
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
              )}
              {`${up ? "+" : ""}${formatEur(gain)}`}
            </span>
            <span className="text-[10px] opacity-80">
              {`${up ? "+" : ""}${pct.toFixed(2)}%`}
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(holding)}
            aria-label={`Modifier ${holding.name}`}
            title="Modifier"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 text-muted hover:text-primary-soft hover:border-primary/40 hover:bg-primary/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(holding)}
            aria-label={`Supprimer ${holding.name}`}
            title="Supprimer"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 text-muted hover:text-danger-fg hover:border-danger/40 hover:bg-danger/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function HoldingCardMobile({
  holding,
  price,
  onRemove,
  onEdit,
}: {
  holding: Holding;
  price: LivePrice | undefined;
  onRemove: (h: Holding) => void;
  onEdit: (h: Holding) => void;
}) {
  const cur = price?.priceEur ?? 0;
  const cost = holding.quantity * holding.avgBuyPriceEur;
  const value = holding.quantity * cur;
  const gain = value - cost;
  const pct = cost > 0 ? (gain / cost) * 100 : 0;
  const up = gain >= 0;
  const hasPrice = cur > 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-3">
        <CryptoLogo
          symbol={holding.symbol}
          coingeckoId={holding.cryptoId}
          imageUrl={price?.image}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/cryptos/${holding.cryptoId}`}
            className="font-semibold text-fg text-[15px] truncate block focus:outline-none focus-visible:underline rounded"
          >
            {holding.name}
          </Link>
          <div className="text-[11px] text-muted font-mono uppercase">
            {holding.symbol}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono font-semibold text-fg text-[15px] tabular-nums">
            {hasPrice ? formatEur(value) : "—"}
          </div>
          {hasPrice && (
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
              {`${up ? "+" : ""}${pct.toFixed(2)}%`}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] border-t border-border/50 pt-3">
        <div>
          <div className="text-muted uppercase tracking-wider">Qté</div>
          <div className="font-mono text-fg/90 mt-0.5 truncate">
            {formatQty(holding.quantity)}
          </div>
        </div>
        <div>
          <div className="text-muted uppercase tracking-wider">PRU</div>
          <div className="font-mono text-fg/80 mt-0.5 truncate">
            {formatEur(holding.avgBuyPriceEur)}
          </div>
        </div>
        <div>
          <div className="text-muted uppercase tracking-wider">Actuel</div>
          <div className="font-mono text-fg/85 mt-0.5 truncate">
            {hasPrice ? formatEur(cur) : "—"}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onEdit(holding)}
          aria-label={`Modifier ${holding.name}`}
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border/60 text-muted hover:text-primary-soft hover:border-primary/40 hover:bg-primary/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Pencil className="h-3 w-3" aria-hidden="true" />
          Modifier
        </button>
        <button
          type="button"
          onClick={() => onRemove(holding)}
          aria-label={`Supprimer ${holding.name}`}
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border/60 text-muted hover:text-danger-fg hover:border-danger/40 hover:bg-danger/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          <Trash2 className="h-3 w-3" aria-hidden="true" />
          Suppr
        </button>
      </div>
    </div>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="h-4 w-40 skeleton" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4">
            <div className="h-3 w-20 skeleton" />
            <div className="h-6 w-24 skeleton mt-3" />
          </div>
        ))}
      </div>
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

/* -------------------------------------------------------------------------- */
/*  Helpers de formatage                                                      */
/* -------------------------------------------------------------------------- */

function formatEur(value: number): string {
  if (!Number.isFinite(value) || value === 0) {
    return value === 0 ? "0 €" : "—";
  }
  const abs = Math.abs(value);
  const fractionDigits = abs >= 1000 ? 0 : abs >= 1 ? 2 : 4;
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits === 0 ? 0 : Math.min(2, fractionDigits),
  });
}

function formatQty(value: number): string {
  if (!Number.isFinite(value)) return "—";
  // Auto-précision : grosses positions sans décimales, micro positions avec 6
  if (value >= 100) return value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString("fr-FR", { maximumFractionDigits: 4 });
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 6 });
}
