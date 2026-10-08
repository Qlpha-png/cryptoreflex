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
import PushOptIn from "@/components/PushOptIn";

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

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

interface Props {
  cryptos: AlertCryptoOption[];
}

export default function AlertsManager({ cryptos }: Props) {
  const searchParams = useSearchParams();

  const [hydrated, setHydrated] = useState(false);
  // SÉCURITÉ (audit 2026-10-01) : l'email vient TOUJOURS de la session
  // (/api/me). Plus de saisie libre : on ne peut ni lire ni créer d'alertes
  // pour l'email d'un tiers.
  const [auth, setAuth] = useState<"loading" | "anon" | "user">("loading");
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

    // 1) Session + liste : /api/alerts/by-email?optional=1 (no-store) → anonymous: true = anonyme.
    fetchAlerts();

    // 2) Pré-remplissage depuis ?cryptoId=...
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------- Arrivée avec `?new=1` : focus sur le formulaire ------------
   * (L'ancienne palette ⌘K émettait aussi `cmdk:open-create-alert` ; elle est
   * retirée au lot B3b, plus rien n'émet cet événement.) Pas de dialog ici
   * (le form est inline) : on focus le champ crypto + scrollIntoView. */
  useEffect(() => {
    const focusForm = () => {
      requestAnimationFrame(() => {
        cryptoInputRef.current?.focus();
        cryptoInputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    };
    if (searchParams?.get("new") === "1") {
      focusForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------- Fetch alertes du compte connecté ------------------------------ */
  const fetchAlerts = useCallback(async () => {
    setListState("loading");
    setListError("");
    try {
      const res = await fetch("/api/alerts/by-email?optional=1", { cache: "no-store" });
      if (!res.ok && res.status !== 401) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { ok: boolean; anonymous?: boolean; email?: string; alerts: PriceAlert[] };
      if (res.status === 401 || data.anonymous) {
        setAuth("anon");
        setAlerts([]);
        setListState("idle");
        return;
      }
      if (data.email) setEmail(data.email);
      setAuth("user");
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      setListState((data.alerts?.length ?? 0) > 0 ? "ready" : "empty");
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Erreur réseau");
      setListState("error");
      // Session inconnue (réseau) : on sort de l'état de chargement.
      setAuth((prev) => (prev === "loading" ? "anon" : prev));
    }
  }, []);


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
      setSubmitMsg("Sélectionnez une crypto dans la liste.");
      return;
    }
    if (auth !== "user") {
      setSubmitState("error");
      setSubmitMsg("Connectez-vous pour créer une alerte.");
      return;
    }
    const cleanedThreshold = threshold.replace(/\s/g, "").replace(",", ".");
    const num = Number(cleanedThreshold);
    if (!Number.isFinite(num) || num <= 0) {
      setSubmitState("error");
      setSubmitMsg("Seuil invalide. Saisissez un nombre positif.");
      return;
    }

    setSubmitState("loading");
    try {
      const res = await fetch("/api/alerts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cryptoId: selectedCryptoId,
          condition,
          threshold: num,
          currency,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setSubmitState("error");
        setSubmitMsg(data.error || "Création impossible. Réessayez.");
        return;
      }
      setSubmitState("success");
      setSubmitMsg("Alerte créée. Vous recevrez un email quand le seuil sera atteint.");
      setThreshold("");
      // Refresh la liste
      fetchAlerts();
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
      // Session propriétaire (cookie) : pas besoin de token.
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
    selectedCryptoId && Number(threshold) > 0 && auth === "user";

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
                           focus:ring-2 focus:ring-primary/30
                           focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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

          {/* Email = celui du compte connecté */}
          {auth === "user" ? (
            <p className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-fg/85">
              Alertes envoyées à <strong className="text-fg">{email}</strong>
            </p>
          ) : auth === "anon" ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-fg/85">
              <p>
                Connectez-vous pour créer vos alertes : un lien par email suffit,{" "}
                <strong>sans mot de passe</strong>. Personne d'autre ne peut ainsi
                voir ou modifier vos alertes.
              </p>
              <a
                href="/connexion"
                className="mt-2 inline-flex items-center gap-1.5 font-semibold text-primary-soft underline hover:text-primary"
              >
                Me connecter
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          ) : (
            <div className="h-11 animate-pulse rounded-xl bg-elevated/40" aria-hidden="true" />
          )}

          {/* Submit + feedback */}
          <div>
            <button
              type="submit"
              disabled={submitState === "loading" || !fillIndicator}
              // FIX 2026-05-08 — a11y batch (regle des 3 audit Lighthouse) :
              // text-fg-max sur bg-primary = contraste 2.04:1 (echec WCAG AA).
              // Aligne sur .btn-primary (text-background = 14:1 ratio).
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl
                         bg-primary px-5 py-2.5 text-sm font-bold text-background
                         hover:bg-primary-glow disabled:opacity-60 disabled:cursor-not-allowed
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
                <p className="inline-flex items-center gap-2 text-sm text-danger-fg">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {submitMsg}
                </p>
              )}
            </div>

            {/* Après création réussie : CTA douce pour activer les notifs push
                en complément de l'email (option : ne s'affiche pas si déjà
                granted ou unsupported). */}
            {submitState === "success" && <PushOptIn variant="inline" />}
          </div>
        </form>

        <p className="mt-4 text-xs text-muted">
          En créant une alerte, vous acceptez que votre email soit conservé uniquement pour
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

        {!hydrated || auth === "loading" ? (
          <div className="mt-6">
            <Skeleton />
          </div>
        ) : auth === "anon" ? (
          <p className="mt-6 text-sm text-muted">
            <a href="/connexion" className="underline hover:text-fg">Connectez-vous</a>{" "}
            pour voir et gérer vos alertes. Chaque email d'alerte contient aussi un
            lien de désactivation en 1 clic.
          </p>
        ) : listState === "loading" ? (
          <div className="mt-6">
            <Skeleton />
          </div>
        ) : listState === "error" ? (
          <p
            role="alert"
            className="mt-6 inline-flex items-center gap-2 text-sm text-danger-fg"
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            Impossible de charger vos alertes ({listError}).
          </p>
        ) : alerts.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              compact
              title="Aucune alerte pour cet email"
              description="Créez votre première alerte avec le formulaire à gauche."
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
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-green/10 border border-accent-green/30 px-2 py-0.5 text-xs uppercase tracking-wider text-accent-green">
                        Active
                      </span>
                    ) : a.status === "triggered" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 border border-warning/30 px-2 py-0.5 text-xs uppercase tracking-wider text-primary-soft">
                        Déclenchée
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted/10 border border-border px-2 py-0.5 text-xs uppercase tracking-wider text-muted">
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
                  <p className="mt-1 text-xs text-muted">
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

