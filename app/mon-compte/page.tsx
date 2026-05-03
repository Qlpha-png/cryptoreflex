import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Crown,
  CreditCard,
  FileText,
  Settings,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Calendar,
  Mail,
  LogOut,
  AlertCircle,
  Lock,
  ArrowRight,
} from "lucide-react";
import {
  Bell,
  Wallet,
  ReceiptText,
  CalendarDays,
} from "lucide-react";
import { getUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import ManageSubscriptionButton from "@/components/account/ManageSubscriptionButton";
import OnboardingChecklist from "@/components/account/OnboardingChecklist";
import KpiCard from "@/components/account/KpiCard";
import FreeUserDashboard from "@/components/account/FreeUserDashboard";
import DeleteAccountButton from "@/components/account/DeleteAccountButton";
import AskAiQuotaCard from "@/components/account/AskAiQuotaCard";
import EditableDisplayName from "@/components/account/EditableDisplayName";
import PushOptIn from "@/components/PushOptIn";
import GamificationPanel from "@/components/GamificationPanel";

export const metadata: Metadata = {
  title: "Mon compte — Cryptoreflex",
  description:
    "Gère ton abonnement Cryptoreflex Pro, télécharge tes factures, mets à jour ta carte et accède à toutes tes fonctionnalités premium.",
  alternates: { canonical: `${BRAND.url}/mon-compte` },
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  // Si Supabase n'est pas configuré : page d'attente
  if (!isSupabaseConfigured()) {
    return <NotConfiguredView />;
  }

  const user = await getUser();
  if (!user) {
    redirect("/connexion?next=/mon-compte");
  }

  const isPro = user.plan === "pro_monthly" || user.plan === "pro_annual";

  // Calcul KPI dynamiques (data-driven, ZERO invention)
  const daysLeftPro =
    isPro && user.planExpiresAt
      ? Math.max(
          0,
          Math.ceil(
            (user.planExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        )
      : null;

  // Lecture des prix depuis env (cohérence avec /pro). Fallbacks alignés
  // sur la décision business 30/04/2026 (2,99 €/mois, 28,99 €/an).
  const monthlyPriceLabel =
    process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE ?? "2,99 €";
  const annualPriceLabel =
    process.env.NEXT_PUBLIC_PRO_ANNUAL_PRICE ?? "28,99 €";

  const annualSavings =
    user.plan === "pro_annual"
      ? "+6,89 €" // 2,99 × 12 = 35,88 ; 35,88 - 28,99 = 6,89 économie réelle
      : null;

  // Display name : metadata Supabase si défini, sinon dérivé de l'email.
  // L'utilisateur peut le personnaliser via EditableDisplayName.
  const usernameDisplay = user.displayName;

  return (
    <section className="min-h-[80vh] py-12 sm:py-16" aria-labelledby="page-title">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header
          className="account-card mb-8 flex items-start justify-between gap-4 flex-wrap"
          style={{ ["--i" as never]: 0 }}
        >
          <div>
            <span className="ds-eyebrow text-primary-soft">MON ESPACE</span>
            <h1
              id="page-title"
              className="mt-2 text-3xl sm:text-4xl font-extrabold text-fg tracking-[-0.025em] flex items-center flex-wrap gap-2"
            >
              <span>Bonjour,</span>
              <EditableDisplayName initialName={usernameDisplay} />
            </h1>
            <p className="mt-1 text-sm text-muted">
              <span className="sr-only">Compte connecté&nbsp;: </span>
              {user.email}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {user.isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300 hover:bg-amber-400/20 transition-colors"
                aria-label="Accéder au dashboard admin"
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Admin
              </Link>
            )}
            {isPro && (
              // BATCH 47b — conic-border-anim : conic gradient gold qui tourne
              // 6s autour du badge. Signature "premium animé" Linear/Vercel.
              // Auto-disable reduced-motion via globals.css. Le pulse-strong
              // ajoute un halo discret qui tape l'oeil au mount post-upgrade.
              <span className="badge badge-trust conic-border-anim">
                <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                {user.isAdmin
                  ? "Admin (accès Pro)"
                  : `Pro ${user.plan === "pro_annual" ? "Annuel" : "Mensuel"}`}
              </span>
            )}
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="text-sm text-muted hover:text-fg inline-flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-elevated/60 transition-colors min-h-[44px]"
                aria-label="Se déconnecter de mon compte"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline" aria-hidden="true">
                  Déconnexion
                </span>
              </button>
            </form>
          </div>
        </header>

        {/* Onboarding checklist Pro (post-paiement) */}
        {isPro && <OnboardingChecklist />}

        {/* KPI cards Pro — data-driven uniquement */}
        {isPro && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
            aria-label="Indicateurs clés de ton abonnement"
          >
            {daysLeftPro !== null && (
              <KpiCard
                index={0}
                tone="info"
                Icon={CalendarDays}
                label="Jours Pro restants"
                value={daysLeftPro}
                subText={
                  user.planExpiresAt
                    ? `renouv. le ${user.planExpiresAt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
                    : undefined
                }
              />
            )}
            {annualSavings && (
              <KpiCard
                index={1}
                tone="success"
                Icon={ReceiptText}
                label="Économie vs mensuel"
                value={annualSavings}
                trend={{ direction: "up", pct: "19%" }}
                subText="sur 12 mois"
              />
            )}
            <KpiCard
              index={2}
              tone="info"
              Icon={Bell}
              label="Alertes Soutien"
              value="100"
              subText="vs 3 en Free"
            />
            <KpiCard
              index={3}
              tone="info"
              Icon={Wallet}
              label="Portfolio Soutien"
              value="500"
              subText="vs 10 positions Free"
            />
          </div>
        )}

        {/* Section "Tes outils Soutien" — grille des features Pro accessibles */}
        {isPro && (
          <section
            aria-labelledby="pro-tools-title"
            className="mb-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background p-5 sm:p-6"
          >
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
              <h2
                id="pro-tools-title"
                className="font-display text-lg font-extrabold text-fg flex items-center gap-2"
              >
                <Crown className="h-4 w-4 text-primary" aria-hidden="true" />
                Tes outils Soutien
              </h2>
              <Link
                href="/outils"
                className="text-xs font-semibold text-primary-soft hover:text-primary inline-flex items-center gap-1"
              >
                Tous les outils
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {/* Cerfa 2086 — feature flagship.
                  BATCH 47b — spotlight-card halo gold qui suit la souris
                  via SpotlightDelegate global (deja monte dans layout).
                  Innovation Linear/Vercel sans Tilt3D wrapper (les Link
                  sont en grid sm:grid-cols-2 et un Tilt3D pousserait
                  width:auto qui casse le layout). */}
              <Link
                href="/outils/cerfa-2086-auto"
                className="spotlight-card group rounded-xl border border-border bg-surface p-4 hover:border-primary/50 hover:shadow-[0_8px_24px_-12px_rgba(245,165,36,0.4)] transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 grid place-items-center h-9 w-9 rounded-xl bg-amber-500/15 text-amber-400 group-hover:bg-amber-500/25 transition-colors">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* BATCH 47b — emoji ✨ remplace par Sparkles Lucide
                        (pixellise sur certains OS, accessibilite). */}
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-400">
                      <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                      Nouveau
                    </span>
                    <h3 className="mt-1 font-bold text-fg text-sm">
                      Cerfa 2086 + 3916-bis auto
                    </h3>
                    <p className="mt-1 text-xs text-fg/70 leading-snug">
                      Importe ton CSV → PDF pré-rempli en 30s. 5 PDF/jour.
                    </p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-primary-soft mt-1 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              </Link>

              {/* IA Q&A par fiche */}
              <Link
                href="/cryptos"
                className="spotlight-card group rounded-xl border border-border bg-surface p-4 hover:border-primary/50 hover:shadow-[0_8px_24px_-12px_rgba(245,165,36,0.4)] transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 grid place-items-center h-9 w-9 rounded-xl bg-primary/15 text-primary group-hover:bg-primary/25 transition-colors">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* BATCH 47b — emoji ✨ remplace par Sparkles Lucide. */}
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary">
                      <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                      Nouveau
                    </span>
                    <h3 className="mt-1 font-bold text-fg text-sm">
                      IA Q&amp;A par fiche
                    </h3>
                    <p className="mt-1 text-xs text-fg/70 leading-snug">
                      20 questions/jour Claude Haiku contextualisé.
                    </p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-primary-soft mt-1 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              </Link>

              {/* Portfolio étendu 500 */}
              <Link
                href="/portefeuille"
                className="spotlight-card group rounded-xl border border-border bg-surface p-4 hover:border-primary/50 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 grid place-items-center h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/25 transition-colors">
                    <Wallet className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-fg text-sm">Portfolio 500</h3>
                    <p className="mt-1 text-xs text-fg/70 leading-snug">
                      Suis 500 positions (vs 10 Free). Allocation, P&amp;L live.
                    </p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-primary-soft mt-1 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              </Link>

              {/* Alertes 100 */}
              <Link
                href="/alertes"
                className="spotlight-card group rounded-xl border border-border bg-surface p-4 hover:border-primary/50 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 grid place-items-center h-9 w-9 rounded-xl bg-blue-500/15 text-blue-400 group-hover:bg-blue-500/25 transition-colors">
                    <Bell className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-fg text-sm">Alertes 100</h3>
                    <p className="mt-1 text-xs text-fg/70 leading-snug">
                      100 alertes prix par email (vs 3 Free).
                    </p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-primary-soft mt-1 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </div>

            {/* Quota IA Q&A en pied de section */}
            <div className="mt-4">
              <AskAiQuotaCard />
            </div>
          </section>
        )}

        {/* Si pas Pro : nouvelle vue conversion premium */}
        {!isPro && <FreeUserDashboard />}

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Abonnement */}
          <div className="lg:col-span-2 glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard
                className="h-4 w-4 text-primary-soft"
                aria-hidden="true"
              />
              <h2 className="font-bold text-fg">Abonnement</h2>
            </div>

            {isPro ? (
              <>
                <div className="rounded-xl bg-elevated/40 border border-border p-4 mb-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-sm font-semibold text-fg">
                      Plan actuel
                    </span>
                    <span className="text-base font-extrabold text-primary">
                      {user.plan === "pro_annual"
                        ? `Soutien Annuel — ${annualPriceLabel}/an`
                        : `Soutien Mensuel — ${monthlyPriceLabel}/mois`}
                    </span>
                  </div>
                  {user.planExpiresAt && (
                    <p className="text-xs text-muted">
                      <Calendar
                        className="inline-block h-3 w-3 mr-1 align-text-bottom"
                        aria-hidden="true"
                      />
                      Prochain renouvellement&nbsp;:{" "}
                      {user.planExpiresAt.toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>

                <ManageSubscriptionButton />

                <p className="mt-3 text-xs text-muted">
                  Tu seras redirigé vers Stripe Customer Portal pour gérer ta
                  carte, télécharger tes factures, changer de plan ou résilier
                  en 1 clic.
                </p>
              </>
            ) : (
              <p className="text-sm text-fg/70">
                Aucun abonnement actif. Découvre les plans Pro pour débloquer
                l&apos;outillage premium.
              </p>
            )}
          </div>

          {/* Préférences */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings
                className="h-4 w-4 text-primary-soft"
                aria-hidden="true"
              />
              <h2 className="font-bold text-fg">Préférences</h2>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between gap-3">
                <span className="text-fg/70">Email</span>
                <span className="font-mono text-xs text-fg truncate" title={user.email}>
                  {user.email}
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-fg/70">Langue</span>
                <span className="text-fg">Français</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-fg/70">Thème</span>
                <span className="text-fg">Sombre</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Notifications push */}
        <div className="mt-4">
          <PushOptIn />
        </div>

        {/* Gamification — étude #16 ETUDE-2026-05-02 (XP / streak / badges) */}
        <div className="mt-4">
          <GamificationPanel />
        </div>

        {/* Sécurité */}
        <div className="mt-4 glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock
              className="h-4 w-4 text-primary-soft"
              aria-hidden="true"
            />
            <h2 className="font-bold text-fg">Sécurité</h2>
          </div>
          <p className="text-sm text-fg/70 leading-relaxed mb-4">
            Définis un mot de passe pour te connecter sans attendre un email à
            chaque fois. Tu peux aussi continuer à utiliser le lien magique si
            tu préfères.
          </p>
          <Link
            href="/mon-compte/mot-de-passe"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft hover:text-primary px-3 py-2 rounded-lg border border-border hover:bg-elevated/60 transition-colors min-h-[40px]"
          >
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Définir / Modifier mon mot de passe
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* RGPD */}
        <div className="mt-4 glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck
              className="h-4 w-4 text-success"
              aria-hidden="true"
            />
            <h2 className="font-bold text-fg">Tes données (RGPD)</h2>
          </div>
          <p className="text-sm text-fg/70 leading-relaxed mb-4">
            Conformément au RGPD, tu peux à tout moment exporter ou supprimer
            tes données. La suppression de compte est{" "}
            <strong className="text-fg">automatique en 1 clic</strong> via le
            bouton ci-dessous (pas besoin d&apos;email).
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`mailto:${BRAND.email}?subject=Demande%20export%20donn%C3%A9es%20RGPD&body=Email%20du%20compte%3A%20${encodeURIComponent(user.email)}`}
              className="text-sm font-semibold text-primary-soft hover:text-primary inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-elevated/60 transition-colors min-h-[40px]"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Exporter mes données (par email)
            </a>
            {/* Bouton DSR RGPD art. 17 — appelle /api/account/delete avec
                double confirmation. Cancel auto Stripe + delete Supabase. */}
            <DeleteAccountButton />
          </div>
          <p className="mt-3 text-xs text-muted">
            Note : conformément à l&apos;article L123-22 du Code de commerce,
            tes factures Stripe sont conservées 10 ans (obligation comptable).
            La suppression de compte anonymise tes données mais ne peut pas
            détruire les factures émises.
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Vue dégradée si Supabase pas configuré                                    */
/* -------------------------------------------------------------------------- */

function NotConfiguredView() {
  return (
    <section className="min-h-[80vh] py-16 flex items-center">
      <div className="mx-auto max-w-md px-4 sm:px-6 w-full text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/15 text-warning border border-warning/30 mb-5">
          <Sparkles className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="text-3xl font-extrabold text-fg mb-3">
          Espace personnel <span className="gradient-text">bientôt disponible</span>
        </h1>
        <p className="text-sm text-fg/70 leading-relaxed mb-6">
          On finalise l&apos;activation de l&apos;espace personnel Cryptoreflex.
          Tes accès Pro sont déjà actifs côté Stripe — un email te sera
          envoyé dès l&apos;ouverture officielle.
        </p>
        <Link
          href="/pro"
          className="btn-primary btn-primary-shine min-h-[48px] inline-flex"
        >
          Voir les plans Pro
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <p className="mt-6 text-xs text-muted">
          Une question urgente ?{" "}
          <a
            href={`mailto:${BRAND.email}`}
            className="text-primary-soft underline hover:text-primary"
          >
            <Mail
              className="inline-block h-3 w-3 mr-1 align-text-bottom"
              aria-hidden="true"
            />
            {BRAND.email}
          </a>
        </p>
      </div>
    </section>
  );
}
