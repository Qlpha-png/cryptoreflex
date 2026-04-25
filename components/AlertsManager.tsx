"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Loader2,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

/**
 * Type minimal des cryptos sélectionnables — dénormalisé côté serveur dans
 * `app/alertes/page.tsx` pour éviter d'envoyer tout le détail éditorial.
 */
export interface AlertCryptoOption {
  id: string;
  coingeckoId: string;
  name: string;
  symbol: string;
}

interface PriceAlert {
  id: string;
  email: string;
  cryptoId: string;
  symbol: string;
  condition: "above" | "below";
  threshold: number;
  currency: "eur" | "usd";
  createdAt: number;
  lastTriggered?: number;
  status: "active" | "triggered" | "paused";
}

const EMAIL_LS_KEY = "cr:alerts:email:v1";

/* -------------------------------------------------------------------------- */
/*  Helpers UI                                                                */
/* -------------------------------------------------------------------------- */

function formatPrice(value: number, currency: "eur" | "usd"): string {
  const sym = currency === "eur" ? "€" : "$";
  if (!Number.isFinite(value) || value <= 0) return `0 ${sym}`;
  let digits = 2;
  if (value < 0.01) digits = 6;
  else if (value < 1) digits = 4;
  else if (value < 100) digits = 2;
  else digits = 0;
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${sym}`;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

interface Props {
  cryptos: AlertCryptoOption[];
}

export default function AlertsManager({ cryptos }: Props) {
  const searchParams = useSearchParams();

  const [hydrated, setHydrated] = useState(false);
  const [email, setEmail] = useState("");
  const [cryptoQuery, setCryptoQuery] = useState("");
  const [selectedCryptoId, setSelectedCryptoId] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [threshold, setThreshold] = useState<string>("");
  const [currency, setCurrency] = useState<"eur" | "usd">("eur");

  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitMsg, setSubmitMsg] = useState<string>("");

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [listState, setListState] = useState<"idle" | "loading" | "empty" | "ready" | "error">("idle");
  const [listError, setListError] = useState<string>("");

  const cryptoInputRef = useRef<HTMLInputElement | null>(null);

  /* --------- Hydration : restore email + pre-fill from query string --------- */
  useEffect(() => {
    setHydrated(true);

    // 1) Email persisté
    try {
      const stored = window.localStorage.getItem(EMAIL_LS_KEY);
      if (stored && EMAIL_REGEX.test(stored)) setEmail(stored);
    } catch {
      /* localStorage indispo (Safari privé) — silencieux */
    }

    // 2) Pré-remplissage depuis ?cryptoId=... ou ?email=...
    const qpCrypto = searchParams?.get("cryptoId");
    if (qpCrypto) {
      const match = cryptos.find(
        (c) =>
          c.id === qpCrypto ||
          c.coingeckoId === qpCrypto ||
          c.symbol.toLowerCase() === qpCrypto.toLowerCase(),
      );
      if (match) {
        setSelectedCryptoId(match.coingeckoId);
        setCryptoQuery(`${match.name} (${match.symbol})`);
      }
    }
    const qpEmail = searchParams?.get("email");
    if (qpEmail && EMAIL_REGEX.test(qpEmail)) setEmail(qpEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------- Fetch alertes existantes pour l'email courant ----------------- */
  const fetchAlerts = useCallback(async (mail: string) => {
    if (!EMAIL_REGEX.test(mail)) {
      setAlerts([]);
      setListState("idle");
      return;
    }
    setListState("loading");
    setListError("");
    try {
      const res = await fetch(
        `/api/alerts/by-email?email=${encodeURIComponent(mail)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { ok: boolean; alerts: PriceAlert[] };
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      setListState((data.alerts?.length ?? 0) > 0 ? "ready" : "empty");
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Erreur réseau");
      setListState("error");
    }
  }, []);

  // Refetch quand l'email valide change (debounce 400 ms)
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      if (EMAIL_REGEX.test(email)) {
        try {
          window.localStorage.setItem(EMAIL_LS_KEY, email);
        } catch {
          /* noop */
        }
        fetchAlerts(email);
      } else {
        setAlerts([]);
        setListState("idle");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [email, hydrated, fetchAlerts]);

  /* --------- Filtrage suggestions crypto ---------------------------------- */
  const filteredCryptos = useMemo(() => {
    const q = cryptoQuery.trim().toLowerCase();
    if (!q) return cryptos.slice(0, 8);
    return cryptos
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q) ||
          c.coingeckoId.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [cryptoQuery, cryptos]);

  /* --------- Handlers ----------------------------------------------------- */

  function selectCrypto(c: AlertCryptoOption) {
    setSelectedCryptoId(c.coingeckoId);
    setCryptoQuery(`${c.name} (${c.symbol})`);
    setShowSuggestions(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitMsg("");
    setSubmitState("idle");

    // Validation client
    if (!selectedCryptoId) {
      setSubmitState("error");
      setSubmitMsg("Sélectionne une crypto dans la liste.");
      return;
    }
    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setSubmitState("error");
      setSubmitMsg("Adresse email invalide.");
      return;
    }
    const cleanedThreshold = threshold.replace(/\s/g, "").replace(",", ".");
    const num = Number(cleanedThreshold);
    if (!Number.isFinite(num) || num <= 0) {
      setSubmitState("error");
      setSubmitMsg("Seuil invalide. Saisis un nombre positif.");
      return;
    }

    setSubmitState("loading");
    try {
      const res = await fetch("/api/alerts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          cryptoId: selectedCryptoId,
          condition,
          threshold: num,
          currency,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setSubmitState("error");
        setSubmitMsg(data.error || "Création impossible. Réessaie.");
        return;
      }
      setSubmitState("success");
      setSubmitMsg("Alerte créée. Tu recevras un email quand le seuil sera atteint.");
      setThreshold("");
      // Refresh la liste
      fetchAlerts(trimmedEmail);
    } catch (err) {
      setSubmitState("error");
      setSubmitMsg(err instanceof Error ? err.message : "Erreur réseau");
    }
  }

  async function handleDelete(target: PriceAlert) {
    const confirmed = window.confirm(
      `Supprimer l'alerte ${target.symbol} ${target.condition === "above" ? "≥" : "≤"} ${formatPrice(target.threshold, target.currency)} ?`,
    );
    if (!confirmed) return;
    try {
      // Same-origin : pas besoin de token (le serveur fait le check Origin).
      // Le token signé est réservé au lien one-click depuis l'email.
      const res = await fetch(`/api/alerts/${encodeURIComponent(target.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAlerts((prev) => prev.filter((a) => a.id !== target.id));
    } catch (err) {
      window.alert(
        `Suppression impossible : ${err instanceof Error ? err.message : "erreur"}`,
      );
    }
  }

  const stats = useMemo(() => {
    const active = alerts.filter((a) => a.status === "active").length;
    return { total: alerts.length, active };
  }, [alerts]);

  const fillIndicator =
    selectedCryptoId && Number(threshold) > 0 && EMAIL_REGEX.test(email);

  /* --------- Render ------------------------------------------------------- */

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      {/* ============== FORM ============== */}
      <section
        aria-labelledby="alerts-form-title"
        className="rounded-2xl border border-border bg-surface p-6 sm:p-8"
      >
        <header className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 id="alerts-form-title" className="text-xl font-bold text-fg">
            Créer une alerte
          </h2>
        </header>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          {/* Crypto autocomplete */}
          <div>
            <label htmlFor="alert-crypto" className="block text-sm font-medium text-fg/85 mb-1.5">
              Crypto à surveiller
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
                aria-hidden="true"
              />
              <input
                ref={cryptoInputRef}
                id="alert-crypto"
                type="text"
                role="combobox"
                aria-expanded={showSuggestions}
                aria-controls="alert-crypto-listbox"
                aria-autocomplete="list"
                autoComplete="off"
                placeholder="Bitcoin, Ethereum, Solana…"
                value={cryptoQuery}
                onChange={(e) => {
                  setCryptoQuery(e.target.value);
                  setSelectedCryptoId("");
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Délai pour laisser passer le clic sur la suggestion
                  setTimeout(() => setShowSuggestions(false), 150);
                }}
                className="w-full rounded-xl bg-background border border-border pl-9 pr-4 py-2.5 text-sm text-fg
                           placeholder:text-muted focus:outline-none focus:border-primary/60
                           focus:ring-2 focus:ring-primary/30"
              />
              {showSuggestions && filteredCryptos.length > 0 && (
                <ul
                  id="alert-crypto-listbox"
                  role="listbox"
                  className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-border bg-elevated shadow-lg"
                >
                  {filteredCryptos.map((c) => (
                    <li key={c.coingeckoId} role="option" aria-selected={selectedCryptoId === c.coingeckoId}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectCrypto(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 flex items-center justify-between gap-3"
                      >
                        <span className="font-medium text-fg">{c.name}</span>
                        <span className="font-mono text-xs text-muted">{c.symbol}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Condition radio */}
          <fieldset>
            <legend className="block text-sm font-medium text-fg/85 mb-1.5">
              Condition de déclenchement
            </legend>
            <div role="radiogroup" className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                  condition === "above"
                    ? "border-accent-green/50 bg-accent-green/5 text-fg"
                    : "border-border text-fg/70 hover:border-border/80"
                }`}
              >
                <input
                  type="radio"
                  name="condition"
                  value="above"
                  checked={condition === "above"}
                  onChange={() => setCondition("above")}
                  className="sr-only"
                />
                <TrendingUp className="h-4 w-4 text-accent-green" aria-hidden="true" />
                Monte au-dessus de
              </label>
              <label
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                  condition === "below"
                    ? "border-accent-rose/50 bg-accent-rose/5 text-fg"
                    : "border-border text-fg/70 hover:border-border/80"
                }`}
              >
                <input
                  type="radio"
                  name="condition"
                  value="below"
                  checked={condition === "below"}
                  onChange={() => setCondition("below")}
                  className="sr-only"
                />
                <TrendingDown className="h-4 w-4 text-accent-rose" aria-hidden="true" />
                Descend en-dessous de
              </label>
            </div>
          </fieldset>

          {/* Threshold + currency */}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div>
              <label htmlFor="alert-threshold" className="block text-sm font-medium text-fg/85 mb-1.5">
                Seuil
              </label>
              <input
                id="alert-threshold"
                type="text"
                inputMode="decimal"
                placeholder="50000"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                aria-describedby="alert-threshold-hint"
                className="w-full rounded-xl bg-background border border-border px-3 py-2.5 text-sm text-fg
                           font-mono tabular-nums placeholder:text-muted focus:outline-none focus:border-primary/60
                           focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label htmlFor="alert-currency" className="block text-sm font-medium text-fg/85 mb-1.5">
                Devise
              </label>
              <select
                id="alert-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value === "usd" ? "usd" : "eur")}
                className="rounded-xl bg-background border border-border px-3 py-2.5 text-sm text-fg
                           focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
              >
                <option value="eur">EUR</option>
                <option value="usd">USD</option>
              </select>
            </div>
          </div>
          <p id="alert-threshold-hint" className="text-xs text-muted -mt-3">
            Sépare les milliers par espace ou virgule (ex : 50 000 ou 50,5).
          </p>

          {/* Email */}
          <div>
            <label htmlFor="alert-email" className="block text-sm font-medium text-fg/85 mb-1.5">
              Ton adresse email
            </label>
            <input
              id="alert-email"
              type="email"
              autoComplete="email"
              required
              placeholder="prenom@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (submitState === "error") setSubmitState("idle");
              }}
              className="w-full rounded-xl bg-background border border-border px-3 py-2.5 text-sm text-fg
                         placeholder:text-muted focus:outline-none focus:border-primary/60
                         focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Submit + feedback */}
          <div>
            <button
              type="submit"
              disabled={submitState === "loading" || !fillIndicator}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl
                         bg-primary px-5 py-2.5 text-sm font-semibold text-white
                         hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                         focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {submitState === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Création…
                </>
              ) : (
                <>
                  Créer l'alerte
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>

            <div role="status" aria-live="polite" className="mt-3 min-h-[1.5rem]">
              {submitState === "success" && (
                <p className="inline-flex items-center gap-2 text-sm text-accent-green">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {submitMsg}
                </p>
              )}
              {submitState === "error" && (
                <p className="inline-flex items-center gap-2 text-sm text-accent-rose">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {submitMsg}
                </p>
              )}
            </div>
          </div>
        </form>

        <p className="mt-4 text-xs text-muted">
          En créant une alerte, tu acceptes que ton email soit conservé uniquement pour
          l'envoi de cette notification. <a href="/confidentialite" className="underline">Voir la politique de confidentialité</a>.
        </p>
      </section>

      {/* ============== LISTE ============== */}
      <section
        aria-labelledby="alerts-list-title"
        className="rounded-2xl border border-border bg-surface p-6 sm:p-8"
      >
        <header className="flex items-center justify-between gap-4">
          <h2 id="alerts-list-title" className="text-xl font-bold text-fg">
            Mes alertes
          </h2>
          {stats.total > 0 && (
            <span className="text-xs text-muted">
              {stats.active} active{stats.active > 1 ? "s" : ""} / {stats.total}
            </span>
          )}
        </header>

        {!hydrated ? (
          <div className="mt-6">
            <Skeleton />
          </div>
        ) : !email || !EMAIL_REGEX.test(email) ? (
          <p className="mt-6 text-sm text-muted">
            Saisis ton email dans le formulaire pour voir tes alertes.
          </p>
        ) : listState === "loading" ? (
          <div className="mt-6">
            <Skeleton />
          </div>
        ) : listState === "error" ? (
          <p
            role="alert"
            className="mt-6 inline-flex items-center gap-2 text-sm text-accent-rose"
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            Impossible de charger tes alertes ({listError}).
          </p>
        ) : alerts.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              compact
              title="Aucune alerte pour cet email"
              description="Crée ta première alerte avec le formulaire à gauche."
              icon={<Bell className="h-5 w-5" aria-hidden="true" />}
            />
          </div>
        ) : (
          <ul className="mt-6 space-y-2.5">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-border bg-background p-4 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-fg">{a.symbol}</span>
                    {a.status === "active" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-green/10 border border-accent-green/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent-green">
                        Active
                      </span>
                    ) : a.status === "triggered" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">
                        Déclenchée
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted/10 border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                        En pause
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-fg/85">
                    {a.condition === "above" ? (
                      <TrendingUp className="inline h-3.5 w-3.5 text-accent-green mr-1" aria-hidden="true" />
                    ) : (
                      <TrendingDown className="inline h-3.5 w-3.5 text-accent-rose mr-1" aria-hidden="true" />
                    )}
                    {a.condition === "above" ? "≥" : "≤"}{" "}
                    <span className="font-mono tabular-nums font-semibold">
                      {formatPrice(a.threshold, a.currency)}
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    Créée {formatRelativeTime(a.createdAt)}
                    {a.lastTriggered ? ` · déclenchée ${formatRelativeTime(a.lastTriggered)}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(a)}
                  aria-label={`Supprimer l'alerte ${a.symbol} ${a.condition === "above" ? "au-dessus de" : "en-dessous de"} ${a.threshold} ${a.currency.toUpperCase()}`}
                  className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:text-accent-rose hover:border-accent-rose/40
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-rose/40"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers internes                                                          */
/* -------------------------------------------------------------------------- */

function Skeleton() {
  return (
    <div className="space-y-2 animate-pulse" aria-hidden="true">
      <div className="h-16 rounded-xl bg-elevated/60" />
      <div className="h-16 rounded-xl bg-elevated/60" />
      <div className="h-16 rounded-xl bg-elevated/40" />
    </div>
  );
}

