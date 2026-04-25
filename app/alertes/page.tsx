/**
 * /alertes — Server Component (metadata + hero + JSON-LD).
 * Le formulaire et la gestion des alertes vivent dans <AlertsManager />.
 *
 * SEO :
 *  - Indexable (page utilitaire à fort potentiel "alerte prix bitcoin", etc.)
 *  - WebPage + BreadcrumbList + FAQPage
 *  - H1 unique, lead descriptif, FAQ explicite
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  Bell,
  Mail,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import { BRAND } from "@/lib/brand";
import { getAllCryptos } from "@/lib/cryptos";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
} from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import AlertsManager, {
  type AlertCryptoOption,
} from "@/components/AlertsManager";

const PAGE_URL = `${BRAND.url}/alertes`;

export const metadata: Metadata = {
  title: "Alertes prix crypto par email — gratuites, sans compte",
  description:
    "Crée tes alertes prix crypto en 30 secondes. Reçois un email dès que Bitcoin, Ethereum ou n'importe quelle crypto franchit ton seuil — gratuit, sans pub, désinscription en 1 clic.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    title: "Alertes prix crypto par email — gratuites",
    description:
      "Sois prévenu·e par email dès qu'une crypto franchit ton seuil. Gratuit, sans compte, RGPD-friendly.",
  },
  keywords: [
    "alerte prix bitcoin",
    "alerte prix crypto",
    "notification prix bitcoin email",
    "tracker prix crypto gratuit",
    "alerte prix ethereum",
    "suivi cours crypto",
  ],
  robots: { index: true, follow: true },
};

/* -------------------------------------------------------------------------- */
/*  FAQ — utilisée pour la page ET le JSON-LD FAQPage                         */
/* -------------------------------------------------------------------------- */

const FAQ: { q: string; a: string }[] = [
  {
    q: "Comment fonctionnent les alertes prix Cryptoreflex ?",
    a: "Tu choisis une crypto, un seuil (par exemple Bitcoin > 50 000 €), tu indiques ton email, et nous envoyons un message automatique dès que le prix franchit ce seuil. Vérification quotidienne via CoinGecko (8h UTC), anti-spam de 24h entre deux déclenchements pour la même alerte.",
  },
  {
    q: "Faut-il créer un compte ?",
    a: "Non. Aucun mot de passe, aucun compte. Ton email est l'unique identifiant de tes alertes. Tu peux les retrouver à tout moment en saisissant ton email sur cette page.",
  },
  {
    q: "Combien d'alertes puis-je créer ?",
    a: "Jusqu'à 5 alertes actives en simultané par adresse email. C'est volontaire pour éviter le spam et garder le service gratuit pour tout le monde. Une alerte déclenchée libère automatiquement un slot.",
  },
  {
    q: "Comment me désinscrire ?",
    a: "Chaque email d'alerte contient un lien direct \"désactiver cette alerte\" — un clic suffit. Tu peux aussi supprimer toutes tes alertes depuis cette page, sans email de confirmation.",
  },
  {
    q: "Cryptoreflex stocke-t-il mon email ?",
    a: "Uniquement le strict nécessaire pour t'envoyer l'alerte (email + cryptoId + seuil). Aucune revente, aucun tracking marketing croisé. Conforme RGPD : suppression immédiate sur demande.",
  },
  {
    q: "Quelles cryptos sont supportées ?",
    a: "Plus de 40 cryptos majeures (Bitcoin, Ethereum, Solana, BNB, XRP, Cardano, Polygon, Avalanche, Chainlink, etc.) ainsi que les hidden gems suivies par notre rédaction. Devises : EUR ou USD.",
  },
  {
    q: "Le prix utilisé est-il fiable ?",
    a: "Source : CoinGecko (agrégateur de référence pour les exchanges régulés). Latence typique : 1 à 3 minutes entre la variation réelle et notre déclenchement. Suffisant pour des alertes patrimoniales, pas adapté au trading haute fréquence.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function AlertesPage() {
  // Source crypto unifiée (top10 + hidden gems éditoriaux). On dénormalise
  // au strict nécessaire pour le composant Client (économie de bytes hydrate).
  const cryptos: AlertCryptoOption[] = getAllCryptos().map((c) => ({
    id: c.id,
    coingeckoId: c.coingeckoId,
    name: c.name,
    symbol: c.symbol,
  }));

  // SEO Schemas — WebPage + Breadcrumb + FAQ groupés en @graph.
  const schemas = graphSchema([
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": PAGE_URL,
      url: PAGE_URL,
      name: "Alertes prix crypto par email — Cryptoreflex",
      description:
        "Outil gratuit pour recevoir un email dès qu'une crypto franchit un seuil de prix défini.",
      inLanguage: "fr-FR",
      isPartOf: { "@id": `${BRAND.url}/#website` },
      primaryImageOfPage: { "@type": "ImageObject", url: `${BRAND.url}/og-image.png` },
      datePublished: "2026-04-25",
      dateModified: new Date().toISOString().slice(0, 10),
    },
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Alertes prix", url: "/alertes" },
    ]),
    faqSchema(FAQ.map((f) => ({ question: f.q, answer: f.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData data={schemas} id="alertes-page" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/outils" className="hover:text-fg">Outils</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Alertes prix</span>
        </nav>

        {/* HERO */}
        <header className="mt-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-soft uppercase tracking-wider">
            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
            100 % gratuit · Sans compte
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">
            Crée tes <span className="gradient-text">alertes prix crypto</span>
            <br className="hidden sm:block" /> par email.
          </h1>
          <p className="mt-4 text-lg text-fg/80 max-w-3xl">
            Reçois un message dès qu'une crypto franchit ton seuil — Bitcoin
            au-dessus de 80 000 €, Ethereum sous 2 500 $, peu importe.
            Vérification quotidienne, désinscription en 1 clic.
          </p>

          {/* Trust signals */}
          <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
            <li className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-accent-green" aria-hidden="true" />
              RGPD &amp; opt-out direct
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              Données CoinGecko · cron quotidien
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary-soft" aria-hidden="true" />
              5 alertes max / email
            </li>
          </ul>
        </header>

        {/* Manager Client (form + liste) — wrapped in Suspense car
            <AlertsManager> utilise useSearchParams (?cryptoId=...). Sans Suspense,
            Next.js 14+ throw React error #329 au prerender. */}
        <section className="mt-10">
          <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-elevated/40" />}>
            <AlertsManager cryptos={cryptos} />
          </Suspense>
        </section>

        {/* Comment ça marche */}
        <section className="mt-16">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Comment ça marche
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            <li className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary font-bold">
                  1
                </span>
                <h3 className="text-base font-semibold text-fg">Choisis une crypto</h3>
              </div>
              <p className="mt-3 text-sm text-fg/75 leading-relaxed">
                Bitcoin, Ethereum, Solana, ou parmi les 40+ cryptos suivies.
                Sélecteur avec recherche.
              </p>
            </li>
            <li className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary font-bold">
                  2
                </span>
                <h3 className="text-base font-semibold text-fg">Définis ton seuil</h3>
              </div>
              <p className="mt-3 text-sm text-fg/75 leading-relaxed">
                "Au-dessus de 80 000 €" ou "en-dessous de 50 000 $". Au choix EUR ou USD.
              </p>
            </li>
            <li className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary font-bold">
                  3
                </span>
                <h3 className="text-base font-semibold text-fg">Reçois l'alerte</h3>
              </div>
              <p className="mt-3 text-sm text-fg/75 leading-relaxed">
                Email automatique dès que le seuil est franchi. Pas de pub, pas
                de revente d'email, pas de tracking croisé.
              </p>
            </li>
          </ol>
        </section>

        {/* Cas d'usage */}
        <section className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
            À qui ça sert ?
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-fg/85">
            <li className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
              <span><strong>DCA opportunistes</strong> : tu veux accélérer ton DCA Bitcoin si la chute dépasse -20 %.</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
              <span><strong>Take profit patient</strong> : ton plan dit "je vends 10 % d'ETH si on touche 5 000 $". L'alerte te le rappelle.</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
              <span><strong>Veille passive</strong> : tu suis une hidden gem mais tu ne veux pas regarder le prix tous les jours.</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" aria-hidden="true" />
              <span><strong>Stop-loss mental</strong> : être prévenu si un signal technique cassait, sans laisser un ordre live sur ton exchange.</span>
            </li>
          </ul>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Questions fréquentes
          </h2>
          <div className="mt-5 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-surface px-5 py-4 open:bg-elevated"
              >
                <summary className="cursor-pointer list-none font-semibold text-fg flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-muted group-open:rotate-180 transition-transform shrink-0">▾</span>
                </summary>
                <p className="mt-3 text-sm text-fg/80 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Mentions */}
        <p className="mt-12 text-[11px] text-muted leading-relaxed">
          Données prix : CoinGecko (vérification quotidienne par cron Cryptoreflex à 8h UTC).
          Cette page n'est pas un conseil en investissement — voir notre{" "}
          <Link href="/methodologie" className="underline hover:text-fg">méthodologie</Link>.
          Les emails sont envoyés depuis le domaine officiel <strong>{BRAND.domain}</strong>.
          Pour toute question : <a href={`mailto:${BRAND.email}`} className="underline">{BRAND.email}</a>.
        </p>
      </div>
    </article>
  );
}
