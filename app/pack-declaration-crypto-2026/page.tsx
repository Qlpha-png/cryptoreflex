import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  Globe2,
  FileSpreadsheet,
  ShieldCheck,
  Calendar,
  ArrowRight,
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
import { withHreflang } from "@/lib/seo-alternates";

/**
 * /pack-declaration-crypto-2026 — Ressource GRATUITE pour la déclaration
 * crypto 2026 (déclaration mai 2026 sur les revenus 2025).
 *
 * DÉMONÉTISATION juin 2026 : ce qui était auparavant un bundle payant (49 €)
 * est désormais 100 % gratuit, comme le reste du site. On conserve tout le
 * contenu SEO fiscal utile (méthodologie 150 VH bis, Cerfa 2086, 3916-bis) et
 * on oriente vers les outils fiscaux gratuits (Cerfa 2086 auto, calculateur
 * de fiscalité). Plus aucun prix, aucun lien Stripe, aucun checkout.
 *
 * 05/10/2026 — textes remis en conformité avec l'outil réel : le générateur lit son modèle CSV, PAS les exports
 * bruts des plateformes ni l'export de Waltio (un fichier Excel) ; le PDF est un récapitulatif à recopier (rien ne se dépose ni
 * ne se signe) ; méthode = valeur globale du portefeuille (art. 150 VH bis), pas un « prix moyen pondéré » ; plus
 * de « 5 minutes », « 95 % des Français », « précision ≥ 99 % » ni « archivage 5 ans » (rien de tout cela n'existe).
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Pack Déclaration Crypto 2026 — Cerfa 2086 et 3916-bis (gratuit)",
  description:
    "Déclarer ses cryptos pas à pas : générateur Cerfa 2086 (modèle CSV à remplir), fiches 3916-bis, calculateur d'impôt et guide. Gratuit, à vérifier avant dépôt.",
  alternates: withHreflang(`${BRAND.url}/pack-declaration-crypto-2026`),
  openGraph: {
    title: "Pack Déclaration Crypto 2026 — Cryptoreflex",
    description: "Récapitulatif Cerfa 2086 ligne par ligne et fiches 3916-bis, gratuits.",
    url: `${BRAND.url}/pack-declaration-crypto-2026`,
    type: "website",
  },
};

const FEATURES = [
  {
    Icon: FileText,
    title: "Récapitulatif 2086 ligne par ligne",
    blurb:
      "Pour chaque vente, les lignes 211 à 224 calculées selon l'article 150 VH bis du CGI (valeur globale du portefeuille, prix total d'acquisition, frais de cession), puis le total à reporter en case 3AN ou 3BN.",
  },
  {
    Icon: Globe2,
    title: "Fiches 3916-bis",
    blurb:
      "Une fiche de préparation par compte ouvert auprès d'une plateforme établie à l'étranger (Coinbase, Kraken, Bitpanda… le sont), à recopier dans votre déclaration.",
  },
  {
    Icon: FileSpreadsheet,
    title: "Un modèle simple à remplir",
    blurb:
      "Vous recopiez tous vos achats et ventes, depuis le premier, dans notre modèle CSV (exemple rempli fourni ; Excel en français accepté). Les fichiers exportés par les plateformes ne s'importent pas tels quels.",
  },
  {
    Icon: ShieldCheck,
    title: "Aucun chiffre deviné",
    blurb:
      "Le moteur est vérifié chaque nuit sur l'exemple officiel du BOFiP (deux ventes : 75 € puis 675 € de plus-value, au centime). S'il manque une donnée (valeur du portefeuille le jour d'une vente), la cession est marquée « à compléter » au lieu d'être estimée.",
  },
];

export default function PackDeclarationPage() {
  const faqItems = [
    {
      q: "Quelle différence avec le calculateur de fiscalité ?",
      a: "Le calculateur estime votre impôt à partir de quelques montants (achats, ventes). Le générateur 2086 calcule chaque vente à partir de toutes vos opérations (modèle CSV) et produit le récapitulatif ligne par ligne du formulaire 2086, avec les fiches 3916-bis. Les deux sont gratuits.",
    },
    {
      q: "Quels fichiers puis-je importer ?",
      a: "Le modèle CSV de Cryptoreflex (à télécharger sur la page du générateur, avec un exemple rempli ; un enregistrement depuis Excel en français est accepté). Les fichiers bruts des plateformes (Coinbase, Kraken, Bitpanda…) et l'export de Waltio (un fichier Excel) n'ont pas les mêmes colonnes : servez-vous-en pour recopier vos opérations dans le modèle.",
    },
    {
      q: "Qu'est-ce qui est automatique, et qu'est-ce qui reste à faire ?",
      a: "Le calcul est automatique : le même moteur produit l'aperçu et le PDF, sans intervention humaine. Il vous reste à remplir le modèle, à vérifier l'aperçu, puis à recopier les lignes sur impots.gouv.fr. Le téléchargement du PDF demande un compte gratuit (5 PDF par jour). Pour une situation complexe (DeFi, NFT en tant que créateur, minage, activité professionnelle), faites relire par un expert-comptable : Cryptoreflex ne donne pas de conseil personnalisé.",
    },
    {
      q: "Le résultat est-il fiable ?",
      a: "Le moteur applique la formule du formulaire 2086 : plus-value = prix de cession net − prix total d'acquisition net × prix de cession / valeur globale du portefeuille. Il est vérifié chaque nuit sur l'exemple officiel du BOFiP. Ne sont pas pris en charge : les échanges avec soulte et les paiements en crypto ; les frais d'achat ne sont pas ajoutés au prix d'acquisition (ils sont signalés). Relisez toujours le récapitulatif avant de déclarer : vous restez responsable de votre déclaration.",
    },
    {
      q: "Le PDF se dépose-t-il sur impots.gouv.fr ?",
      a: "Non. Le site des impôts n'accepte aucun fichier pour le 2086 : vous recopiez les lignes de chaque cession dans l'annexe 2086 en ligne, puis le total en case 3AN ou 3BN, et une annexe 3916-bis par compte à l'étranger. Le PDF sert de guide et de justificatif à conserver.",
    },
    {
      q: "Pourquoi déclarer correctement ?",
      a: "Un compte crypto à l'étranger non déclaré (annexe 3916-bis) expose à une amende de 750 € par compte, 1 500 € si la valeur des comptes concernés a dépassé 50 000 € à un moment de l'année (art. 1736 X du CGI), sans compter le redressement d'une plus-value mal calculée. Bien déclarer ne réduit pas l'impôt dû : cela évite les pénalités.",
    },
    {
      q: "C'est à refaire chaque année ?",
      a: "Oui : chaque année, vous ajoutez les nouvelles opérations à votre fichier et vous générez le récapitulatif de l'année (revenus 2026 → déclaration 2027). La ligne 221 reprend les fractions de capital déjà imputées les années précédentes : gardez donc tout votre historique dans le même fichier. Gratuit et sans abonnement.",
    },
    {
      q: "Quand est la date limite ?",
      a: "Pour la déclaration 2026 (revenus 2025), les dates limites s'échelonnaient de mi-mai à début juin selon votre département. Pour corriger une déclaration déjà déposée en ligne, le service de correction est ouvert du 29 juillet au 30 novembre 2026 inclus (impots.gouv.fr).",
    },
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: "pack-declaration-crypto-2026",
      title: "Pack Déclaration Crypto 2026 — Cerfa 2086 et 3916-bis (gratuit)",
      description: "Récapitulatif Cerfa 2086 ligne par ligne et fiches 3916-bis, gratuits.",
      date: "2026-05-02",
      dateModified: "2026-10-05",
      category: "Service fiscal",
      tags: ["Cerfa 2086", "déclaration crypto", "fiscalité", "PFU 31,4%", "150 VH bis"],
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
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Pack Déclaration Crypto 2026</span>
        </nav>

        <header className="mt-6 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 border border-warning/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-warning-fg">
            <Calendar className="h-3 w-3" aria-hidden /> Correction en ligne jusqu'au 30 novembre 2026
          </span>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight">
            Votre déclaration crypto,{" "}
            <span className="gradient-text">étape par étape</span>.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-fg/80 leading-relaxed">
            Remplissez notre modèle avec vos achats et ventes : le générateur
            calcule chaque ligne du Cerfa 2086 et prépare vos fiches 3916-bis.
            Vous recopiez ensuite le tout sur impots.gouv.fr.{" "}
            <strong>100 % gratuit</strong>.
          </p>
        </header>

        <div className="mt-8">
          <Tldr
            headline="Un récapitulatif Cerfa 2086 calculé ligne par ligne et des fiches 3916-bis, à recopier sur impots.gouv.fr."
            bullets={[
              { emoji: "📋", text: "Lignes 211 à 224 du 2086 pour chaque vente, total à reporter en 3AN ou 3BN" },
              { emoji: "🌍", text: "Une fiche 3916-bis par compte ouvert à l'étranger" },
              { emoji: "🧾", text: "Modèle CSV à remplir avec tout votre historique (exemple fourni)" },
              { emoji: "✅", text: "Moteur vérifié chaque nuit sur l'exemple officiel du BOFiP" },
              { emoji: "🆓", text: "Gratuit, sans abonnement ; à relire avant de déclarer" },
            ]}
            readingTime="4 min"
            level="Tous niveaux"
          />
        </div>

        {/* CTA — ressource gratuite */}
        <section className="mt-12 rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-10 text-center">
          <div className="inline-flex items-center gap-1 rounded-full bg-primary/20 border border-primary/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-soft">
            <Sparkles className="h-3 w-3" /> 100 % gratuit · sans abonnement
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold">
            <span className="gradient-text">Gratuit</span>
          </h2>
          <p className="mt-3 text-sm text-fg/80 max-w-xl mx-auto">
            Préparez votre Cerfa 2086 et vos fiches 3916-bis sans payer. Tous
            les outils fiscaux Cryptoreflex sont ouverts à tout le monde.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/outils/cerfa-2086-auto"
              className="btn-primary btn-primary-shine inline-flex"
            >
              Préparer mon Cerfa 2086
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/outils/calculateur-fiscalite"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-fg hover:border-primary/40"
            >
              Calculateur de fiscalité
            </Link>
          </div>
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

        {/* Étapes */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold">3 étapes</h2>
          <ol className="mt-5 space-y-4">
            {[
              {
                n: "1",
                title: "Remplissez le modèle",
                desc: "Téléchargez le modèle CSV sur la page du générateur et recopiez-y une ligne par opération (date, type, crypto, quantité, prix unitaire en euros, frais, plateforme), depuis votre tout premier achat : les années précédentes comptent aussi.",
              },
              {
                n: "2",
                title: "Vérifiez l'aperçu",
                desc: "Le générateur calcule chaque vente selon l'article 150 VH bis et signale ce qui manque. Rien n'est deviné : une cession incomplète reste « à compléter ».",
              },
              {
                n: "3",
                title: "Téléchargez et recopiez",
                desc: "Avec un compte gratuit, téléchargez le récapitulatif 2086 et vos fiches 3916-bis, puis recopiez les lignes dans votre déclaration en ligne. Le PDF ne se dépose pas : gardez-le comme justificatif.",
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
