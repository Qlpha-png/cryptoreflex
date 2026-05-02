import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Sparkles, ArrowRight } from "lucide-react";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import { articleSchema, breadcrumbSchema, faqSchema, graphSchema } from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import Tldr from "@/components/ui/Tldr";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import LiveDot from "@/components/ui/LiveDot";

/**
 * /outils/allocator-ia — Allocator IA Crypto FR (idée innovation #3).
 *
 * Audit innovation 2026-05-02 : "Question 5 critères (horizon, risque,
 * objectif, budget, conviction BTC) → propose une allocation %BTC/%ETH/
 * %altcoins justifiée + lien vers les fiches Cryptoreflex correspondantes."
 *
 * V1 : moteur déterministe (rule-based) côté serveur ; pas de LLM (coût).
 * Phase actuelle : landing + waitlist.
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Allocator IA Crypto — Allocation portefeuille personnalisée FR",
  description:
    "Réponds à 5 questions (horizon, risque, conviction BTC, budget, objectif) → tu reçois une allocation crypto adaptée (%BTC, %ETH, %alts), justifiée par notre méthodologie et reliée aux fiches Cryptoreflex.",
  alternates: { canonical: `${BRAND.url}/outils/allocator-ia` },
};

export default function AllocatorIaPage() {
  const faqItems = [
    {
      q: "C'est un conseil en investissement ?",
      a: "Non. Cryptoreflex n'est ni CIF, ni PSAN/CASP, ni gestionnaire d'actifs. L'allocation suggérée est purement éducative — basée sur les modèles classiques de portefeuille (Markowitz simplifié, satellite-core) et publiée pour t'aider à réfléchir, pas à décider à ta place.",
    },
    {
      q: "Quel est le moteur derrière l'« IA » ?",
      a: "Phase 1 : moteur déterministe à règles (5 critères → matrice de notation → allocation parmi 12 profils types). Pas de LLM coûteux ni de boîte noire. Phase 2 (2027) : optionnellement, ajustement d'un modèle léger sur historiques 2018-2026 pour affiner les pondérations.",
    },
    {
      q: "Pourquoi limiter aux cryptos suivies par Cryptoreflex ?",
      a: "Pour deux raisons. (1) On ne recommande que des actifs qu'on a vérifiés (score fiabilité > 60/100, équipe identifiée, métriques on-chain vérifiables). (2) Pour rester honnête : si on t'envoyait sur la première shitcoin venue, ce serait du marketing déguisé — pas notre genre.",
    },
    {
      q: "C'est gratuit ou Pro ?",
      a: "Version gratuite : 1 allocation par mois (sans compte). Pro/Pro+ : allocations illimitées + comparaison côte à côte avec rééquilibrage suggéré tous les 3 mois + export CSV/PDF.",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "outils/allocator-ia",
      title: "Allocator IA Crypto — allocation portefeuille personnalisée FR",
      description: "Outil gratuit d'aide à l'allocation crypto basé sur 5 critères.",
      date: "2026-05-02",
      dateModified: "2026-05-02",
      category: "Outil",
      tags: ["allocation", "portefeuille", "diversification", "IA"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Allocator IA", url: "/outils/allocator-ia" },
    ]),
    faqSchema(faqItems.map((item) => ({ question: item.q, answer: item.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="allocator-ia" data={schemas} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/outils" className="hover:text-fg">Outils</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Allocator IA</span>
        </nav>

        <header className="mt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <Sparkles className="h-3 w-3" aria-hidden /> Bientôt — Q3 2026
          </span>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight">
            <span className="gradient-text">Allocator IA</span> Crypto
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/80 leading-relaxed">
            Réponds à 5 questions simples (horizon, tolérance au risque,
            conviction Bitcoin, budget, objectif). On te propose une allocation
            personnalisée %BTC / %ETH / %altcoins, justifiée et reliée aux
            fiches Cryptoreflex.
          </p>
          <div className="mt-3">
            <LiveDot variant="amber" label="Service en construction" />
          </div>
        </header>

        <div className="mt-8">
          <Tldr
            headline="Un outil pédagogique pour t'aider à structurer ton portefeuille crypto sans suivre aveuglément un influenceur."
            bullets={[
              { emoji: "🧠", text: "Moteur déterministe transparent — pas de boîte noire" },
              { emoji: "🎯", text: "5 critères : horizon, risque, conviction BTC, budget, objectif" },
              { emoji: "📊", text: "Allocation justifiée : %BTC, %ETH, %alts top10, %satellites" },
              { emoji: "🔗", text: "Liens directs vers fiches Cryptoreflex pour chaque actif" },
            ]}
            readingTime="3 min"
            level="Débutant à intermédiaire"
          />
        </div>

        <section className="mt-12 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-10 text-center">
          <Brain className="mx-auto h-10 w-10 text-primary" aria-hidden />
          <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold">Sois prévenu·e au lancement</h2>
          <p className="mt-3 text-sm text-fg/80 max-w-xl mx-auto">
            Lancement Q3 2026. Inscris-toi à la newsletter pour avoir l&apos;accès
            anticipé et tester le moteur sur ton propre profil.
          </p>
          <Link href="/#cat-informe" className="mt-5 btn-primary btn-primary-shine">
            M&apos;inscrire <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { title: "Profil prudent", body: "60-70 % BTC, 20-30 % ETH, 0-10 % alts top 10. Horizon 5+ ans, faible tolérance volatilité." },
            { title: "Profil équilibré", body: "40-50 % BTC, 25-35 % ETH, 15-25 % alts top 10, 0-5 % satellites. Horizon 3-5 ans." },
            { title: "Profil offensif", body: "25-35 % BTC, 25-35 % ETH, 25-35 % alts, 5-15 % satellites narratifs. Horizon 1-3 ans." },
          ].map((p) => (
            <div key={p.title} className="rounded-2xl border border-border bg-elevated/40 p-5">
              <div className="text-[10px] uppercase tracking-wider text-primary-soft font-bold">
                Exemple
              </div>
              <h3 className="mt-1 text-base font-bold">{p.title}</h3>
              <p className="mt-2 text-sm text-fg/80 leading-relaxed">{p.body}</p>
            </div>
          ))}
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
          <RelatedPagesNav currentPath="/outils/allocator-ia" variant="default" limit={4} />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="tool" toolId="allocator-ia" />
        </div>
      </div>
    </article>
  );
}
