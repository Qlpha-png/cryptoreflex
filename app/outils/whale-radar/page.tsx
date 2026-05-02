import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { articleSchema, breadcrumbSchema, faqSchema, graphSchema } from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import Tldr from "@/components/ui/Tldr";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import LiveDot from "@/components/ui/LiveDot";

/**
 * /outils/whale-radar — Whale Radar FR (idée innovation #1).
 *
 * Audit expert produit innovation 2026-05-02 : "Flux temps réel des
 * mouvements > 500 BTC / 10k ETH / mouvements exchanges, commenté en
 * français. Whale Alert existe en EN, aucun équivalent francisé +
 * contextualisé en France."
 *
 * Phase actuelle : LANDING + waitlist. V1 fonctionnelle exigera
 * abonnement Whale Alert API (~$50/mo) + WebSocket + cache Redis.
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Whale Radar FR — Surveillance temps réel des mouvements crypto majeurs",
  description:
    "Bientôt : flux live des transactions > 500 BTC / 10 000 ETH / dépôts-retraits exchanges majeurs, commentés en français. Premier service de surveillance whale francisé.",
  alternates: { canonical: `${BRAND.url}/outils/whale-radar` },
};

export default function WhaleRadarPage() {
  const faqItems = [
    {
      q: "C'est quoi un whale dans le crypto ?",
      a: "Un whale (« baleine ») est un acteur qui détient une quantité de crypto suffisamment grande pour influencer le marché par ses transactions. En général : >500 BTC (>30M €) ou >10 000 ETH (>20M €). Suivre leurs mouvements peut donner des signaux avancés (vente massive imminente, accumulation institutionnelle, déplacement vers un exchange = vente probable).",
    },
    {
      q: "Pourquoi un service francisé ?",
      a: "Whale Alert (EN) lance des tweets en anglais sans contexte. Whale Radar FR ajoute : traduction française + contextualisation (« cette baleine a accumulé +5000 BTC depuis 2020 »), filtrage par crypto, et alertes email/push intégrées au compte Cryptoreflex.",
    },
    {
      q: "C'est gratuit ou Pro ?",
      a: "V1 freemium : 5 dernières alertes whale gratuites, refresh manuel. Pro+ (9,99 €/mois) : refresh live, alertes push/email custom (« prévenir si > X BTC entre dans Binance »), historique 90 jours.",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "outils/whale-radar",
      title: "Whale Radar FR — Surveillance temps réel mouvements crypto majeurs",
      description: "Premier service de surveillance whale francisé.",
      date: "2026-05-02",
      dateModified: "2026-05-02",
      category: "Outil",
      tags: ["whale alert", "on-chain", "BTC", "ETH", "exchanges flow"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Whale Radar FR", url: "/outils/whale-radar" },
    ]),
    faqSchema(faqItems.map((item) => ({ question: item.q, answer: item.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="whale-radar" data={schemas} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/outils" className="hover:text-fg">Outils</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Whale Radar FR</span>
        </nav>

        <header className="mt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <Sparkles className="h-3 w-3" aria-hidden /> Bientôt — Q3 2026
          </span>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight">
            <span className="gradient-text">Whale Radar</span> FR
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/80 leading-relaxed">
            Suis en temps réel les mouvements des plus gros porteurs crypto :
            transferts &gt; 500 BTC / 10 000 ETH, dépôts massifs sur exchanges
            (= vente probable), retraits massifs (= accumulation). Premier
            service francisé.
          </p>
          <div className="mt-3">
            <LiveDot variant="amber" label="Service en construction" />
          </div>
        </header>

        <div className="mt-8">
          <Tldr
            headline="Whale Alert mais en français + contextualisé + intégré à Cryptoreflex."
            bullets={[
              { emoji: "🐋", text: "Flux live > 500 BTC / 10k ETH / mouvements exchanges majeurs" },
              { emoji: "🇫🇷", text: "Commentaires français + historique whale connu" },
              { emoji: "🔔", text: "Alertes push/email custom (Pro+)" },
              { emoji: "📊", text: "Dashboard inflows/outflows Binance, Coinbase, Kraken" },
            ]}
            readingTime="3 min"
            level="Intermédiaire"
          />
        </div>

        {/* CTA waitlist */}
        <section className="mt-12 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold">Sois prévenu·e au lancement</h2>
          <p className="mt-3 text-sm text-fg/80 max-w-xl mx-auto">
            Lancement Q3 2026. Inscris-toi à la newsletter pour avoir accès
            anticipé.
          </p>
          <Link href="/#cat-informe" className="mt-5 btn-primary btn-primary-shine">
            M&apos;inscrire <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>

        <div className="mt-10">
          <AmfDisclaimer variant="speculation" />
        </div>

        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-bold">Questions fréquentes</h2>
          <div className="mt-4 space-y-3">
            {faqItems.map((item) => (
              <details key={item.q} className="group rounded-xl border border-border bg-elevated/40 p-5 open:border-primary/40">
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
          <RelatedPagesNav currentPath="/outils/whale-radar" variant="default" limit={4} />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="tool" toolId="whale-radar" />
        </div>
      </div>
    </article>
  );
}
