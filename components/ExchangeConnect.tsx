"use client";

/**
 * <ExchangeConnect /> — UI pour connecter Binance en read-only et sync les
 * balances vers le portfolio local localStorage.
 *
 * Étude #4 ETUDE-AMELIORATIONS-2026-05-02 — V1 Binance.
 *
 * UX flow :
 *  1. Si user pas connecté → encart "Connecte-toi pour activer"
 *  2. Si pas de connexion Binance → bouton "Connecter Binance" + form (api key + secret)
 *  3. Si connexion existe → affiche statut (last sync) + boutons "Re-sync" + "Déconnecter"
 *  4. Au sync OK → import auto les balances dans le portfolio localStorage
 *     (via lib/portfolio.ts addHolding)
 *
 * SÉCURITÉ UI :
 *  - Form avec instructions visuelles claires (recap permissions Binance attendues)
 *  - Lien direct vers la doc Binance "Comment créer une clé read-only"
 *  - Avertissement gras "ne jamais cocher Withdrawals/Trading"
 *  - Le secret est masqué (input type=password) avec toggle show/hide
 *  - Aucune API key n'est jamais loggée côté client (pas de console.log volontaire)
 */

import { useCallback, useEffect, useState } from "react";
import {
  Plug,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { addHolding, getHoldings, type Holding } from "@/lib/portfolio";
import { ALL_CRYPTOS } from "@/lib/programmatic";

interface Connection {
  provider: string;
  label: string | null;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  consecutiveFailures: number | null;
}

interface SyncBalance {
  symbol: string;
  coingeckoId: string | null;
  total: number;
  free: number;
  locked: number;
}

export default function ExchangeConnect() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [cryptoConfigured, setCryptoConfigured] = useState(true);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncedBalances, setSyncedBalances] = useState<SyncBalance[] | null>(
    null,
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/exchanges/status", {
        credentials: "include",
      });
      if (res.status === 401) {
        setAuthenticated(false);
        setConnections([]);
        return;
      }
      const data = await res.json();
      setAuthenticated(true);
      setConnections(data.connections ?? []);
      setCryptoConfigured(Boolean(data.cryptoConfigured));
    } catch {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const binanceConn = connections.find((c) => c.provider === "binance");

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/exchanges/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          provider: "binance",
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Erreur de connexion.");
        return;
      }
      setSuccess("Clé Binance enregistrée et vérifiée read-only.");
      setApiKey("");
      setApiSecret("");
      setShowForm(false);
      await refresh();
      // Auto-sync immédiat après connexion
      await handleSync();
    } catch {
      setError("Erreur réseau. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = useCallback(async () => {
    setError(null);
    setSyncing(true);
    setSyncedBalances(null);
    try {
      const res = await fetch("/api/exchanges/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider: "binance" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Sync échouée.");
        return;
      }
      const balances = (data.balances ?? []) as SyncBalance[];
      setSyncedBalances(balances);

      // Import auto dans portfolio local : on ajoute UNIQUEMENT les balances
      // mappées (coingeckoId non-null) ET non déjà présentes (anti doublon).
      const existing = new Set(getHoldings().map((h) => h.cryptoId));
      let added = 0;
      for (const b of balances) {
        if (!b.coingeckoId) continue;
        if (existing.has(b.coingeckoId)) continue;
        const meta = ALL_CRYPTOS.find((c) => c.coingeckoId === b.coingeckoId);
        if (!meta) continue;
        const created = addHolding(
          {
            cryptoId: b.coingeckoId,
            symbol: meta.symbol,
            name: meta.name,
            quantity: b.total,
            // PRU inconnu (l'API Binance /account ne donne pas le coût d'acquisition).
            // On laisse à 0 — l'user pourra l'éditer après import. Mieux que rien.
            avgBuyPriceEur: 0,
          },
          500, // limite Pro permissive (l'user peut importer son portfolio entier)
        );
        if (created) added += 1;
      }
      setSuccess(
        added > 0
          ? `${added} position${added > 1 ? "s" : ""} importée${added > 1 ? "s" : ""} dans ton portfolio.`
          : "Sync OK — aucune nouvelle position à importer (déjà à jour).",
      );
      await refresh();
    } catch {
      setError("Erreur réseau pendant la sync.");
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  const handleDisconnect = async () => {
    if (
      !window.confirm(
        "Déconnecter Binance ? Tes positions importées dans le portfolio restent (rien n'est supprimé). La clé chiffrée est effacée.",
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/exchanges/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider: "binance" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Erreur déconnexion.");
        return;
      }
      setSuccess("Binance déconnecté. Clés chiffrées effacées.");
      setSyncedBalances(null);
      await refresh();
    } catch {
      setError("Erreur réseau.");
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-6 animate-pulse">
        <div className="h-6 w-48 bg-elevated rounded mb-4" />
        <div className="h-20 bg-elevated rounded" />
      </section>
    );
  }

  if (!authenticated) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start gap-3">
          <Plug className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-fg text-sm">
              Connecte ton compte Binance (read-only)
            </h3>
            <p className="mt-1 text-xs text-fg/65 leading-relaxed">
              Connecte-toi à Cryptoreflex pour activer l&apos;import auto de tes
              balances Binance. Aucun CSV à uploader, sync 1-clic.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!cryptoConfigured) {
    return (
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-fg text-sm">
              Service indisponible temporairement
            </h3>
            <p className="mt-1 text-xs text-fg/65 leading-relaxed">
              La connexion exchange n&apos;est pas configurée côté serveur. Reviens plus tard.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h3 className="font-bold text-fg text-base flex items-center gap-2">
          <Plug className="h-4 w-4 text-primary" />
          Sync exchange (read-only)
        </h3>
        <span className="text-[10px] uppercase tracking-wider rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-300 px-2 py-0.5">
          Bêta · Binance
        </span>
      </div>

      {/* Erreurs / succès */}
      {error && (
        <div className="mb-3 rounded-xl border border-accent-rose/30 bg-accent-rose/5 p-3 flex items-start gap-2 text-xs text-accent-rose">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-start gap-2 text-xs text-emerald-200">
          <Check className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{success}</span>
        </div>
      )}

      {/* État connecté → status + actions */}
      {binanceConn ? (
        <div>
          <div className="rounded-xl border border-border/60 bg-elevated/30 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-fg text-sm">Binance</span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 ${
                      binanceConn.lastSyncStatus === "ok"
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        : binanceConn.lastSyncStatus === "error"
                          ? "bg-accent-rose/15 text-accent-rose border border-accent-rose/30"
                          : "bg-elevated text-muted border border-border"
                    }`}
                  >
                    {binanceConn.lastSyncStatus === "ok"
                      ? "Synced"
                      : binanceConn.lastSyncStatus === "error"
                        ? "Erreur"
                        : "En attente"}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted">
                  {binanceConn.lastSyncedAt
                    ? `Dernière sync : ${new Date(binanceConn.lastSyncedAt).toLocaleString("fr-FR")}`
                    : "Jamais sync"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-background hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {syncing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Re-sync
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-elevated/40 px-3 py-1.5 text-xs font-semibold text-fg/70 hover:text-accent-rose hover:border-accent-rose/40 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Déconnecter
                </button>
              </div>
            </div>
          </div>

          {/* Tableau balances synced (si sync vient d'être fait) */}
          {syncedBalances && syncedBalances.length > 0 && (
            <div className="mt-4 rounded-xl border border-border/60 bg-elevated/20 p-3 max-h-72 overflow-y-auto">
              <div className="text-[11px] uppercase tracking-wider text-muted mb-2">
                Balances détectées (top 10)
              </div>
              <ul className="space-y-1.5 text-xs">
                {syncedBalances.slice(0, 10).map((b) => (
                  <li
                    key={b.symbol}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="font-mono font-bold text-fg">
                      {b.symbol}
                    </span>
                    <span className="font-mono text-fg/70 tabular-nums">
                      {b.total.toFixed(8)}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 ${
                        b.coingeckoId
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-elevated text-muted"
                      }`}
                    >
                      {b.coingeckoId ? "importé" : "non mappé"}
                    </span>
                  </li>
                ))}
              </ul>
              {syncedBalances.length > 10 && (
                <p className="mt-2 text-[10px] text-muted text-center">
                  + {syncedBalances.length - 10} autres balances
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        // État pas connecté → bouton "Connecter" + form (toggleable)
        <div>
          {!showForm ? (
            <div>
              <p className="text-xs text-fg/70 leading-relaxed mb-3">
                Importe automatiquement tes balances Binance dans ton portfolio
                Cryptoreflex. <strong>Aucune transaction</strong> n&apos;est
                possible : on accepte uniquement les clés{" "}
                <strong className="text-emerald-300">READ-ONLY</strong> (vérifié
                au moment de la connexion).
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowForm(true);
                  setError(null);
                  setSuccess(null);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-background hover:bg-primary/90 transition-colors"
              >
                <Plug className="h-4 w-4" />
                Connecter Binance
              </button>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90 leading-relaxed">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <strong className="text-amber-300">
                      Crée une clé READ-ONLY uniquement
                    </strong>{" "}
                    sur Binance → Account → API Management.
                    <br />
                    Coche{" "}
                    <strong className="text-emerald-300">
                      Enable Reading
                    </strong>
                    . NE PAS cocher : Spot Trading, Withdrawals, Margin,
                    Futures.
                    <br />
                    <a
                      href="https://www.binance.com/en/support/faq/how-to-create-api-keys-on-binance-360002502072"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 underline hover:text-amber-100"
                    >
                      Doc officielle Binance
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="binance-api-key"
                  className="text-xs font-semibold text-fg/85 mb-1.5 block"
                >
                  API Key
                </label>
                <input
                  id="binance-api-key"
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                  minLength={32}
                  maxLength={256}
                  autoComplete="off"
                  className="w-full rounded-lg border border-border bg-elevated/40 px-3 py-2 text-sm font-mono text-fg placeholder:text-muted focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="64 chars hex"
                />
              </div>

              <div>
                <label
                  htmlFor="binance-api-secret"
                  className="text-xs font-semibold text-fg/85 mb-1.5 block"
                >
                  API Secret
                </label>
                <div className="relative">
                  <input
                    id="binance-api-secret"
                    type={showSecret ? "text" : "password"}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    required
                    minLength={32}
                    maxLength={256}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-border bg-elevated/40 px-3 py-2 pr-10 text-sm font-mono text-fg placeholder:text-muted focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="64 chars hex"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    aria-label={
                      showSecret ? "Masquer le secret" : "Afficher le secret"
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-fg"
                  >
                    {showSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={
                    submitting || apiKey.length < 32 || apiSecret.length < 32
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-background hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Vérification...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Connecter
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setApiKey("");
                    setApiSecret("");
                    setError(null);
                  }}
                  disabled={submitting}
                  className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-fg/70 hover:text-fg transition-colors"
                >
                  Annuler
                </button>
              </div>

              <p className="text-[11px] text-muted leading-relaxed">
                Tes clés sont chiffrées AES-256-GCM côté serveur (clé maître non
                exposée). Ce site ne stockera JAMAIS de clé avec permission de
                trading ou retrait — la connexion est rejetée si tu cochés
                d&apos;autres permissions.
              </p>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
