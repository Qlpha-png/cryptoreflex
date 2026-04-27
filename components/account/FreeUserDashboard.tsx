/**
 * FreeUserDashboard — Vue Free user ULTRA conversion.
 *
 * Conçu suite aux recommandations des 10 agents experts dashboard + 20 agents Pro value prop.
 *
 * Principes appliqués :
 *  - Loss aversion (Kahneman) : H1 + line-through sur les limites Free
 *  - Curiosity gap : features Pro grisées avec lock visible
 *  - Friction-reversal : trust strip avec sources légales (L221-18, décret 2022-34)
 *  - ZERO claims inventés : aucun "X users en ligne", aucun fake counter
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
  BookOpen,
  MessagesSquare,
  FileText,
  TrendingUp,
} from "lucide-react";

const LOCKED_FEATURES = [
  {
    Icon: Wallet,
    title: "Portfolio illimité",
    free: "5 positions max",
    pro: "Multi-wallets · P&L live · CSV export",
  },
  {
    Icon: Bell,
    title: "Alertes prix illimitées",
    free: "5 alertes (1/crypto)",
    pro: "Multi-seuils · whales · DeFi · stablecoin depeg",
  },
  {
    Icon: BookOpen,
    title: "Brief PRO hebdomadaire",
    free: "1 brief/mois (teaser)",
    pro: "Alpha + on-chain dimanche soir",
  },
  {
    Icon: MessagesSquare,
    title: "Réponse fiscale 48 h",
    free: "Pas inclus",
    pro: "Cas perso DCA, swap, NFT — humain, sources citées",
  },
  {
    Icon: FileText,
    title: "Cerfa 2086 PDF auto-rempli",
    free: "Pas inclus",
    pro: "Mai 2026 · économise 99 € vs Waltio",
  },
  {
    Icon: TrendingUp,
    title: "Mémo 3916-bis multi-année",
    free: "Radar gratuit",
    pro: "PDF pré-rempli + alerte deadline",
  },
];

const COMPARISON = [
  { label: "Portfolio", free: "5", pro: "Illimité" },
  { label: "Alertes", free: "5", pro: "Illimité" },
  { label: "Glossaire", free: "100", pro: "250+" },
  { label: "Brief alpha", free: "1/mois", pro: "1/semaine" },
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
      {/* HERO Free dashboard */}
      <section
        aria-labelledby="free-hero"
        className="account-card glass rounded-2xl p-6 sm:p-8 border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent"
        style={{ ["--i" as never]: 0 }}
      >
        <span className="ds-eyebrow text-primary-soft inline-flex items-center gap-1.5">
          <Crown className="h-3.5 w-3.5" aria-hidden="true" />
          PLAN GRATUIT — DÉBLOQUE PRO
        </span>
        <h2
          id="free-hero"
          className="mt-3 text-2xl sm:text-3xl font-extrabold text-fg leading-tight"
        >
          Tu utilises l&apos;outillage{" "}
          <span className="gradient-text">limité</span>.
        </h2>
        <p className="mt-3 text-sm sm:text-base text-fg/75 max-w-xl leading-relaxed">
          6 fonctionnalités majeures sont verrouillées sur ton plan Free. Pro
          les débloque toutes, dès 9,99&nbsp;€/mois — annulation 1 clic,
          14&nbsp;j remboursé sans question.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link
            href="/pro#plans"
            className="btn-primary btn-primary-shine min-h-[48px] px-6 group"
            data-cta="account-free-hero"
          >
            Débloquer mon outillage Pro — 9,99 €/mois
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

      {/* COMPARISON STRIP */}
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

      {/* PREVIEW FEATURES PRO LOCKED */}
      <section
        aria-labelledby="acc-locked"
        className="account-card space-y-3"
        style={{ ["--i" as never]: 2 }}
      >
        <p id="acc-locked" className="ds-eyebrow text-primary-soft">
          VERROUILLÉ — DÉBLOQUE AVEC PRO
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LOCKED_FEATURES.map((f) => (
            <div
              key={f.title}
              className="relative glass rounded-2xl p-5 overflow-hidden border border-border group cursor-not-allowed"
              title="Pro débloque, dès 9,99 €/mois"
              aria-label={`${f.title} — verrouillé. Pro débloque, dès 9,99 €/mois.`}
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
            Débloquer les 6 fonctionnalités — 9,99 €/mois
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
