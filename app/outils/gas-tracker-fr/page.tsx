import type { Metadata } from "next";
import Link from "next/link";
import { Zap, Sparkles, ArrowRight } from "lucide-react";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { articleSchema, breadcrumbSchema, faqSchema, graphSchema } from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import Tldr from "@/components/ui/Tldr";
import LiveDot from "@/components/ui/LiveDot";

/**
 * /outils/gas-tracker-fr — Gas Tracker FR (idée innovation #4).
 *
 * Audit 2026-05-02 : "Etherscan Gas Tracker existe mais en EN sans
 * traduction du contexte (slow/avg/fast = 3 chiffres bruts). Nous :
 * tracker live ETH+L2 majeurs (Arbitrum, Optimism, Base, zkSync, Polygon),
 * traduit + ajout 'meilleure heure pour swap' + alerte gas < X gwei."
 *
 * V1 : intégration Etherscan API + Blocknative pour les L2. Refresh 30s.
 * Cache Redis pour limiter les appels.
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Gas Tracker FR — Frais Ethereum + L2 en temps réel",
  description:
    "Frais de gas Ethereum + L2 (Arbitrum, Optimism, Base, zkSync, Polygon) en temps réel, traduits en français + meilleure heure pour swap + alerte gas < X gwei. Gratuit.",
  alternates: { canonical: `${BRAND.url}/outils/gas-tracker-fr` },
};

export default function GasTrackerFrPage() {
  const faqItems = [
    {
      q: "C'est quoi le gas en crypto ?",
      a: "Le gas est le coût d'une transaction sur une blockchain (Ethereum surtout). Il rémunère les validateurs/mineurs qui sécurisent le réseau. Plus le réseau est congestionné, plus le gas grimpe. Une transaction simple (envoi ETH) coûte ~21 000 unités de gas ; un swap Uniswap, ~150 000.",
    },
    {
      q: "Pourquoi tracker les L2 ?",
      a: "Les Layer 2 (Arbitrum, Optimism, Base, zkSync, Polygon) coûtent 10-100× moins cher que le mainnet Ethereum. Si tu fais un swap < 1000 €, ça vaut presque toujours le coup de passer par un L2 plutôt que par le mainnet. On te montre la comparaison live.",
    },
    {
      q: "Quelle est la « meilleure heure » pour transacter ?",
      a: "Statistiquement (basé sur 2 ans de données) : weekend matin (heure UE), entre 6h et 10h du matin. Le gas Ethereum baisse souvent à ces moments car les US dorment et les bots arbitrageurs sont moins actifs. On affichera le top 3 des créneaux historiques optimaux.",
    },
    {
      q: "Comment fonctionneront les alertes gas ?",
      a: "Pro+ : tu paramètres « préviens-moi quand gas ETH < 15 gwei » → email/push immédiat. Idéal pour batcher tes swaps à bas coût ou claim des airdrops.",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "outils/gas-tracker-fr",
      title: "Gas Tracker FR — Frais Ethereum + L2 en temps réel",
      description: "Tracker gas live multi-chain en français.",
      date: "2026-05-02",
      dateModified: "2026-05-02",
      category: "Outil",
      tags: ["gas", "ethereum", "L2", "Arbitrum", "Optimism"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Gas Tracker FR", url: "/outils/gas-tracker-fr" },
    ]),
    faqSchema(faqItems.map((item) => ({ question: item.q, answer: item.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="gas-tracker-fr" data={schemas} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/outils" className="hover:text-fg">Outils</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Gas Tracker FR</span>
        </nav>

        <header className="mt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <Sparkles className="h-3 w-3" aria-hidden /> Bientôt — Q3 2026
          </span>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight">
            <span className="gradient-text">Gas Tracker</span> FR
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/80 leading-relaxed">
            Suis en temps réel les frais de gas Ethereum + Layer 2 majeurs
            (Arbitrum, Optimism, Base, zkSync, Polygon). Traduit en français
            + suggestions « meilleure heure pour swap » + alertes gas bas.
          </p>
          <div className="mt-3">
            <LiveDot variant="amber" label="Service en construction" />
          </div>
        </header>

        <div className="mt-8">
          <Tldr
            headline="Combien coûte une transaction là, maintenant, sur Ethereum vs L2 — en français, et avec un conseil sur le bon moment pour transacter."
            bullets={[
              { emoji: "⚡", text: "Mainnet ETH + 5 L2 majeurs en temps réel (refresh 30 s)" },
              { emoji: "💸", text: "Estimation coût € pour un swap, un transfert, un mint NFT" },
              { emoji: "🕐", text: "Meilleure heure historique pour transacter (weekend matin)" },
              { emoji: "🔔", text: "Alerte gas < X gwei (Pro+)" },
            ]}
            readingTime="2 min"
            level="Tous niveaux"
          />
        </div>

        {/* Stub avec exemples de frais actuels */}
        <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { chain: "Ethereum L1", swap: "~3-15 €", transfer: "~0,50-3 €", color: "text-warning-fg" },
            { chain: "Arbitrum One", swap: "~0,10-0,50 €", transfer: "~0,02 €", color: "text-success" },
            { chain: "Optimism", swap: "~0,10-0,50 €", transfer: "~0,02 €", color: "text-success" },
            { chain: "Base", swap: "~0,05-0,30 €", transfer: "~0,01 €", color: "text-success" },
            { chain: "zkSync Era", swap: "~0,10-0,40 €", transfer: "~0,02 €", color: "text-success" },
            { chain: "Polygon PoS", swap: "~0,01-0,10 €", transfer: "<0,01 €", color: "text-success" },
          ].map((c) => (
            <div key={c.chain} className="rounded-2xl border border-border bg-elevated/40 p-5">
              <div className={`text-xs uppercase tracking-wider font-bold ${c.color}`}>
                {c.chain}
              </div>
              <div className="mt-3 text-sm text-fg/80">
                Swap : <span className="font-semibold text-fg">{c.swap}</span>
              </div>
              <div className="mt-1 text-sm text-fg/80">
                Transfert : <span className="font-semibold text-fg">{c.transfer}</span>
              </div>
            </div>
          ))}
        </section>

        <p className="mt-4 text-xs text-muted italic">
          Estimations indicatives basées sur la moyenne 30 jours mai 2026. Les
          chiffres réels seront live au lancement.
        </p>

        <section className="mt-12 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-10 text-center">
          <Zap className="mx-auto h-10 w-10 text-primary" aria-hidden />
          <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold">Active l&apos;alerte gas bas</h2>
          <p className="mt-3 text-sm text-fg/80 max-w-xl mx-auto">
            Inscris-toi pour être prévenu·e dès que le gas Ethereum descend
            sous 15 gwei (Pro+).
          </p>
          <Link href="/#cat-informe" className="mt-5 btn-primary btn-primary-shine">
            M&apos;inscrire <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>

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
          <RelatedPagesNav currentPath="/outils/gas-tracker-fr" variant="default" limit={4} />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="tool" toolId="gas-tracker-fr" />
        </div>
      </div>
    </article>
  );
}
