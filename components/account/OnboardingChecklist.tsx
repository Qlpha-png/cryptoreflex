"use client";

/**
 * OnboardingChecklist — 6 quick wins post-paiement.
 *
 * Conçu suite aux recommandations de 10 agents experts dashboard premium.
 * Réduit le churn M1 en activant l'user dans les 5 premières minutes.
 *
 * Persistence : localStorage (V1) — Supabase user_metadata en V2.
 * Dismiss : minimize (pill flottante) ou hide forever.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Check,
  Circle,
  X,
  ChevronRight,
  Sparkles,
  Bell,
  Wallet,
  ShieldCheck,
  MessagesSquare,
  Lock,
  Mail,
  type LucideIcon,
} from "lucide-react";

type StepId = "radar" | "portfolio" | "alert" | "fiscal" | "password" | "brief";

interface Step {
  id: StepId;
  title: string;
  benefit: string;
  cta: string;
  href: string;
  Icon: LucideIcon;
}

const STEPS: Step[] = [
  {
    id: "radar",
    title: "Lance le Radar 3916-bis",
    benefit: "Détecte jusqu'à 10 000 € d'amende potentielle (deadline mai)",
    cta: "Scanner (2 min)",
    href: "/outils/radar-3916-bis",
    Icon: ShieldCheck,
  },
  {
    id: "portfolio",
    title: "Ajoute ta 1ère position portfolio",
    benefit: "P&L live, illimité (vs 5 max en Free)",
    cta: "Configurer",
    href: "/outils/portfolio-tracker",
    Icon: Wallet,
  },
  {
    id: "alert",
    title: "Active ta première alerte prix",
    benefit: "Email instantané sur seuil franchi",
    cta: "Créer alerte",
    // FIX 2026-05-02 #7 (audit 404) : la route est /alertes (page hub user),
    // pas /outils/alertes (qui n'existe pas et causait 1 lien 404).
    href: "/alertes",
    Icon: Bell,
  },
  {
    id: "fiscal",
    title: "Pose ta question fiscale (48 h)",
    benefit: "Réponse argumentée par un humain, sources légales citées",
    cta: "Ouvrir",
    href: "mailto:hello@cryptoreflex.fr?subject=Question%20fiscale",
    Icon: MessagesSquare,
  },
  {
    id: "password",
    title: "Sécurise ton compte (mot de passe)",
    benefit: "Connexion en 2 sec sans attendre un email",
    cta: "Définir",
    href: "/mon-compte/mot-de-passe",
    Icon: Lock,
  },
  {
    id: "brief",
    title: "Active le Brief PRO hebdo",
    benefit: "Alpha + on-chain, dimanche soir, 4 min de lecture",
    cta: "M'abonner",
    href: "/mon-compte#brief",
    Icon: Mail,
  },
];

const STORAGE_KEY = "cryptoreflex.onboarding.v1";

interface State {
  steps: Record<StepId, boolean>;
  dismissed: "no" | "minimized" | "forever";
}

const DEFAULT_STATE: State = {
  steps: {
    radar: false,
    portfolio: false,
    alert: false,
    fiscal: false,
    password: false,
    brief: false,
  },
  dismissed: "no",
};

export default function OnboardingChecklist() {
  const [state, setState] = useState<State>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  // Hydration localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        setState({ ...DEFAULT_STATE, ...parsed });
      }
    } catch {
      // ignore corrupt JSON
    }
    setHydrated(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota
    }
  }, [state, hydrated]);

  const done = Object.values(state.steps).filter(Boolean).length;
  const pct = Math.round((done / STEPS.length) * 100);

  // Auto-dismiss à 6/6
  useEffect(() => {
    if (done === STEPS.length && state.dismissed === "no") {
      const t = setTimeout(() => {
        setState((s) => ({ ...s, dismissed: "forever" }));
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [done, state.dismissed]);

  if (!hydrated || state.dismissed === "forever") return null;

  function tickStep(id: StepId) {
    setState((s) => ({ ...s, steps: { ...s.steps, [id]: true } }));
  }

  function setDismissed(d: State["dismissed"]) {
    setState((s) => ({ ...s, dismissed: d }));
  }

  // Vue "minimisée" — pill flottante en bas à droite
  if (state.dismissed === "minimized") {
    return (
      <button
        onClick={() => setDismissed("no")}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-elevated/90 backdrop-blur-md px-4 py-2 text-sm font-semibold text-fg shadow-lg hover:scale-105 transition-transform"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        {done}/{STEPS.length} étapes restantes
      </button>
    );
  }

  return (
    <section
      aria-labelledby="onboarding-heading"
      className="account-card glass rounded-2xl p-6 mb-6 border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
      style={{ ["--i" as never]: 0 }}
    >
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <span className="ds-eyebrow text-primary-soft inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            ACTIVE TON PRO EN 5 MINUTES
          </span>
          <h2
            id="onboarding-heading"
            className="mt-2 text-xl font-extrabold text-fg leading-tight"
          >
            Bien joué, te voilà{" "}
            <span className="text-primary">Pro&nbsp;!</span>
          </h2>
          <p className="mt-1 text-sm text-fg/70">
            Quelques quick-wins pour débloquer ta valeur dès aujourd&apos;hui.
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setDismissed("minimized")}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-elevated/60 transition-colors"
            aria-label="Réduire"
            title="Réduire"
          >
            <span aria-hidden="true">−</span>
          </button>
          <button
            onClick={() => setDismissed("forever")}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-elevated/60 transition-colors"
            aria-label="Cacher définitivement"
            title="Cacher définitivement"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="mb-5 flex items-center gap-3">
        <div
          className="flex-1 h-2 rounded-full bg-elevated overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progression onboarding ${pct}%`}
        >
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-soft transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-mono tabular-nums text-fg/70 shrink-0">
          {done}/{STEPS.length}
        </span>
      </div>

      {/* Steps */}
      <ul className="space-y-2">
        {STEPS.map((s) => {
          const isDone = state.steps[s.id];
          return (
            <li
              key={s.id}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                isDone
                  ? "border-success/30 bg-success/5 opacity-70"
                  : "border-border hover:border-primary/40 hover:bg-elevated/40"
              }`}
            >
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                  isDone
                    ? "bg-success text-white scale-110"
                    : "bg-elevated text-muted"
                }`}
                aria-hidden="true"
              >
                {isDone ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    isDone ? "line-through text-fg/50" : "text-fg"
                  }`}
                >
                  {s.title}
                </p>
                {!isDone && (
                  <p className="text-xs text-fg/60 mt-0.5">{s.benefit}</p>
                )}
              </div>
              {!isDone &&
                (s.href.startsWith("mailto:") ? (
                  <a
                    href={s.href}
                    onClick={() => tickStep(s.id)}
                    className="btn-primary min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 text-xs whitespace-nowrap rounded-lg shrink-0"
                  >
                    {s.cta}
                    <ChevronRight className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : (
                  <Link
                    href={s.href}
                    onClick={() => tickStep(s.id)}
                    className="btn-primary min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 text-xs whitespace-nowrap rounded-lg shrink-0"
                  >
                    {s.cta}
                    <ChevronRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                ))}
            </li>
          );
        })}
      </ul>

      {done >= 3 && done < STEPS.length && (
        <button
          onClick={() => setDismissed("forever")}
          className="mt-4 text-xs text-muted hover:text-fg underline"
        >
          Masquer définitivement
        </button>
      )}
    </section>
  );
}
