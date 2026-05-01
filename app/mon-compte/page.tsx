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

  // Username dérivé de l'email (avant @)
  const usernameDisplay = user.email.split("@")[0];

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
              className="mt-2 text-3xl sm:text-4xl font-extrabold text-fg tracking-[-0.025em]"
            >
              Bonjour, <span className="gradient-text">{usernameDisplay}</span>
            </h1>
            <p className="mt-1 text-sm text-muted">
              <span className="sr-only">Compte connecté&nbsp;: </span>
              {user.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isPro && (
              <span className="badge badge-trust">
                <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                Pro {user.plan === "pro_annual" ? "Annuel" : "Mensuel"}
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
              label="Alertes Pro"
              value="Illimité"
              subText="vs 3 max en Free"
            />
            <KpiCard
              index={3}
              tone="info"
              Icon={Wallet}
              label="Portfolio"
              value="Illimité"
              subText="vs 10 positions Free"
            />
          </div>
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
