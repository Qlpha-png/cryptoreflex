/**
 * FreeUserDashboard — Vue Free user alignée sur le modèle « Soutien indé ».
 *
 * REFONTE 01/05/2026 — alignement avec /pro :
 *  - Prix : 2,99 €/mois (lit env var NEXT_PUBLIC_PRO_MONTHLY_PRICE, fallback 2,99 €)
 *  - Features : uniquement les 6 bénéfices techniques 100 % automatisables
 *    (alignés avec /pro après refonte). Suppression de toutes les fausses
 *    promesses humaines (Brief alpha, Réponse fiscale 48h, Cerfa PDF,
 *    Mémo 3916-bis) qui étaient des engagements non tenables solo.
 *  - Limites : 10/3/10/100 (alignées avec FREE_LIMITS de lib/limits.ts +
 *    /api/me). Avant : 5/5/100/1mois — incohérent avec le code réel.
 *
 * Principes appliqués :
 *  - Loss aversion : line-through sur les limites Free réelles
 *  - ZERO claim invendable : aucune feature humaine promise
 *  - Trust : sources légales (L221-18, décret 2022-34) — réelles
 */

import Link from "next/link";
import {
  Crown,
  Lock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  CreditCard,
  Wallet,
  Bell,
  FileText,
  Sparkles,
} from "lucide-react";

// Lecture du prix depuis env (cohérence avec /pro). Server Component.
const MONTHLY_PRICE = process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE ?? "2,99 €";

const LOCKED_FEATURES = [
  {
    Icon: Wallet,
    title: "Portfolio étendu à 500 positions",
    free: "10 positions max",
    pro: "500 positions · Multi-wallets · P&L live · pie chart d'allocation",
  },
  {
    Icon: Bell,
    title: "Alertes prix étendues à 100",
    free: "3 alertes par email",
    pro: "100 alertes · toutes conditions (above/below, %, crash)",
  },
  {
    Icon: Sparkles,
    title: "Watchlist étendue à 200 cryptos",
    free: "10 cryptos max",
    pro: "200 cryptos suivies en temps réel",
  },
  {
    Icon: Sparkles,
    title: "IA Q&A par fiche crypto",
    free: "—",
    pro: "20 questions/jour avec Claude Haiku, contextualisées sur chaque fiche",
  },
];

const COMPARISON = [
  { label: "Portfolio", free: "10", pro: "500" },
  { label: "Alertes prix", free: "3", pro: "100" },
  { label: "Watchlist", free: "10", pro: "200" },
  { label: "IA Q&A par fiche", free: "—", pro: "20/jour" },
];

const TRUST_BADGES = [
  {
    Icon: ShieldCheck,
    title: "Garantie 14 j remboursé",
    sub: "art. L221-18 Code conso",
  },
  {
    Icon: RotateCcw,
    title: "Annulation 1 clic",
    sub: "décret 2022-34",
  },
  {
    Icon: CreditCard,
    title: "Stripe sécurisé UE",
    sub: "Frankfurt + Paris",
  },
];

export default function FreeUserDashboard() {
  return (
    <div className="mb-8 space-y-6">
      {/* HERO Free dashboard — modèle Soutien indé */}
      <section
        aria-labelledby="free-hero"
        className="account-card glass rounded-2xl p-6 sm:p-8 border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent"
        style={{ ["--i" as never]: 0 }}
      >
        <span className="ds-eyebrow text-primary-soft inline-flex items-center gap-1.5">
          <Crown className="h-3.5 w-3.5" aria-hidden="true" />
          PLAN GRATUIT — DÉBLOQUE LES LIMITES
        </span>
        <h2
          id="free-hero"
          className="mt-3 text-2xl sm:text-3xl font-extrabold text-fg leading-tight"
        >
          Tu utilises l&apos;outillage{" "}
          <span className="gradient-text">avec limites Free</span>.
        </h2>
        <p className="mt-3 text-sm sm:text-base text-fg/75 max-w-xl leading-relaxed">
          Le plan <strong className="text-fg">Soutien</strong> étend tes limites
          techniques (portfolio 500, alertes 100, watchlist 200) et débloque l&apos;IA
          Q&amp;A par fiche crypto (20 questions/jour, Claude Haiku contextualisé).
          Il finance directement le projet — dès {MONTHLY_PRICE}/mois, annulation
          1 clic, garantie commerciale 7&nbsp;j satisfait-ou-remboursé. Pas de
          fausse promesse de support humain ni d&apos;équipe d&apos;experts :
          juste un dev solo en France.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link
            href="/pro#plans"
            className="btn-primary btn-primary-shine min-h-[48px] px-6 group"
            data-cta="account-free-hero"
          >
            Soutenir — dès {MONTHLY_PRICE}/mois
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
          <Link
            href="/pro"
            className="text-sm font-semibold text-primary-soft underline underline-offset-2 hover:text-primary"
          >
            Voir tous les plans
          </Link>
        </div>
      </section>

      {/* COMPARISON STRIP — limites réelles alignées avec FREE_LIMITS */}
      <section
        aria-labelledby="acc-comparison"
        className="account-card glass rounded-2xl p-5 sm:p-6"
        style={{ ["--i" as never]: 1 }}
      >
        <p
          id="acc-comparison"
          className="ds-eyebrow text-primary-soft mb-4"
        >
          TES LIMITES ACTUELLES
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {COMPARISON.map((c) => (
            <div key={c.label} className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                {c.label}
              </p>
              <p className="mt-1.5 text-sm text-fg/50 line-through font-mono tabular-nums">
                {c.free}
              </p>
              <p className="mt-0.5 text-base sm:text-lg font-extrabold text-primary font-mono tabular-nums">
                {c.pro}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PREVIEW FEATURES PRO LOCKED — uniquement bénéfices techniques réels */}
      <section
        aria-labelledby="acc-locked"
        className="account-card space-y-3"
        style={{ ["--i" as never]: 2 }}
      >
        <p id="acc-locked" className="ds-eyebrow text-primary-soft">
          VERROUILLÉ — DÉBLOQUE AVEC LE PLAN SOUTIEN
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LOCKED_FEATURES.map((f) => (
            <div
              key={f.title}
              className="relative glass rounded-2xl p-5 overflow-hidden border border-border group cursor-not-allowed"
              title={`Soutien débloque, dès ${MONTHLY_PRICE}/mois`}
              aria-label={`${f.title} — verrouillé. Soutien débloque, dès ${MONTHLY_PRICE}/mois.`}
            >
              <div className="opacity-50 grayscale-[80%] pointer-events-none select-none">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20">
                  <f.Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 font-bold text-fg text-base">{f.title}</h3>
                <p className="mt-1 text-xs text-muted">
                  Free&nbsp;: {f.free}
                </p>
                <p className="mt-0.5 text-xs text-primary-soft">{f.pro}</p>
              </div>
              <span
                className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-elevated border border-border text-primary-soft"
                aria-hidden="true"
              >
                <Lock className="h-4 w-4" />
              </span>
            </div>
          ))}
        </div>
        <div className="text-center pt-2">
          <Link
            href="/pro#plans"
            className="btn-primary btn-primary-shine min-h-[48px] px-6 inline-flex"
          >
            Soutenir et débloquer — {MONTHLY_PRICE}/mois
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section
        aria-label="Garanties"
        className="account-card glass rounded-2xl p-4 sm:p-5"
        style={{ ["--i" as never]: 3 }}
      >
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
          {TRUST_BADGES.map((b) => (
            <li key={b.title} className="flex items-start gap-3">
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success border border-success/20"
                aria-hidden="true"
              >
                <b.Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-fg leading-tight">{b.title}</p>
                <p className="text-muted text-[11px] mt-0.5">{b.sub}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
