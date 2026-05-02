import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, TestTube2 } from "lucide-react";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { articleSchema, breadcrumbSchema, faqSchema, graphSchema } from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import Tldr from "@/components/ui/Tldr";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import LiveDot from "@/components/ui/LiveDot";

/**
 * /outils/dca-lab — DCA Lab Multi-Stratégies (BATCH 8 WOW).
 *
 * Audit innovation 2026-05-02 : "Le simulateur DCA classique compare
 * un montant fixe vs un lump sum. Insuffisant. DCA Lab : compare 6
 * stratégies (DCA simple, DCA-X RSI, Value Averaging, Lump-Sum,
 * 50/50 split, DCA-Out lump sum drawdown) sur n'importe quelle paire,
 * sur 1-7 ans. Côté pédagogique fort, viralité backtests."
 *
 * V1 : moteur de backtest côté serveur, données CryptoCompare/CoinGecko
 * cache 24h. Phase actuelle : landing + waitlist.
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "DCA Lab — Compare 6 stratégies DCA sur n'importe quelle crypto",
  description:
    "Simulateur avancé : DCA simple, DCA-X RSI, Value Averaging, Lump-Sum, 50/50, DCA-Out drawdown. Backtest sur 1-7 ans, toutes cryptos top 100. Vérifie quelle stratégie aurait gagné. Bientôt.",
  alternates: { canonical: `${BRAND.url}/outils/dca-lab` },
};

export default function DcaLabPage() {
  const faqItems = [
    {
      q: "C'est quoi la différence avec votre simulateur DCA classique ?",
      a: "Notre simulateur DCA standard (/outils/simulateur-dca) compare 1 stratégie DCA vs lump sum. Le DCA Lab compare 6 stratégies en parallèle sur la même période et la même crypto, avec graphique multi-courbes. C'est un outil d'éducation/recherche, pas de décision opérationnelle.",
    },
    {
      q: "Quelles 6 stratégies sont testées ?",
      a: "(1) DCA simple : montant fixe à fréquence fixe ; (2) DCA-X RSI : achat boosté quand RSI < 30, réduit quand RSI > 70 ; (3) Value Averaging : ajuste les apports pour maintenir un montant cible ; (4) Lump-Sum : tout investi à T0 ; (5) 50/50 : moitié lump-sum, moitié DCA sur 12 mois ; (6) DCA-Out drawdown : DCA tant que prix < 80 % ATH, pause sinon.",
    },
    {
      q: "Quels actifs sont supportés ?",
      a: "Top 100 cryptos par capitalisation, données historiques depuis 2018 (ou date de listing si plus récent). Sources : CryptoCompare API + CoinGecko. Tu choisis la crypto, la fréquence (quotidien/hebdo/mensuel), la période (1-7 ans), le montant.",
    },
    {
      q: "Pourquoi c'est intéressant pédagogiquement ?",
      a: "Parce que la plupart des « gourous » disent « DCA = solution ultime » sans contexte. Un backtest honnête montre que sur Bitcoin 2020-2024, lump-sum a battu DCA sur la plupart des périodes (marché haussier). Mais sur un actif baissier comme LUNA 2022, DCA a au moins limité la casse. L'outil te fait voir par toi-même.",
    },
    {
      q: "C'est gratuit ?",
      a: "V1 freemium : 3 backtests gratuits par mois (sans login), comparaison de 2 stratégies max. Pro/Pro+ : illimité, comparaison des 6 stratégies, export CSV, share-link.",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "outils/dca-lab",
      title: "DCA Lab — Compare 6 stratégies DCA sur n'importe quelle crypto",
      description: "Simulateur multi-stratégies DCA / Lump-Sum / Value Averaging / RSI-based / drawdown.",
      date: "2026-05-02",
      dateModified: "2026-05-02",
      category: "Outil",
      tags: ["DCA", "lump sum", "value averaging", "backtest", "stratégie crypto"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "DCA Lab", url: "/outils/dca-lab" },
    ]),
    faqSchema(faqItems.map((item) => ({ question: item.q, answer: item.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="dca-lab" data={schemas} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/outils" className="hover:text-fg">Outils</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">DCA Lab</span>
        </nav>

        <header className="mt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <Sparkles className="h-3 w-3" aria-hidden /> Bientôt — Q3 2026
          </span>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight">
            <span className="gradient-text">DCA Lab</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/80 leading-relaxed">
            Compare 6 stratégies d&apos;investissement crypto (DCA simple, DCA
            RSI, Value Averaging, Lump-Sum, 50/50, DCA-Out drawdown) sur
            n&apos;importe quelle crypto top 100, sur 1 à 7 ans. Voir laquelle
            aurait vraiment gagné — pas ce que le tweetos dit.
          </p>
          <div className="mt-3">
            <LiveDot variant="amber" label="Service en construction" />
          </div>
        </header>

        <div className="mt-8">
          <Tldr
            headline="Le débat DCA vs Lump-Sum est mal posé : il dépend de l'actif et de la période. Le DCA Lab te le montre chiffré, sans bullshit."
            bullets={[
              { emoji: "🧪", text: "6 stratégies testées en parallèle sur la même période" },
              { emoji: "📈", text: "Top 100 cryptos, historique depuis 2018" },
              { emoji: "🎯", text: "Fréquence flexible : quotidien / hebdo / mensuel" },
              { emoji: "🔗", text: "Share-link pour partager ton backtest (Pro)" },
            ]}
            readingTime="4 min"
            level="Intermédiaire"
          />
        </div>

        <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { name: "DCA simple", desc: "Montant fixe à fréquence fixe. Le classique." },
            { name: "DCA-X RSI", desc: "Boost quand RSI < 30, réduit si RSI > 70." },
            { name: "Value Averaging", desc: "Ajuste pour maintenir une valeur cible (Edleson)." },
            { name: "Lump-Sum", desc: "Tout investi à T0. Optimal en marché haussier." },
            { name: "50/50 hybride", desc: "Moitié lump-sum, moitié DCA sur 12 mois." },
            { name: "DCA-Out drawdown", desc: "DCA tant que prix < 80 % ATH, pause sinon." },
          ].map((s) => (
            <div key={s.name} className="rounded-2xl border border-border bg-elevated/40 p-5">
              <div className="text-xs uppercase tracking-wider text-primary-soft font-bold">
                Stratégie
              </div>
              <h3 className="mt-1 text-base font-bold">{s.name}</h3>
              <p className="mt-2 text-sm text-fg/80 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-10 text-center">
          <TestTube2 className="mx-auto h-10 w-10 text-primary" aria-hidden />
          <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold">Active l&apos;accès anticipé</h2>
          <p className="mt-3 text-sm text-fg/80 max-w-xl mx-auto">
            Lancement Q3 2026. Inscris-toi à la newsletter pour tester le
            DCA Lab en avant-première et recevoir des backtests pré-calculés
            sur les 10 cryptos majeures.
          </p>
          <Link href="/#cat-informe" className="mt-5 btn-primary btn-primary-shine">
            M&apos;inscrire <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>

        <div className="mt-10">
          <AmfDisclaimer variant="educatif" />
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
          <RelatedPagesNav currentPath="/outils/dca-lab" variant="default" limit={4} />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="tool" toolId="dca-lab" />
        </div>
      </div>
    </article>
  );
}
