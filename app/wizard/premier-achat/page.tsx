import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { getAllPlatforms } from "@/lib/platforms";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import FirstPurchaseWizard from "@/components/FirstPurchaseWizard";
import {
  breadcrumbSchema,
  graphSchema,
  howToSchema,
} from "@/lib/schema";

export const revalidate = 86400;

// Suffixe "| Cryptoreflex" auto-ajouté par template root layout.
const TITLE = `Mon premier achat crypto — Wizard pas-à-pas`;
const DESCRIPTION =
  "Assistant interactif 5 étapes pour faire ton premier achat crypto en toute sécurité : budget, choix de la crypto, plateforme MiCA débutant FR, méthode de paiement, lancement.";
const PATH = "/wizard/premier-achat";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BRAND.url}${PATH}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BRAND.url}${PATH}`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function WizardPremierAchatPage() {
  const platforms = getAllPlatforms();

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: BRAND.url },
    { name: "Mon premier achat", url: `${BRAND.url}${PATH}` },
  ]);

  const howTo = howToSchema({
    name: "Faire son premier achat crypto en France en 2026",
    description:
      "Méthodologie en 5 étapes pour acheter sa première crypto sur une plateforme MiCA-compliant : définir son budget, choisir une crypto, sélectionner une plateforme régulée, choisir une méthode de paiement, valider l'achat.",
    totalTime: "PT15M",
    estimatedCost: { currency: "EUR", value: 25 },
    supplies: [
      { name: "Pièce d'identité (KYC)" },
      { name: "Carte bancaire ou IBAN SEPA" },
    ],
    tools: [{ name: "Smartphone ou ordinateur avec navigateur récent" }],
    steps: [
      {
        name: "Définir le montant que tu peux te permettre de perdre",
        text: "Avant tout, calibre un budget — pas combien tu peux investir mais combien tu peux perdre sans changer ton mode de vie. La crypto est un actif spéculatif non couvert par le FGDR.",
      },
      {
        name: "Choisir la crypto pour démarrer",
        text: "Pour un premier achat, privilégie Bitcoin (BTC). Plus à l'aise ? Mixe avec Ethereum (ETH). Évite les altcoins exotiques tant que les bases ne sont pas acquises.",
      },
      {
        name: "Sélectionner une plateforme MiCA débutant FR",
        text: "Filtre sur : support en français, conformité MiCA, dépôt minimum bas. Coinbase, Bitpanda et Trade Republic sont les références côté débutants.",
      },
      {
        name: "Choisir une méthode de paiement",
        text: "Carte bancaire = instantané (5 sec) mais 1.5-3 % de frais. Virement SEPA = quasi gratuit mais 1-24h. Au-delà de 200 €, le SEPA est meilleur.",
      },
      {
        name: "Valider l'achat",
        text: "Pour ton tout premier achat, fais 25-50 € de BTC pour valider le flow complet (KYC, dépôt, ordre) à coût minimal. Active la 2FA dès l'inscription.",
      },
    ],
  });

  const schema = graphSchema([breadcrumbs, howTo]);

  return (
    <>
      <StructuredData data={schema} />

      <article className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Fil d'Ariane" className="text-xs text-muted mb-6">
            <Link href="/" className="hover:text-fg">
              Accueil
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-fg">Mon premier achat</span>
          </nav>

          {/* Hero */}
          <header className="mb-10 sm:mb-12">
            <span className="badge-info">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Assistant interactif · 5 étapes
            </span>
            <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
              Mon premier achat <span className="gradient-text">crypto</span>
            </h1>
            <p className="mt-3 max-w-2xl text-fg/80 text-base sm:text-lg">
              Assistant pas-à-pas pour faire ton premier achat sereinement.
              Budget, choix de la crypto, plateforme MiCA débutant, méthode de
              paiement — on cadre tout en 5 étapes courtes.
            </p>
          </header>

          {/* Wizard */}
          <FirstPurchaseWizard platforms={platforms} />

          {/* Cross-promo + ressources */}
          <section className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <aside className="glass rounded-2xl p-6">
              <h2 className="text-lg font-bold text-fg">
                Pas sûr de la plateforme à choisir&nbsp;?
              </h2>
              <p className="mt-1 text-sm text-fg/70">
                Lance le quiz dédié — 6 questions courtes, reco basée sur ton
                profil (budget, fréquence d'achat, priorité).
              </p>
              <Link
                href="/quiz/plateforme"
                className="mt-4 btn-ghost"
              >
                Faire le quiz plateforme
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </aside>
            <aside className="glass rounded-2xl p-6">
              <h2 className="text-lg font-bold text-fg">
                Approfondir avant de te lancer
              </h2>
              <p className="mt-1 text-sm text-fg/70">
                Notre méthodologie de notation, le comparatif complet et la
                fiche détaillée de chaque plateforme.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href="/methodologie"
                  className="text-sm font-semibold text-primary-soft hover:text-primary inline-flex items-center gap-1
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                             focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                >
                  Méthodologie
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
                <Link
                  href="/#plateformes"
                  className="text-sm font-semibold text-primary-soft hover:text-primary inline-flex items-center gap-1
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                             focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                >
                  Comparatif plateformes
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </aside>
          </section>
        </div>
      </article>
    </>
  );
}
