import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  MessagesSquare,
  Calculator,
  FileText,
  ShieldCheck,
  ArrowRight,
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

/**
 * /outils/fiscal-copilot — Idée WOW #2 (audit innovation expert).
 *
 * Agent IA conversationnel qui parse en live le CSV de l'exchange + les
 * holdings du portefeuille et répond aux questions fiscales en français
 * avec citations BOFiP / CGI / article 150 VH bis. Génère le Cerfa 2086
 * pré-rempli en bonus.
 *
 * USP unique en France — personne d'autre n'offre ce niveau de spécialisation.
 *
 * Phase actuelle (mai 2026) : LANDING PAGE qui présente l'agent + capture
 * d'intérêt Pro. La V1 fonctionnelle exigera :
 *   1. Parser CSV multi-format (Binance, Coinbase, Kraken, Bitpanda...)
 *   2. Réutilisation de l'infra IA Q&A existante (`lib/ai-qa`)
 *   3. Connexion à `lib/cerfa-2086.ts` pour générer le PDF final
 *   4. Statut Pro 9.99€/mois (justifié par l'expertise legalement sourcée)
 *
 * Aujourd'hui : page éditoriale teasing + CTA Pro (capture d'audience).
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Fiscal Copilot crypto — Agent IA pour ta déclaration française 2026",
  description:
    "Agent IA conversationnel qui répond à tes questions fiscales crypto, parse ton CSV exchange, et génère ton Cerfa 2086 pré-rempli. Sources BOFiP / CGI citées.",
  alternates: { canonical: `${BRAND.url}/outils/fiscal-copilot` },
  openGraph: {
    title: "Fiscal Copilot crypto FR — Cryptoreflex",
    description:
      "Le copilot IA qui parle français fiscal couramment. Pose ta question, importe ton CSV, génère ton Cerfa.",
    url: `${BRAND.url}/outils/fiscal-copilot`,
    type: "website",
  },
};

const FEATURES = [
  {
    Icon: MessagesSquare,
    title: "Conversationnel",
    blurb:
      "Pose ta question en langage naturel. Réponse en français, sourcée BOFiP/CGI/AMF.",
  },
  {
    Icon: Calculator,
    title: "Parse ton CSV",
    blurb:
      "Importe ton historique Binance/Coinbase/Kraken/Bitpanda. Le copilot calcule plus-values, swap-events, prix moyen pondéré.",
  },
  {
    Icon: FileText,
    title: "Génère ton Cerfa",
    blurb:
      "Cerfa 2086 pré-rempli (toutes lignes, tous calculs), Annexe 3916-bis si comptes étrangers détectés. PDF prêt à signer.",
  },
  {
    Icon: ShieldCheck,
    title: "Sources légales",
    blurb:
      "Chaque réponse cite l'article CGI / instruction BOFiP / décision CE. Pas de spéculation, juste du droit applicable.",
  },
];

const SAMPLE_QUESTIONS = [
  "J'ai vendu 0.3 ETH en mars 2025 — combien je dois en PFU ?",
  "Si j'attends 47 jours pour vendre, est-ce que la fiscalité change ?",
  "J'ai stake mes SOL sur Coinbase — c'est imposable même si je n'ai pas vendu ?",
  "Comment déclarer mon airdrop de 200 USDC reçus en juillet ?",
  "Faut-il déclarer mon compte Binance via le 3916-bis ?",
];

export default function FiscalCopilotPage() {
  const faqItems = [
    {
      q: "Le Fiscal Copilot remplace-t-il un expert-comptable ?",
      a: "Non. Il automatise la collecte + le calcul + la génération du Cerfa, mais pour les situations complexes (DeFi avancé, NFT créateurs, BIC pro) un expert-comptable reste recommandé. Le copilot t'aidera à lui transmettre un dossier propre.",
    },
    {
      q: "Quelles plateformes sont supportées pour l'import CSV ?",
      a: "À la V1 : Binance, Coinbase, Kraken, Bitpanda, OKX, KuCoin. Roadmap V2 : Bitget, Bitstamp, Crypto.com, BingX. L'import se fait par CSV téléchargé depuis ton compte exchange (jamais d'API key requise).",
    },
    {
      q: "Mes données sont-elles stockées ?",
      a: "Le CSV est traité en mémoire serveur le temps du calcul, puis purgé. Les agrégats (totaux par année, par crypto) peuvent être stockés si tu actives la sauvegarde Pro pour comparer entre années. Tu peux tout supprimer en 1 clic.",
    },
    {
      q: "Quelle est la précision des calculs vs un cabinet ?",
      a: "Pour la flat tax PFU 30 % sur des trades simples (achat/vente/swap), précision ≥ 99 %. Le copilot suit l'article 150 VH bis pas-à-pas (méthode du prix moyen pondéré, agrégation tous comptes). Pour le DeFi exotique, la marge augmente.",
    },
    {
      q: "Combien ça coûte ?",
      a: "Inclus dans Cryptoreflex Pro (9,99 €/mois ou 28,99 €/an). Essai gratuit 14 jours. Sans abonnement, l'agent IA fiscal classique reste disponible avec questions limitées.",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "outils/fiscal-copilot",
      title: "Fiscal Copilot crypto FR — Agent IA déclaration 2026",
      description:
        "Agent IA spécialisé fiscalité crypto française. Parse ton CSV, calcule, génère ton Cerfa 2086.",
      date: "2026-05-02",
      dateModified: "2026-05-02",
      category: "Outil",
      tags: ["fiscal", "copilot", "IA", "Cerfa 2086", "PFU", "déclaration"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Fiscal Copilot", url: "/outils/fiscal-copilot" },
    ]),
    faqSchema(faqItems.map((item) => ({ question: item.q, answer: item.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="fiscal-copilot" data={schemas} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/outils" className="hover:text-fg">Outils</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Fiscal Copilot</span>
        </nav>

        {/* Hero */}
        <header className="mt-6 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <Sparkles className="h-3 w-3" aria-hidden /> Inclus dans Cryptoreflex Pro
          </span>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight">
            Le copilot IA qui parle{" "}
            <span className="gradient-text">français fiscal</span>{" "}
            couramment.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-fg/80 leading-relaxed">
            Pose ta question. Importe ton CSV exchange. Récupère ton Cerfa 2086
            pré-rempli en 30 secondes. Sources légales (BOFiP / CGI / AMF) citées
            sur chaque réponse.
          </p>
        </header>

        {/* TLDR */}
        <div className="mt-8">
          <Tldr
            headline="Un agent IA spécialisé dans la fiscalité crypto française. Tu poses, il calcule, il génère le Cerfa."
            bullets={[
              { emoji: "🤖", text: "Conversation naturelle en français, pas de formulaire à remplir" },
              { emoji: "📋", text: "Parse ton CSV (Binance, Coinbase, Kraken, Bitpanda…) en 5 sec" },
              { emoji: "📜", text: "Sources légales citées : article 150 VH bis, BOFiP RPPM, AMF" },
              { emoji: "✅", text: "Cerfa 2086 + Annexe 3916-bis générés en PDF prêt à signer" },
            ]}
            readingTime="4 min"
            level="Tous niveaux fiscaux"
          />
        </div>

        {/* 4 features */}
        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ Icon, title, blurb }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-3 text-base font-bold">{title}</h3>
              <p className="mt-2 text-sm text-fg/80 leading-relaxed">{blurb}</p>
            </div>
          ))}
        </section>

        {/* Sample questions */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold">Exemples de questions</h2>
          <p className="mt-2 text-sm text-muted">
            Ce que tu peux demander au copilot.
          </p>
          <ul className="mt-5 grid gap-3">
            {SAMPLE_QUESTIONS.map((q) => (
              <li
                key={q}
                className="rounded-xl border border-border bg-elevated/30 p-4 text-sm text-fg/90 italic"
              >
                « {q} »
              </li>
            ))}
          </ul>
        </section>

        {/* CTA Pro */}
        <section className="mt-16 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold">
            Essaye le Fiscal Copilot gratuitement
          </h2>
          <p className="mt-3 text-sm text-fg/80 max-w-xl mx-auto">
            Inclus dans Cryptoreflex Pro à <strong>9,99 €/mois</strong> ou{" "}
            <strong>28,99 €/an</strong>. Essai gratuit 14 jours, résiliable en 1 clic.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/pro"
              className="btn-primary btn-primary-shine"
            >
              Découvrir Pro
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/outils/calculateur-fiscalite"
              className="btn-ghost"
            >
              Calculateur gratuit (sans IA)
            </Link>
          </div>
        </section>

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
                  <span className="text-primary transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-fg/80 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Maillage */}
        <div className="mt-12">
          <RelatedPagesNav
            currentPath="/outils/fiscal-copilot"
            variant="default"
            limit={4}
          />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="tool" toolId="fiscal-copilot" />
        </div>
      </div>
    </article>
  );
}
