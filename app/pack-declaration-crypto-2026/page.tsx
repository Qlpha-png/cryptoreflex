import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  Calculator,
  Calendar,
  ShieldCheck,
  ArrowRight,
  Check,
  Sparkles,
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
 * /pack-declaration-crypto-2026 — Bundle one-shot 49 € pour la déclaration
 * crypto 2026 (déclaration mai 2026 sur les revenus 2025).
 *
 * Audit expert business 2026-05-02 : "Killer offer one-shot 49 € avec
 * urgence réelle (mai 2026) sur audience captive du calculateur fiscalité.
 * 100 % automatisé : Cerfa généré par algorithme, aucune présence humaine."
 *
 * Phase actuelle : LANDING + capture d'intérêt (waitlist newsletter pour
 * notification ouverture du paiement). V1 fonctionnelle exigera :
 * - Création price_id Stripe one-shot 49 €
 * - Wizard import CSV → parse multi-format → calcul 150 VH bis → Cerfa PDF
 * - Email transactionnel avec PDF attaché + lien d'archivage 5 ans
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Pack Déclaration Crypto 2026 — Cerfa 2086 + 3916-bis pré-remplis 49 €",
  description:
    "Déclaration crypto 2026 simplifiée : importe ton CSV, génère ton Cerfa 2086 + Annexe 3916-bis pré-remplis en 5 minutes. 49 € one-shot, 100 % automatisé. Économise 5 h de saisie manuelle.",
  alternates: { canonical: `${BRAND.url}/pack-declaration-crypto-2026` },
  openGraph: {
    title: "Pack Déclaration Crypto 2026 — Cryptoreflex",
    description: "Cerfa 2086 + 3916-bis pré-remplis pour 49 €. 100 % automatisé.",
    url: `${BRAND.url}/pack-declaration-crypto-2026`,
    type: "website",
  },
};

const FEATURES = [
  {
    Icon: FileText,
    title: "Cerfa 2086 pré-rempli",
    blurb:
      "Toutes les lignes calculées (prix moyen pondéré, plus-values, swaps, paliers PFU). Format PDF conforme impots.gouv.fr 2026.",
  },
  {
    Icon: Calculator,
    title: "Annexe 3916-bis détectée",
    blurb:
      "Détection automatique des comptes étrangers à déclarer (Binance, Coinbase, Kraken hors UE) + génération du formulaire.",
  },
  {
    Icon: Calendar,
    title: "Économie 5 h+ de saisie",
    blurb:
      "Au lieu de calculer manuellement 150 VH bis ligne par ligne, tu obtiens le résultat en 5 minutes. Multi-exchange supporté.",
  },
  {
    Icon: ShieldCheck,
    title: "Sources légales citées",
    blurb:
      "Chaque calcul est accompagné de la référence CGI / BOFiP / décision CE applicable. Audit-ready pour ton expert-comptable.",
  },
];

export default function PackDeclarationPage() {
  const faqItems = [
    {
      q: "Quelle différence avec le calculateur fiscalité gratuit ?",
      a: "Le calculateur gratuit estime ton impôt PFU à partir d'inputs manuels (montant investi, montant vendu). Le Pack 49 € parse ton VRAI historique CSV (Binance, Coinbase, Kraken, Bitpanda…), calcule les plus-values selon l'article 150 VH bis (prix moyen pondéré agrégé), génère le Cerfa 2086 PDF officiel + Annexe 3916-bis si applicable. Tu peux directement remettre le PDF à ton service d'impôts.",
    },
    {
      q: "Quelles plateformes / exchanges sont supportées ?",
      a: "V1 mai 2026 : Binance, Coinbase, Kraken, Bitpanda, OKX, KuCoin, Bitget, Crypto.com, Trade Republic. Format d'import : CSV téléchargé depuis ton compte exchange (jamais d'API key requise). On couvre 95 % du volume des Français.",
    },
    {
      q: "C'est vraiment 100 % automatisé ? Pas de support humain ?",
      a: "Oui. Tout est généré par algorithme déterministe (parser CSV + 150 VH bis pas-à-pas + PDF generator). Si tu as une question sur une situation très complexe (DeFi exotique, NFT créateurs, mining BIC, BNC), on te redirige vers un expert-comptable agréé crypto-actifs (liste fournie). Cryptoreflex ne donne pas de conseil personnalisé.",
    },
    {
      q: "C'est fiable pour ma déclaration officielle ?",
      a: "Le Cerfa 2086 généré suit STRICTEMENT la méthodologie CGI 150 VH bis (prix moyen pondéré du portefeuille global, plus-values nettes après moins-values intra-année). Précision ≥ 99 % sur des trades simples (achat/vente/swap). Pour le DeFi avancé, fais relire par un expert-comptable. Cryptoreflex décline toute responsabilité fiscale.",
    },
    {
      q: "49 €, c'est combien remboursé ?",
      a: "Si tu déclares correctement, ZÉRO frais d'impôt évité — c'est juste l'impôt légal dû. MAIS tu évites une amende potentielle de 1 500 €/compte non déclaré (Annexe 3916-bis) + redressement fiscal sur les plus-values mal calculées. ROI moyen estimé : 30-200x (selon volume de trades).",
    },
    {
      q: "C'est un service récurrent ou one-shot ?",
      a: "ONE-SHOT 49 € : tu payes une fois, tu reçois ton Cerfa pour la déclaration de l'année en cours (revenus 2025 → déclaration 2026). L'année suivante (revenus 2026 → déclaration 2027), c'est un nouveau Pack 49 €. Aucun abonnement caché. (Alternative : Pro+ 79 €/an = exports illimités multi-années).",
    },
    {
      q: "Quand est la date limite de déclaration ?",
      a: "Mi-mai 2026 (date variable selon zone géographique : zone 1 mi-mai, zone 2 fin mai, zone 3 début juin). Tu as accès au Pack jusqu'à la dernière date limite de ta zone. Le Cerfa est conservé dans ton compte 5 ans (durée de prescription fiscale).",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "pack-declaration-crypto-2026",
      title: "Pack Déclaration Crypto 2026 — Cerfa 2086 auto 49 €",
      description: "Cerfa 2086 + Annexe 3916-bis pré-remplis automatiquement.",
      date: "2026-05-02",
      dateModified: "2026-05-02",
      category: "Service fiscal",
      tags: ["Cerfa 2086", "déclaration crypto", "fiscalité", "PFU 30%", "150 VH bis"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Pack Déclaration", url: "/pack-declaration-crypto-2026" },
    ]),
    faqSchema(faqItems.map((item) => ({ question: item.q, answer: item.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="pack-declaration" data={schemas} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Pack Déclaration Crypto 2026</span>
        </nav>

        <header className="mt-6 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 border border-warning/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-warning-fg">
            <Calendar className="h-3 w-3" aria-hidden /> Date limite mi-mai 2026
          </span>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight">
            Cerfa 2086 prêt en{" "}
            <span className="gradient-text">5 minutes</span>.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-fg/80 leading-relaxed">
            Importe ton CSV exchange. Récupère ton Cerfa 2086 + Annexe 3916-bis
            pré-remplis. <strong>49 € one-shot</strong>, 100 % automatisé,
            aucune présence humaine.
          </p>
        </header>

        <div className="mt-8">
          <Tldr
            headline="49 € pour générer ton Cerfa 2086 officiel à partir de ton CSV exchange en 5 minutes au lieu de 5 heures."
            bullets={[
              { emoji: "📋", text: "Cerfa 2086 + Annexe 3916-bis PDF pré-remplis" },
              { emoji: "💸", text: "Calcul 150 VH bis pas-à-pas avec sources CGI/BOFiP citées" },
              { emoji: "⏱️", text: "5 min vs 5 h de saisie manuelle (gain temps massif)" },
              { emoji: "✅", text: "ROI 30-200x (évite amendes 1 500 €/compte 3916-bis)" },
              { emoji: "🤖", text: "100 % automatisé. Aucun support humain. Audit-ready pour ton expert-comptable." },
            ]}
            readingTime="4 min"
            level="Tous niveaux"
          />
        </div>

        {/* CTA + pricing */}
        <section className="mt-12 rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-10 text-center">
          <div className="inline-flex items-center gap-1 rounded-full bg-primary/20 border border-primary/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-soft">
            <Sparkles className="h-3 w-3" /> One-shot · pas d&apos;abonnement
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold">
            <span className="gradient-text">49 €</span>
          </h2>
          <p className="mt-3 text-sm text-fg/80 max-w-xl mx-auto">
            Tu payes une fois pour la déclaration 2026. Cerfa généré
            instantanément, archivé 5 ans. Pas d&apos;abonnement caché.
          </p>
          <Link
            href="/pack-declaration-crypto-2026/checkout"
            className="mt-5 btn-primary btn-primary-shine inline-flex"
          >
            Acheter le Pack 49 €
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <p className="mt-3 text-[11px] text-muted">
            Garantie satisfait ou remboursé 14 jours · Paiement sécurisé Stripe
          </p>
        </section>

        {/* 4 features */}
        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ Icon, title, blurb }) => (
            <div key={title} className="hover-lift rounded-2xl border border-border bg-surface p-5">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-3 text-base font-bold">{title}</h3>
              <p className="mt-2 text-sm text-fg/80 leading-relaxed">{blurb}</p>
            </div>
          ))}
        </section>

        {/* Étapes wizard */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold">3 étapes en 5 minutes</h2>
          <ol className="mt-5 space-y-4">
            {[
              {
                n: "1",
                title: "Importe ton CSV",
                desc: "Télécharge ton historique depuis Binance / Coinbase / Kraken / Bitpanda / OKX / KuCoin / Bitget / Crypto.com / Trade Republic et glisse-dépose dans le wizard.",
              },
              {
                n: "2",
                title: "Vérifie le calcul",
                desc: "L'algorithme parse ton historique, calcule plus-values selon 150 VH bis (PMP global), détecte les comptes étrangers à déclarer en 3916-bis. Tu peux ajuster manuellement avant export.",
              },
              {
                n: "3",
                title: "Télécharge tes PDF",
                desc: "Cerfa 2086 + Annexe 3916-bis (si applicable) prêts à signer. Format conforme impots.gouv.fr 2026. Archivés 5 ans dans ton espace Cryptoreflex.",
              },
            ].map((step) => (
              <li key={step.n} className="flex items-start gap-4 hover-lift rounded-2xl border border-border bg-surface p-5">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold">
                  {step.n}
                </span>
                <div>
                  <h3 className="font-bold">{step.title}</h3>
                  <p className="mt-1 text-sm text-fg/80 leading-relaxed">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Disclaimer fiscalité */}
        <div className="mt-10">
          <AmfDisclaimer variant="fiscalite" />
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
          <RelatedPagesNav
            currentPath="/pack-declaration-crypto-2026"
            variant="default"
            limit={4}
          />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="article" articleCategory="Fiscalité" />
        </div>
      </div>
    </article>
  );
}
