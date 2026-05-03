"use client";

/**
 * <PortfolioTracker /> — Portfolio Tracker LITE (Pilier 5).
 *
 * Page : /outils/portfolio-tracker.
 *
 * Fonctionnement :
 *  - Sélection crypto via autocomplete (top 100 CoinGecko).
 *  - Saisie quantité, ajout en localStorage (zéro backend).
 *  - Refresh prix toutes les 60 s via /coins/markets?vs_currency=eur&ids=...
 *  - Tableau live avec valeur €, part %, variation 24 h colorée.
 *  - Boutons : Réinitialiser, Exporter CSV.
 *  - Empty state si aucune entrée.
 *
 * Sécurité : composant 100 % Client, lazy-loadé via dynamic({ ssr: false }).
 *           localStorage isolé navigateur — aucune donnée envoyée serveur.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Plus,
  RefreshCw,
  Download,
  Trash2,
  Wallet,
  Info,
} from "lucide-react";

import {
  addEntry,
  clearPortfolio,
  getPortfolio,
  removeEntry,
} from "@/lib/portfolio-storage";
import type {
  PortfolioEntry,
  PortfolioSummary,
  PortfolioWithPrices,
} from "@/lib/portfolio-types";
import { downloadPortfolioCsv } from "@/lib/csv-exporter";

import CryptoAutocomplete, {
  type CoinSuggestion,
} from "@/components/portfolio/CryptoAutocomplete";
import PortfolioRow from "@/components/portfolio/PortfolioRow";
import PortfolioTotals from "@/components/portfolio/PortfolioTotals";

const REFRESH_INTERVAL_MS = 60_000; // 60 s
const COINGECKO_VS = "eur";

interface LivePrice {
  price: number;
  change24h: number;
  fetchedAt: number;
}

/** Fetch live prices EUR pour un set d'IDs.
 *  BATCH 51e — Migration : passe par notre endpoint /api/portfolio-prices
 *  (lui-meme migre vers price-source aggregator gratuit illimite) au lieu
 *  d'appeler CoinGecko directement depuis le browser. Avantages :
 *  - Plus de hit CoinGecko depuis le client (consume IP rate limit user)
 *  - Cache server partage entre tous les users
 *  - Notre fallback Binance/CoinCap automatique
 *  - Coherence : un seul point de sortie prix dans toute l'app
 */
async function fetchLivePrices(
  ids: string[]
): Promise<Record<string, LivePrice>> {
  if (ids.length === 0) return {};
  try {
    const res = await fetch(`/api/portfolio-prices?ids=${ids.join(",")}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`portfolio-prices ${res.status}`);
    const json = (await res.json()) as { prices: Array<{ id: string; priceEur: number; change24hPct: number }> };
    const out: Record<string, LivePrice> = {};
    const now = Date.now();
    for (const c of json.prices) {
      out[c.id] = {
        price: c.priceEur,
        change24h: c.change24hPct,
        fetchedAt: now,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export default function PortfolioTracker() {
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const [pendingCoin, setPendingCoin] = useState<CoinSuggestion | null>(null);
  const [pendingQty, setPendingQty] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Hydratation initiale depuis localStorage. ----
  useEffect(() => {
    setEntries(getPortfolio());
    setHydrated(true);
  }, []);

  // ---- Refresh prix : au mount + toutes les 60 s + sur changement d'entries. ----
  const refresh = useCallback(async () => {
    const ids = Array.from(new Set(entries.map((e) => e.cryptoId))).filter(
      Boolean
    );
    if (ids.length === 0) {
      setPrices({});
      return;
    }
    setRefreshing(true);
    const next = await fetchLivePrices(ids);
    // Merge avec ancien cache pour ne pas perdre les ids non rafraîchis (rate limit).
    setPrices((prev) => ({ ...prev, ...next }));
    setRefreshing(false);
  }, [entries]);

  useEffect(() => {
    if (!hydrated) return;
    refresh();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hydrated, refresh]);

  // ---- Enrichissement entries + prix. ----
  const enriched: PortfolioWithPrices[] = useMemo(() => {
    return entries.map((entry) => {
      const live = prices[entry.cryptoId];
      const currentPrice = live ? live.price : null;
      const value = live ? live.price * entry.quantity : 0;
      const change24h = live ? live.change24h : null;
      const stale =
        live ? Date.now() - live.fetchedAt > REFRESH_INTERVAL_MS * 3 : false;
      return { entry, currentPrice, value, change24h, stale };
    });
  }, [entries, prices]);

  // ---- Summary global pondéré. ----
  const summary: PortfolioSummary = useMemo(() => {
    const totalValue = enriched.reduce((sum, r) => sum + r.value, 0);
    let totalChangeEur = 0;
    for (const r of enriched) {
      if (r.change24h === null) continue;
      // Valeur il y a 24 h ≈ value / (1 + change/100) ; var € = value - value-24h
      const yesterdayValue = r.value / (1 + r.change24h / 100);
      totalChangeEur += r.value - yesterdayValue;
    }
    const totalChange24hPct =
      totalValue > 0 ? (totalChangeEur / (totalValue - totalChangeEur)) * 100 : 0;
    return {
      totalValue,
      totalChange24hEur: totalChangeEur,
      totalChange24hPct: Number.isFinite(totalChange24hPct)
        ? totalChange24hPct
        : 0,
      positionsCount: entries.length,
    };
  }, [enriched, entries.length]);

  // ---- Handlers. ----
  const handleAdd = useCallback(() => {
    if (!pendingCoin) return;
    const qty = parseFloat(pendingQty.replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0) return;
    const created = addEntry({
      cryptoId: pendingCoin.id,
      cryptoSymbol: pendingCoin.symbol,
      cryptoName: pendingCoin.name,
      cryptoImage: pendingCoin.image,
      quantity: qty,
    });
    setEntries((prev) => [...prev, created]);
    // Prix optimistic depuis la suggestion (CoinGecko renvoie EUR si on a pull en EUR).
    if (pendingCoin.current_price) {
      setPrices((prev) => ({
        ...prev,
        [pendingCoin.id]: {
          price: pendingCoin.current_price,
          change24h: 0,
          fetchedAt: Date.now(),
        },
      }));
    }
    setPendingCoin(null);
    setPendingQty("");
  }, [pendingCoin, pendingQty]);

  const handleRemove = useCallback((id: string) => {
    removeEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleClear = useCallback(() => {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        "Réinitialiser le portefeuille ?\nCette action supprimera toutes les positions enregistrées dans ce navigateur."
      );
      if (!ok) return;
    }
    clearPortfolio();
    setEntries([]);
    setPrices({});
  }, []);

  const handleExport = useCallback(() => {
    if (enriched.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    downloadPortfolioCsv(enriched, `cryptoreflex-portfolio-${today}.csv`);
  }, [enriched]);

  const canAdd =
    Boolean(pendingCoin) &&
    pendingQty.trim() !== "" &&
    parseFloat(pendingQty.replace(",", ".")) > 0;

  // ---- Render. ----
  // Évite l'hydration mismatch : tant que !hydrated, on rend un skeleton.
  if (!hydrated) {
    return (
      <div
        className="h-[400px] animate-pulse rounded-2xl bg-elevated/40"
        aria-label="Chargement du portfolio"
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Bloc ajout */}
      <div className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow">
            <Plus className="h-5 w-5 text-background" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-fg">Ajouter une crypto</h2>
            <p className="text-xs text-muted">
              Top 100 par capitalisation, prix live CoinGecko (EUR).
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Crypto
            </label>
            <CryptoAutocomplete
              value={pendingCoin}
              onChange={setPendingCoin}
              vsCurrency="eur"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Quantité
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.0001"
              min="0"
              value={pendingQty}
              onChange={(e) => setPendingQty(e.target.value)}
              placeholder="0.5"
              className="w-full sm:w-32 rounded-xl bg-elevated border border-border px-3 py-2.5 text-fg tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-background hover:bg-primary-glow disabled:bg-elevated disabled:text-muted disabled:cursor-not-allowed px-5 py-2.5 text-sm font-bold transition h-[44px]"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Empty state OU tableau */}
      {entries.length === 0 ? (
        <div className="glass rounded-2xl py-12 px-6 text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary-soft border border-primary/20">
            <Wallet className="h-7 w-7" aria-hidden="true" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-fg">
            Ajoute ta première crypto
          </h3>
          <p className="mt-2 max-w-md mx-auto text-sm text-muted">
            Sélectionne une crypto et indique la quantité que tu détiens.
            Tes données restent dans ton navigateur — Cryptoreflex ne stocke
            rien côté serveur.
          </p>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted">
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  refreshing ? "animate-spin text-primary-soft" : ""
                }`}
              />
              {refreshing
                ? "Actualisation des prix..."
                : "Prix actualisés toutes les 60 s"}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={refresh}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-elevated hover:bg-surface text-fg border border-border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Actualiser
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 rounded-lg bg-elevated hover:bg-surface text-fg border border-border px-3 py-1.5 text-xs font-semibold transition"
              >
                <Download className="h-3.5 w-3.5" />
                Exporter CSV
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 rounded-lg bg-danger/10 hover:bg-danger/20 text-danger-fg border border-danger/30 px-3 py-1.5 text-xs font-semibold transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Réinitialiser
              </button>
            </div>
          </div>

          {/* Tableau */}
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-elevated text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="text-left px-3 sm:px-4 py-3">
                      Crypto
                    </th>
                    <th scope="col" className="text-right px-3 sm:px-4 py-3">
                      Quantité
                    </th>
                    <th scope="col" className="text-right px-3 sm:px-4 py-3">
                      Prix
                    </th>
                    <th scope="col" className="text-right px-3 sm:px-4 py-3">
                      Valeur
                    </th>
                    <th
                      scope="col"
                      className="text-right px-3 sm:px-4 py-3 hidden md:table-cell"
                    >
                      Part %
                    </th>
                    <th scope="col" className="text-right px-3 sm:px-4 py-3">
                      24 h
                    </th>
                    <th scope="col" className="px-2 sm:px-4 py-3 sr-only">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface/40">
                  {enriched.map((row) => (
                    <PortfolioRow
                      key={row.entry.id}
                      row={row}
                      totalValue={summary.totalValue}
                      onRemove={handleRemove}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totaux */}
          <PortfolioTotals summary={summary} />
        </>
      )}

      {/* Note vie privée */}
      <div className="rounded-2xl border border-info/30 bg-info/5 p-5 flex items-start gap-3">
        <Info className="h-5 w-5 text-info-fg mt-0.5 shrink-0" />
        <p className="text-sm text-fg leading-relaxed">
          <strong>100 % local :</strong> tes positions sont stockées
          uniquement dans le localStorage de ce navigateur. Aucune donnée
          n'est envoyée à Cryptoreflex ni à un tiers (hormis les requêtes
          publiques CoinGecko pour les prix).
        </p>
      </div>
    </div>
  );
}
