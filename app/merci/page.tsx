import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  Mail,
  ArrowRight,
  Calculator,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { BRAND } from "@/lib/brand";

/**
 * /merci — page de remerciement post-inscription newsletter.
 *
 * Stratégie :
 *  - Confirmer l'action ("oui ça a marché, vérifie ta boîte")
 *  - Offrir le lead magnet en download direct (pas obligé d'attendre l'email)
 *  - Re-engager : suggestions articles + outils (réduit le bounce)
 *  - **noindex** : page de conversion -> aucune valeur SEO, et on évite que ça
 *    indexe dans Google (ferait monter le bounce rate vu hors contexte).
 *
 * Sert aussi de page de redirection si on veut passer les widgets en
 * "redirect after submit" (au lieu de la pop-in inline) pour mesurer la
 * conversion comme un vrai funnel dans GA4.
 */

export const metadata: Metadata = {
  title: "Merci — vérifie ta boîte mail",
  description:
    "Inscription confirmée. Télécharge ton guide PDF crypto et continue d'explorer Cryptoreflex.",
  alternates: { canonical: `${BRAND.url}/merci` },
  // CRITIQUE : page de conversion -> hors index
  robots: { index: false, follow: true, nocache: true },
};

const LEAD_MAGNET_URL = "/lead-magnets/guide-plateformes-crypto-2026.pdf";

const suggestedArticles = [
  {
    title: "Comment acheter sa première crypto en France en 2026",
    href: "/blog",
    desc: "Le guide complet débutant : choisir une plateforme, KYC, premier achat, sécurité.",
  },
  {
    title: "Coinbase vs Bitpanda vs Binance : lequel choisir ?",
    href: "/comparatif",
    desc: "Comparatif détaillé : frais réels, statut MiCA, ergonomie, support FR.",
  },
  {
    title: "Fiscalité crypto en France : tout comprendre",
    href: "/blog",
    desc: "PFU 30%, formulaire 2086, plus-values : ce qu'il faut déclarer en 2026.",
  },
];

const tools = [
  {
    icon: Calculator,
    title: "Calculateur de plus-values crypto",
    href: "/outils",
    desc: "Estime ton imposition crypto en France (flat tax 30%) en quelques clics.",
  },
  {
    icon: TrendingUp,
    title: "Calculateur de profits",
    href: "/outils",
    desc: "Simule ton ROI sur Bitcoin, Ethereum & altcoins majeurs.",
  },
];

export default function MerciPage() {
  return (
    <div className="min-h-screen">
      {/* HERO confirmation */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-green/15 text-accent-green">
            <CheckCircle2 className="h-8 w-8" />
          </span>

          <h1 className="mt-6 text-3xl sm:text-5xl font-extrabold text-fg leading-tight">
            Merci ! <span className="gradient-text">Vérifie ta boîte mail.</span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-fg/75 max-w-xl mx-auto">
            Un email de confirmation vient de t'être envoyé. Clique sur le lien à
            l'intérieur pour activer ton inscription et garantir la réception
            quotidienne de la newsletter.
          </p>

          {/* Lead magnet en download immédiat — pas besoin d'attendre l'email */}
          <div className="mt-8 inline-block w-full max-w-md text-left">
            <div className="glass rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
                  <Download className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-bold text-fg">Ton guide PDF, tout de suite</h2>
                  <p className="text-xs text-muted mt-1">
                    Les plateformes crypto régulées MiCA à utiliser en France 2026 (PDF, ~1.2 Mo)
                  </p>
                </div>
              </div>
              <a
                href={LEAD_MAGNET_URL}
                download
                className="btn-primary w-full mt-4 justify-center"
              >
                <Download className="h-4 w-4" />
                Télécharger le guide
              </a>
            </div>
          </div>

          <p className="mt-6 text-xs text-muted flex items-center justify-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Pas reçu l'email après 5 min ? Vérifie tes spams ou écris à{" "}
            <a href={`mailto:${BRAND.email}`} className="text-primary-soft hover:underline">
              {BRAND.email}
            </a>
          </p>
        </div>
      </section>

      {/* Suggestions articles */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-extrabold text-fg">Pendant que tu attends l'email…</h2>
        </div>
        <p className="text-sm text-fg/70 mb-6">
          Quelques lectures pour démarrer du bon pied.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suggestedArticles.map((a) => (
            <Link
              key={a.title}
              href={a.href}
              className="group glass rounded-2xl p-5 hover:border-primary/40 transition-colors"
            >
              <h3 className="font-bold text-fg group-hover:text-primary-soft transition-colors">
                {a.title}
              </h3>
              <p className="mt-2 text-sm text-fg/70">{a.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs text-primary-soft">
                Lire l'article
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Suggestions outils */}
      <section className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center gap-2 mb-6">
            <Calculator className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-extrabold text-fg">Ou teste nos outils gratuits</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tools.map((t) => (
              <Link
                key={t.title}
                href={t.href}
                className="group glass rounded-2xl p-5 hover:border-primary/40 transition-colors"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <t.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-bold text-fg group-hover:text-primary-soft transition-colors">
                  {t.title}
                </h3>
                <p className="mt-2 text-sm text-fg/70">{t.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
