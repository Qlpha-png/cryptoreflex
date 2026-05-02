/**
 * /outils/cerfa-2086-auto
 * -----------------------
 * Page de l'outil "Génération auto Cerfa 2086 + 3916-bis pré-rempli"
 * réservé aux abonnés Soutien (Pro).
 *
 * Architecture :
 *  - Server Component pour SEO (title/description/canonical/structured data).
 *  - Composant client <Cerfa2086Generator /> lazy-loadé via next/dynamic
 *    (le parser CSV + le state d'upload pèsent ~12 KB minified, lazy = LCP intact).
 *  - Le gating Pro est dans le composant client (via /api/me) ET dans la
 *    route /api/cerfa-2086 (vérité serveur).
 *
 * SEO :
 *  - title court (<60 chars), keyword "Cerfa 2086 crypto auto 2026 — Pro"
 *  - description longue avec mention "Soutien" (qualifie le trafic)
 *  - schema WebApplication + Breadcrumb
 *  - YMYL : disclaimer en hero + footer du composant
 */

import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ArrowRight,
  Crown,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import StructuredData from "@/components/StructuredData";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import {
  breadcrumbSchema,
  graphSchema,
  howToSchema,
  type JsonLd,
} from "@/lib/schema";
import { BRAND } from "@/lib/brand";

const Cerfa2086Generator = dynamic(
  () => import("@/components/cerfa/Cerfa2086Generator"),
  {
    loading: () => (
      <div
        className="h-[420px] animate-pulse rounded-2xl bg-elevated/40"
        aria-label="Chargement de l'outil Cerfa 2086"
      />
    ),
    ssr: false,
  },
);

/* -------------------------------------------------------------------------- */
/*  SEO                                                                       */
/* -------------------------------------------------------------------------- */

const PAGE_TITLE = "Génération auto Cerfa 2086 crypto 2026 — Pro";
const PAGE_DESCRIPTION =
  "Importe ton CSV Binance/Coinbase/Bitpanda et génère un Cerfa 2086 + 3916-bis pré-rempli en 30 secondes. Calcul officiel article 150 VH bis. Réservé aux abonnés Soutien Cryptoreflex.";
const PAGE_PATH = "/outils/cerfa-2086-auto";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  keywords: [
    "Cerfa 2086 automatique",
    "génération Cerfa 2086 crypto",
    "Cerfa 2086 PDF",
    "3916-bis crypto",
    "déclaration crypto automatique",
    "import CSV Binance impôts",
    "outil fiscal crypto Pro",
    "calculateur Cerfa 2086",
  ],
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function Cerfa2086AutoPage() {
  /* --------------------- Schema.org JSON-LD --------------------- */

  const webAppSchema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Génération auto Cerfa 2086 + 3916-bis",
    url: PAGE_URL,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    description: PAGE_DESCRIPTION,
    inLanguage: "fr-FR",
    isAccessibleForFree: false,
    offers: {
      "@type": "Offer",
      price: "2.99",
      priceCurrency: "EUR",
      description: "Inclus dans l'abonnement Cryptoreflex Soutien (mensuel ou annuel)",
    },
  };

  return (
    <>
      <StructuredData
        data={graphSchema([
          webAppSchema,
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            { name: "Outils", url: "/outils" },
            { name: "Cerfa 2086 auto", url: PAGE_PATH },
          ]),
          // Étude #9 ETUDE-2026-05-02 : HowTo schema → snippet "Comment
          // générer son Cerfa 2086" éligible aux rich results recettes/HowTo.
          howToSchema({
            name: "Comment générer son Cerfa 2086 crypto en 30 secondes",
            description:
              "Procédure officielle pour déclarer ses plus-values crypto via le formulaire 2086 (article 150 VH bis du CGI), à partir d'un export CSV d'exchange.",
            totalTime: "PT30S",
            estimatedCost: { currency: "EUR", value: 0 },
            steps: [
              {
                name: "Exporter ton historique de trades",
                text: "Va dans ton compte Binance / Coinbase / Bitpanda → Export CSV. Sélectionne toute la période fiscale (1er janv → 31 déc).",
              },
              {
                name: "Importer le CSV dans l'outil",
                text: "Glisse le fichier CSV dans la zone d'upload de cet outil. Le parser détecte automatiquement le format de ton exchange.",
              },
              {
                name: "Vérifier les transactions parsées",
                text: "L'outil affiche un récap : nombre de cessions, total acquisitions, plus-value brute. Vérifie qu'aucun trade n'est manquant.",
              },
              {
                name: "Générer le PDF Cerfa 2086 + 3916-bis",
                text: "Click sur Générer. L'outil applique la formule article 150 VH bis (prorata portefeuille), produit le 2086 pré-rempli + un 3916-bis par compte étranger détecté.",
              },
              {
                name: "Reporter sur impots.gouv.fr",
                text: "Connecte-toi à impots.gouv.fr, vas dans la section Plus-values d'actifs numériques. Reporte les valeurs du PDF dans les cases correspondantes (les références sont annotées dans le PDF généré).",
              },
            ],
          }),
        ])}
      />

      <main className="min-h-screen pb-24">
        {/* ============================ Hero ============================ */}
        <section className="relative py-14 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">
              <Crown className="h-3.5 w-3.5" aria-hidden="true" />
              Fonctionnalité Soutien — réservée aux abonnés Pro
            </span>

            <h1 className="mt-4 font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-fg">
              Génère ton{" "}
              <span className="gradient-text">Cerfa 2086 + 3916-bis</span>{" "}
              en 30 secondes
            </h1>

            <p className="mt-4 max-w-3xl text-lg text-fg/80 leading-relaxed">
              Importe le CSV de tes exchanges (Binance, Coinbase, Bitpanda) ou ton
              export JSON Waltio. Notre moteur applique la formule officielle
              <strong> article 150 VH bis du CGI </strong> (prorata portefeuille) et
              te livre un PDF récapitulatif prêt à accompagner ta déclaration sur
              impots.gouv.fr — avec un 3916-bis automatique pour chaque compte
              étranger détecté.
            </p>

            <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { icon: FileText, label: "Annexe Cerfa 2086 — cessions ligne par ligne" },
                { icon: ShieldCheck, label: "Calcul prorata portefeuille (formule officielle)" },
                { icon: Sparkles, label: "3916-bis auto par exchange étranger détecté" },
                { icon: Crown, label: "5 générations / jour incluses" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-fg/85">
                  <Icon className="h-4 w-4 text-primary-soft" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>

            {/* Disclaimer YMYL */}
            <div
              role="note"
              className="mt-8 rounded-xl border border-warning/40 bg-warning/10 p-4 flex gap-3 text-sm text-fg/90"
            >
              <AlertTriangle
                className="h-5 w-5 shrink-0 text-warning-fg mt-0.5"
                aria-hidden="true"
              />
              <p>
                <strong className="text-warning-fg">Aide à la déclaration — pas un conseil fiscal :</strong>{" "}
                ce PDF est un document récapitulatif généré automatiquement.
                Vérifie chaque chiffre et fais valider ta déclaration par un
                fiscaliste ou expert-comptable spécialisé crypto avant tout dépôt
                officiel sur impots.gouv.fr. La fiscalité crypto évolue
                régulièrement (LF, doctrine BOFiP).
              </p>
            </div>
          </div>
        </section>

        {/* ============================ Generator ============================ */}
        <section
          aria-labelledby="generator-title"
          className="border-t border-border/60 py-10 sm:py-14"
        >
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2
              id="generator-title"
              className="font-display text-2xl sm:text-3xl font-extrabold text-fg"
            >
              Importer mes transactions
            </h2>
            <p className="mt-2 text-sm text-fg/70">
              Le calcul reste 100 % côté serveur Cryptoreflex (aucune donnée
              persistée après génération).
            </p>

            <div className="mt-8">
              <Cerfa2086Generator />
            </div>
          </div>
        </section>

        {/* ============================ Cross-links ============================ */}
        <section className="border-t border-border/60 py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-fg">
              Pour aller plus loin
            </h2>

            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <CrossLink
                href="/outils/calculateur-fiscalite"
                title="Calculateur fiscalité crypto (gratuit)"
                description="Estime ton impôt PFU 30 % en 2 minutes, sans import de fichier."
              />
              <CrossLink
                href="/outils/declaration-fiscale-crypto"
                title="Comparatif outils déclaration crypto"
                description="Waltio vs Koinly vs CoinTracking — choisis l'outil adapté à ton volume."
              />
              <CrossLink
                href="/articles/declaration-crypto-cerfa-2086-tutoriel-2026"
                title="Tutoriel Cerfa 2086 pas à pas"
                description="Guide complet pour remplir le formulaire 2086 manuellement."
              />
              <CrossLink
                href="/articles/cerfa-3916-bis-crypto-declarer-comptes-etrangers-2026"
                title="3916-bis : déclarer ses comptes étrangers"
                description="L'amende est de 750 €/compte oublié. Procédure complète."
              />
            </div>

            <RelatedPagesNav
              currentPath={PAGE_PATH}
              limit={4}
              variant="default"
            />
          </div>
        </section>

        {/* ============================ Footer disclaimer ============================ */}
        <section className="border-t border-border/60 py-10">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-xl border border-border bg-elevated/40 p-4 text-xs text-fg/70 leading-relaxed">
              <strong className="text-fg/85">Disclaimer YMYL.</strong>{" "}
              Cryptoreflex n'est ni Conseiller en Investissements Financiers (CIF),
              ni expert-comptable, ni avocat fiscaliste. Cet outil produit un
              récapitulatif algorithmique à partir des données que tu importes.
              Le PDF généré ne se substitue pas à un dépôt officiel ni à l'avis
              d'un professionnel agréé. L'administration fiscale française dispose
              d'un droit de reprise jusqu'à 6 ans : conserve tes archives.{" "}
              <Link href="/transparence" className="underline hover:text-primary-soft">
                Notre transparence
              </Link>{" "}
              ·{" "}
              <Link href="/methodologie" className="underline hover:text-primary-soft">
                Méthodologie
              </Link>
              .
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composants                                                           */
/* -------------------------------------------------------------------------- */

interface CrossLinkProps {
  href: string;
  title: string;
  description: string;
}

function CrossLink({ href, title, description }: CrossLinkProps) {
  return (
    <Link
      href={href}
      className="group glass rounded-xl p-5 hover:border-primary/40 transition-colors flex items-start gap-3"
    >
      <ArrowRight
        className="h-5 w-5 shrink-0 text-primary-soft mt-0.5 transition-transform group-hover:translate-x-1"
        aria-hidden="true"
      />
      <div>
        <h3 className="font-bold text-fg">{title}</h3>
        <p className="mt-1 text-sm text-fg/70">{description}</p>
      </div>
    </Link>
  );
}
