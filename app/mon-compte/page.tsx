import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FileText,
  Settings,
  ShieldCheck,
  Sparkles,
  Mail,
  LogOut,
  Lock,
  ArrowRight,
} from "lucide-react";
import {
  Bell,
  Wallet,
} from "lucide-react";
import { getUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import DeleteAccountButton from "@/components/account/DeleteAccountButton";
import AskAiQuotaCard from "@/components/account/AskAiQuotaCard";
import EditableDisplayName from "@/components/account/EditableDisplayName";
import PushOptIn from "@/components/PushOptIn";
import GamificationPanel from "@/components/GamificationPanel";

export const metadata: Metadata = {
  title: "Mon compte",
  description:
    "Votre espace personnel Cryptoreflex : vos outils, vos préférences et la gestion de vos données. 100 % gratuit.",
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

  // DÉMONÉTISATION (juin 2026) — Cryptoreflex est 100 % gratuit : plus de plan
  // payant, plus d'abonnement à gérer. Tous les outils sont accessibles à tout
  // compte connecté. La page ne fait donc plus de distinction Free/Pro.

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

        {/* Section "Vos outils" — tout est gratuit (démonétisation juin 2026) */}
        <section
          aria-labelledby="tools-title"
          className="mb-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background p-5 sm:p-6"
        >
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
            <h2
              id="tools-title"
              className="font-display text-lg font-extrabold text-fg flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              Tes outils
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
            {/* Cerfa 2086 — outil phare, gratuit pour tous. */}
            <Link
              href="/outils/cerfa-2086-auto"
              className="spotlight-card group rounded-xl border border-border bg-surface p-4 hover:border-primary/50 hover:shadow-[0_8px_24px_-12px_rgba(245,165,36,0.4)] transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 grid place-items-center h-9 w-9 rounded-xl bg-amber-500/15 text-amber-400 group-hover:bg-amber-500/25 transition-colors">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-fg text-sm">
                    Cerfa 2086 + 3916-bis auto
                  </h3>
                  <p className="mt-1 text-xs text-fg/70 leading-snug">
                    Importe votre CSV → PDF pré-rempli en 30s. 5 PDF/jour.
                  </p>
                </div>
                <ArrowRight
                  className="h-4 w-4 text-primary-soft mt-1 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </Link>

            {/* Fiches crypto */}
            <Link
              href="/cryptos"
              className="spotlight-card group rounded-xl border border-border bg-surface p-4 hover:border-primary/50 hover:shadow-[0_8px_24px_-12px_rgba(245,165,36,0.4)] transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 grid place-items-center h-9 w-9 rounded-xl bg-primary/15 text-primary group-hover:bg-primary/25 transition-colors">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-fg text-sm">
                    Fiches crypto
                  </h3>
                  <p className="mt-1 text-xs text-fg/70 leading-snug">
                    100 fiches éditoriales : résumé, points clés, données.
                  </p>
                </div>
                <ArrowRight
                  className="h-4 w-4 text-primary-soft mt-1 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </Link>

            {/* Portfolio */}
            <Link
              href="/portefeuille"
              className="spotlight-card group rounded-xl border border-border bg-surface p-4 hover:border-primary/50 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 grid place-items-center h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/25 transition-colors">
                  <Wallet className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-fg text-sm">Portfolio</h3>
                  <p className="mt-1 text-xs text-fg/70 leading-snug">
                    Suis tes positions. Allocation, P&amp;L live.
                  </p>
                </div>
                <ArrowRight
                  className="h-4 w-4 text-primary-soft mt-1 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </Link>

            {/* Alertes prix */}
            <Link
              href="/alertes"
              className="spotlight-card group rounded-xl border border-border bg-surface p-4 hover:border-primary/50 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 grid place-items-center h-9 w-9 rounded-xl bg-blue-500/15 text-blue-400 group-hover:bg-blue-500/25 transition-colors">
                  <Bell className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-fg text-sm">Alertes prix</h3>
                  <p className="mt-1 text-xs text-fg/70 leading-snug">
                    Reçois un email quand un seuil est franchi.
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

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Statut du compte — gratuit */}
          <div className="lg:col-span-2 glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck
                className="h-4 w-4 text-success"
                aria-hidden="true"
              />
              <h2 className="font-bold text-fg">Ton compte</h2>
            </div>

            <div className="rounded-xl bg-elevated/40 border border-border p-4">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-sm font-semibold text-fg">
                  Accès
                </span>
                <span className="text-base font-extrabold text-success">
                  Gratuit · tous les outils
                </span>
              </div>
              <p className="text-xs text-muted">
                Cryptoreflex est entièrement gratuit. Aucun abonnement, aucune
                carte bancaire, rien à gérer — tous les outils ci-dessus sont
                accessibles avec votre compte.
              </p>
            </div>
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
            chaque fois. Vous pouvez aussi continuer à utiliser le lien magique si
            vous préférez.
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
            <h2 className="font-bold text-fg">Vos données (RGPD)</h2>
          </div>
          <p className="text-sm text-fg/70 leading-relaxed mb-4">
            Conformément au RGPD, vous pouvez à tout moment exporter ou supprimer
            vos données. La suppression de compte est{" "}
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
                double confirmation (suppression Supabase + données liées). */}
            <DeleteAccountButton />
          </div>
          <p className="mt-3 text-xs text-muted">
            Note : si vous avez par le passé réglé un abonnement, les factures
            correspondantes restent conservées 10 ans (obligation comptable,
            article L123-22 du Code de commerce). La suppression de compte
            anonymise vos données mais ne peut pas détruire les factures déjà
            émises.
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
          Tous les outils du site restent gratuits et accessibles — un email te
          sera envoyé dès l&apos;ouverture officielle de l&apos;espace.
        </p>
        <Link
          href="/outils"
          className="btn-primary btn-primary-shine min-h-[48px] inline-flex"
        >
          Découvrir les outils
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
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
