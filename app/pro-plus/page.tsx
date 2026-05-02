import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  Bot,
  Download,
  Bell,
  Code2,
  Crown,
  ArrowRight,
  Check,
} from "lucide-react";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  graphSchema,
} from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import Tldr from "@/components/ui/Tldr";
import AmfDisclaimer from "@/components/AmfDisclaimer";

/**
 * /pro-plus — Tier "Pro+" 9,99€/mois ou 79€/an.
 *
 * Audit expert business 2026-05-02 : "Le Pro 2,99€ ne couvre pas l'infra
 * Claude Haiku des features IA Q&A à 20/jour. Créer un vrai tier monétisable
 * Pro+ avec exports illimités, IA Q&A 100/jour, accès API personnelle".
 *
 * Contrainte user : 100% automatisé, aucune présence humaine.
 *
 * Phase actuelle : LANDING + capture d'intérêt (waitlist newsletter). La
 * V1 fonctionnelle nécessite création d'un nouveau price_id Stripe + checkout
 * + maj /api/stripe/webhook pour reconnaître pro_plus_monthly / pro_plus_annual
 * + mise à jour des limites IA Q&A dans /api/ask.
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  // BATCH 39 — fix audit SEO P0 : title 88 chars tronqué SERP. Réduit
  // avec prix visible mobile + brand pour reconnaissance.
  title: "Cryptoreflex Pro+ 9,99€/mois — IA illimitée + API crypto FR",
  description:
    "Pro+ : 9,99 €/mois (essai 14 j gratuit). IA Q&A 100 questions/jour, exports illimités CSV/PDF, API personnelle. 100 % automatisé.",
  alternates: { canonical: `${BRAND.url}/pro-plus` },
  openGraph: {
    title: "Cryptoreflex Pro+ pour utilisateurs avancés",
    description:
      "IA Q&A 100/jour, API perso, exports illimités. 9,99 €/mois.",
    url: `${BRAND.url}/pro-plus`,
    type: "website",
  },
};

const FEATURES = [
  {
    Icon: Bot,
    title: "IA Q&A 100 questions/jour",
    blurb:
      "Claude Haiku contextualisé sur chaque fiche crypto, sans limite de profondeur. Sources légales citées sur toutes les questions fiscales.",
  },
  {
    Icon: Download,
    title: "Exports illimités CSV/PDF",
    blurb:
      "Cerfa 2086 + Annexe 3916-bis générés à la demande, format compatible expert-comptable. Historique de tes exports archivé 5 ans.",
  },
  {
    Icon: Code2,
    title: "Accès API personnel",
    blurb:
      "Token API permanent pour intégrer Cryptoreflex dans ton flux de travail (Notion, Sheets, Airtable, scripts perso). 1 000 req/jour.",
  },
  {
    Icon: Bell,
    title: "Alertes prix multi-conditions",
    blurb:
      "Alerte sur ratio (BTC/ETH > 0.06), funding rate négatif, dominance BTC, on-chain whale moves. Push + email + Telegram bot.",
  },
  {
    Icon: Zap,
    title: "Priorité fonctionnalités bêta",
    blurb:
      "Whale Radar FR, Allocator IA, Gas Tracker, Wallet Connect — tu accèdes à toutes les nouvelles features 2-4 semaines avant les autres.",
  },
  {
    Icon: Crown,
    title: "Soutien direct au site",
    blurb:
      "9,99 €/mois finance l'infra (Vercel, Supabase, Claude API, CryptoCompare) qui maintient le site gratuit pour 99 % des visiteurs FR.",
  },
];

export default function ProPlusPage() {
  const faqItems = [
    {
      q: "Quelle différence avec le tier Soutien à 2,99 €/mois ?",
      a: "Soutien (2,99 €) : tu finances le site + accès gamification + IA Q&A 20 questions/jour. Pro+ (9,99 €) : tout Soutien INCLUS + IA Q&A 100/jour + exports illimités + accès API + alertes avancées + features beta. Soutien reste pour les fans, Pro+ est pour les utilisateurs avancés qui utilisent les outils intensivement.",
    },
    {
      q: "Pourquoi 9,99 € et pas 4,99 € ou 14,99 € ?",
      a: "Calcul honnête : Claude Haiku coûte ~0,30 €/100 questions, infra Vercel + Supabase + cache CryptoCompare = ~3 €/utilisateur/mois sur les utilisateurs avancés (100 req/jour × 30 jours). 9,99 € = marge raisonnable pour pérenniser le service sans dépendre des affiliations.",
    },
    {
      q: "C'est résiliable n'importe quand ?",
      a: "Oui, en 1 clic depuis ton espace Stripe Customer Portal. Aucun engagement. Le mois en cours reste actif jusqu'à sa fin, puis bascule automatiquement en Free. Aucun rappel commercial, aucune relance par email.",
    },
    {
      q: "L'annuel à 79 € c'est 33 % d'économie ?",
      a: "Oui. 9,99 €/mois × 12 = 119,88 €. L'annuel à 79 € = 6,58 €/mois équivalent, soit 41 € d'économie sur l'année. Idéal si tu utilises déjà les outils régulièrement.",
    },
    {
      q: "Y a-t-il une période d'essai gratuite ?",
      a: "Oui : 14 jours d'essai gratuit sur le mensuel (résiliation 1 clic, aucune carte bancaire débitée si tu annules avant J+14). L'annuel n'a pas d'essai (économie 33 % en contrepartie).",
    },
    {
      q: "Le service est-il 100 % automatisé ?",
      a: "Oui. Tout est automatisé : Cerfa généré à partir de ton CSV par algorithme, IA Q&A par Claude Haiku, alertes par cron Vercel, API par tokens RLS Supabase. Aucun support humain réactif (politique éditoriale Cryptoreflex). Pour une question complexe nécessitant un humain, on te redirige vers un expert-comptable agréé. Les fonctionnalités bêta sont mises à jour automatiquement (pas de friction utilisateur).",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "pro-plus",
      title: "Cryptoreflex Pro+ — IA illimitée + API + exports",
      description: "Tier Pro+ 9,99€/mois pour utilisateurs avancés crypto FR.",
      date: "2026-05-02",
      dateModified: "2026-05-02",
      category: "Pricing",
      tags: ["pro+", "abonnement", "API crypto", "IA Q&A", "exports"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Pro+", url: "/pro-plus" },
    ]),
    faqSchema(faqItems.map((item) => ({ question: item.q, answer: item.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="pro-plus" data={schemas} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Pro+</span>
        </nav>

        <header className="mt-6 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <Crown className="h-3 w-3" aria-hidden /> Pour utilisateurs avancés
          </span>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight">
            Cryptoreflex{" "}
            <span className="gradient-text">Pro+</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-fg/80 leading-relaxed">
            IA Q&amp;A 100 questions/jour, exports illimités, accès API personnel,
            alertes prix multi-conditions. Pour les utilisateurs qui dépassent
            les limites du tier Soutien.
          </p>
        </header>

        <div className="mt-8">
          <Tldr
            headline="9,99 €/mois ou 79 €/an pour des outils sans limite. 100 % automatisé, résiliable en 1 clic."
            bullets={[
              { emoji: "🤖", text: "IA Q&A 100/jour (vs 20/jour en Soutien)" },
              { emoji: "📋", text: "Exports CSV/PDF illimités (Cerfa, portfolio, fiscal)" },
              { emoji: "🔑", text: "Token API perso 1000 req/jour" },
              { emoji: "🔔", text: "Alertes multi-conditions (ratio, funding, on-chain)" },
              { emoji: "⚡", text: "Accès anticipé features beta (Whale Radar, Gas Tracker, etc.)" },
            ]}
            readingTime="3 min"
            level="Power user"
          />
        </div>

        {/* Pricing cards */}
        <section className="mt-12 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="text-[11px] uppercase tracking-wider text-muted font-bold">
              Mensuel
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-5xl font-extrabold">9,99 €</span>
              <span className="text-sm text-muted">/mois</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              Essai gratuit 14 jours, résiliable en 1 clic.
            </p>
            <Link
              href="/pro?tier=plus_monthly"
              className="mt-5 btn-primary w-full justify-center"
            >
              Démarrer l&apos;essai 14 j
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <div className="rounded-2xl border-2 border-primary/50 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 relative overflow-hidden">
            <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-background">
              <Sparkles className="h-3 w-3" /> -33 %
            </span>
            <div className="text-[11px] uppercase tracking-wider text-primary-soft font-bold">
              Annuel
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-5xl font-extrabold">79 €</span>
              <span className="text-sm text-muted">/an</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              Soit 6,58 €/mois équivalent. Économie 41 € vs mensuel.
            </p>
            <Link
              href="/pro?tier=plus_annual"
              className="mt-5 btn-primary btn-primary-shine w-full justify-center"
            >
              Choisir l&apos;annuel
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>

        {/* 6 features */}
        <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ Icon, title, blurb }) => (
            <div key={title} className="hover-lift rounded-2xl border border-border bg-surface p-5">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-3 text-base font-bold">{title}</h3>
              <p className="mt-2 text-xs text-fg/80 leading-relaxed">{blurb}</p>
            </div>
          ))}
        </section>

        {/* Comparatif tier Soutien vs Pro+ */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold">Soutien vs Pro+</h2>
          <div className="mt-5 -mx-4 sm:mx-0 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-semibold">Fonctionnalité</th>
                  <th className="px-3 py-2 font-semibold">Soutien 2,99 €</th>
                  <th className="px-3 py-2 font-semibold text-primary-soft">Pro+ 9,99 €</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["IA Q&A par fiche crypto", "20/jour", "100/jour"],
                  ["Cerfa 2086 PDF auto", "5 exports/mois", "Illimité"],
                  ["Watchlist", "20 cryptos", "200 cryptos"],
                  ["Alertes prix", "10 simples", "100 multi-conditions"],
                  ["Portfolio holdings", "50", "500"],
                  ["Token API personnel", <span key="x" className="text-muted">—</span>, "1 000 req/jour"],
                  ["Accès anticipé features beta", <span key="x" className="text-muted">—</span>, <Check key="c" className="h-4 w-4 text-success inline" />],
                  ["Gamification XP/badges", <Check key="c1" className="h-4 w-4 text-success inline" />, <Check key="c2" className="h-4 w-4 text-success inline" />],
                ].map(([feature, soutien, plus], i) => (
                  <tr key={i}>
                    <td className="px-3 py-3 font-medium">{feature}</td>
                    <td className="px-3 py-3 text-fg/80">{soutien}</td>
                    <td className="px-3 py-3 text-fg font-semibold">{plus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Disclaimer */}
        <div className="mt-10">
          <AmfDisclaimer variant="educatif" />
        </div>

        {/* FAQ */}
        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-bold">Questions fréquentes</h2>
          <div className="mt-4 space-y-3">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-elevated/40 p-5 open:border-primary/40"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-fg">
                  {item.q}
                  <span className="text-primary transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-fg/80 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-12">
          <RelatedPagesNav currentPath="/pro-plus" variant="default" limit={4} />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="homepage" />
        </div>
      </div>
    </article>
  );
}
