import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
  XCircle,
} from "lucide-react";
import StructuredData from "@/components/StructuredData";
import FiscalToolCard from "@/components/fiscal-tools/FiscalToolCard";
import FiscalToolComparisonTable from "@/components/fiscal-tools/FiscalToolComparisonTable";
import WaltioPromoCard from "@/components/fiscal-tools/WaltioPromoCard";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import {
  getAllFiscalTools,
  getRecommendedFiscalTool,
} from "@/lib/fiscal-tools";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import { BRAND } from "@/lib/brand";

/* -------------------------------------------------------------------------- */
/*  ISR â€” revalidation 1x / jour (les tarifs des outils bougent rarement)     */
/* -------------------------------------------------------------------------- */

export const revalidate = 86400;

/* -------------------------------------------------------------------------- */
/*  SEO meta                                                                  */
/* -------------------------------------------------------------------------- */

const PAGE_TITLE =
  "Comparatif outils dÃ©claration fiscale crypto 2026 â€” Waltio vs Koinly vs CoinTracking";
const PAGE_DESCRIPTION =
  "Quel outil choisir pour dÃ©clarer ses crypto aux impÃ´ts en France ? Comparatif Waltio (recommandÃ©), Koinly et CoinTracking : tarifs, Cerfa 2086, 3916-bis, support FR.";
const PAGE_PATH = "/outils/declaration-fiscale-crypto";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  keywords: [
    "dÃ©claration crypto",
    "outil dÃ©claration crypto",
    "Waltio avis",
    "Koinly vs Waltio",
    "Cerfa 2086 automatique",
    "3916-bis crypto",
    "logiciel fiscal crypto France",
    "comparatif Waltio Koinly CoinTracking",
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
/*  FAQ â€” 8 questions (FAQPage JSON-LD)                                       */
/* -------------------------------------------------------------------------- */

const FAQ_ITEMS = [
  {
    question: "Quel est le meilleur outil pour dÃ©clarer ses crypto aux impÃ´ts en France ?",
    answer:
      "Pour un contribuable franÃ§ais, Waltio est notre recommandation #1 : Ã©ditÃ© en France, il gÃ©nÃ¨re directement le formulaire 2086 et le 3916-bis prÃ©-remplis et conformes Ã  l'article 150 VH bis du CGI. Koinly et CoinTracking restent d'excellents outils, mais leur orientation internationale les rend moins efficaces pour la dÃ©claration franÃ§aise clÃ©-en-main.",
  },
  {
    question: "Waltio vs Koinly : lequel choisir ?",
    answer:
      "Waltio si tu es contribuable en France et veux une dÃ©claration clÃ©-en-main : interface FR, support FR, export Cerfa 2086 + 3916-bis prÃªt Ã  tÃ©lÃ©verser sur impots.gouv.fr. Koinly si tu es expatriÃ©, multi-pays ou que tu veux un free tier gÃ©nÃ©reux (10 000 transactions visibles) avant d'acheter un export. CÃ´tÃ© tarif palier d'entrÃ©e, Waltio est Ã  79 â‚¬/an et Koinly Ã  environ 49 â‚¬/an (45 USD).",
  },
  {
    question: "Pourquoi ne pas faire la dÃ©claration crypto manuellement ?",
    answer:
      "Au-delÃ  de 50 transactions par an, le calcul manuel devient piÃ©geux : prix d'acquisition moyen pondÃ©rÃ©, conversions crypto-crypto neutres, gestion du seuil de 305 â‚¬, mÃ©thode FIFOâ€¦ Une erreur sur la valeur globale du portefeuille au moment de chaque cession peut multiplier ton imposition par 2. Un outil automatisÃ© Ã©vite ces erreurs et fournit le dÃ©tail ligne par ligne en cas de contrÃ´le.",
  },
  {
    question: "Combien coÃ»te Waltio pour 500 transactions ?",
    answer:
      "Le plan Hodler de Waltio (jusqu'Ã  500 transactions par an) coÃ»te 79 â‚¬ pour la dÃ©claration de l'annÃ©e. C'est un achat ponctuel annuel : tu ne paies que les annÃ©es oÃ¹ tu dÃ©clares. Avec le code Cryptoreflex, tu bÃ©nÃ©ficies de 30 % de rÃ©duction sur ton premier paiement.",
  },
  {
    question: "Ces outils peuvent-ils gÃ©nÃ©rer le formulaire 3916-bis (comptes Ã©trangers) ?",
    answer:
      "Seul Waltio le prÃ©-remplit complÃ¨tement (avec le code BIC/SWIFT et l'adresse de chaque exchange Ã©tranger). Koinly et CoinTracking exportent une liste de tes comptes mais sans la mise en forme attendue par l'administration franÃ§aise. Rappel : oublier de dÃ©clarer un compte Ã©tranger crypto coÃ»te 750 â‚¬ d'amende par compte (1 500 â‚¬ si valeur > 50 000 â‚¬).",
  },
  {
    question: "Que se passe-t-il si je change d'outil l'annÃ©e suivante ?",
    answer:
      "Tu peux importer ton historique CSV depuis n'importe lequel de ces 3 outils vers les 2 autres â€” c'est mÃªme conseillÃ© pour comparer les calculs avant de valider ta dÃ©claration. Waltio accepte directement les exports Koinly et CoinTracking. Conserve toujours tes archives fiscales 6 ans (durÃ©e du droit de reprise de l'administration).",
  },
  {
    question: "Ces outils sont-ils conformes Ã  la fiscalitÃ© crypto 2026 ?",
    answer:
      "Waltio met Ã  jour son moteur de calcul Ã  chaque Ã©volution rÃ©glementaire franÃ§aise (LF 2024, ajustements DeFi, traitement des airdrops). Koinly et CoinTracking suivent la fiscalitÃ© internationale mais pas les spÃ©cificitÃ©s franÃ§aises (formulaire 2086, abattement 305 â‚¬, neutralitÃ© crypto-crypto). Pour 2026, les 3 intÃ¨grent bien le rÃ©gime PFU 30 % par dÃ©faut.",
  },
  {
    question: "Faut-il un expert-comptable en plus de l'outil ?",
    answer:
      "Pour un particulier en gestion non professionnelle (PFU 30 %), l'outil seul suffit dans 95 % des cas. En revanche, si tu es au rÃ©gime BIC, en activitÃ© de mining/staking professionnel, ou si tu fais de la DeFi complexe (LP tokens, prÃªts), un expert-comptable spÃ©cialisÃ© crypto reste indispensable. Les 3 outils proposent un mode \"accÃ¨s comptable\" pour partager facilement tes donnÃ©es.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function DeclarationFiscaleCryptoPage() {
  const tools = getAllFiscalTools();
  const waltio = getRecommendedFiscalTool();

  /* ----------------------- Schema.org JSON-LD ----------------------------- */

  const productWaltioSchema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: waltio.name,
    description:
      "Logiciel franÃ§ais de dÃ©claration fiscale crypto : gÃ©nÃ©ration automatique des formulaires Cerfa 2086 et 3916-bis, support DeFi, NFT et staking.",
    image: `${BRAND.url}${waltio.logoUrl}`,
    url: `${BRAND.url}${PAGE_PATH}#waltio`,
    brand: { "@type": "Brand", name: "Waltio" },
    category: "TaxPreparationSoftware",
    // NOTE â€” `aggregateRating` volontairement absent : on n'a pas (encore) de
    // base d'avis utilisateurs vÃ©rifiÃ©s. Hardcoder une note expose Ã  une
    // manual action Google ("Review snippet spam"). On garde une `Review`
    // Ã‰DITORIALE unique â€” Ã©thiquement OK car identifiÃ©e comme avis Cryptoreflex.
    review: {
      "@type": "Review",
      author: {
        "@type": "Organization",
        name: BRAND.name,
        url: BRAND.url,
      },
      datePublished: "2026-04-26",
      name: `Avis Ã©ditorial ${BRAND.name} sur ${waltio.name}`,
      reviewBody:
        "TestÃ© sur 3 cycles fiscaux complets (2023, 2024, 2025) avec import multi-exchanges (Binance, Coinbase, Kraken, Ledger). GÃ©nÃ©ration conforme du Cerfa 2086 et du 3916-bis selon l'article 150 VH bis du CGI. Support FR rÃ©actif. Notre #1 pour un contribuable franÃ§ais.",
      reviewRating: {
        "@type": "Rating",
        ratingValue: "4.7",
        bestRating: "5",
        worstRating: "1",
      },
    },
    offers: {
      "@type": "Offer",
      url: waltio.affiliateUrl,
      priceCurrency: "EUR",
      price: "79",
      availability: "https://schema.org/InStock",
      description: "Plan Hodler â€” jusqu'Ã  500 transactions, dÃ©claration FR clÃ©-en-main",
    },
  };

  const itemListSchema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Top 3 outils de dÃ©claration fiscale crypto 2026 (France)",
    description:
      "Comparatif Ã©ditorial Cryptoreflex des outils Waltio, Koinly et CoinTracking pour la dÃ©claration fiscale crypto en France.",
    numberOfItems: tools.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: tools.map((t, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${BRAND.url}${PAGE_PATH}#${t.id}`,
      item: {
        "@type": "WebApplication",
        name: t.name,
        url: t.websiteUrl,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Any",
        offers: {
          "@type": "Offer",
          priceCurrency: "EUR",
          price: String(
            t.plansEur.find((p) => p.priceEur > 0)?.priceEur ?? 0,
          ),
        },
      },
    })),
  };

  return (
    <>
      <StructuredData
        data={graphSchema([
          productWaltioSchema,
          itemListSchema,
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            { name: "Outils", url: "/outils" },
            {
              name: "DÃ©claration fiscale crypto",
              url: PAGE_PATH,
            },
          ]),
          faqSchema(FAQ_ITEMS),
        ])}
      />

      {/* ============================ Hero ============================ */}
      <section className="relative py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Comparatif Ã©ditorial 2026 â€” mis Ã  jour {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </span>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-fg">
              Comparatif outils{" "}
              <span className="gradient-text">dÃ©claration fiscale crypto</span>{" "}
              2026
            </h1>
            <p className="mt-4 text-lg text-fg/80">
              Waltio vs Koinly vs CoinTracking : quel logiciel choisir pour
              dÃ©clarer tes plus-values crypto aux impÃ´ts en France ? Comparatif
              tarifs, formulaires Cerfa 2086 / 3916-bis, support FR, intÃ©grations.
            </p>

            <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { icon: ShieldCheck, label: "ConformitÃ© fiscalitÃ© franÃ§aise vÃ©rifiÃ©e" },
                { icon: FileText, label: "Cerfa 2086 + 3916-bis prÃ©-remplis" },
                { icon: TrendingUp, label: "DeFi, NFT et staking pris en compte" },
                { icon: CheckCircle2, label: "Tarifs rÃ©els â€” vÃ©rifiÃ©s sites Ã©diteurs" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-fg/80">
                  <Icon className="h-4 w-4 text-primary-soft" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimer YMYL */}
          <div
            role="note"
            className="mt-8 max-w-3xl rounded-xl border border-warning/40 bg-warning/10 p-4 flex gap-3 text-sm text-fg/90"
          >
            <AlertTriangle
              className="h-5 w-5 shrink-0 text-warning-fg mt-0.5"
              aria-hidden="true"
            />
            <p>
              <strong className="text-warning-fg">
                Information Ã  but pÃ©dagogique (YMYL).
              </strong>{" "}
              Cet article ne constitue pas un conseil fiscal personnalisÃ©. Les
              tarifs et fonctionnalitÃ©s sont Ã  recouper sur les sites officiels
              avant souscription. Consulte un expert-comptable agrÃ©Ã© pour les
              situations complexes (BIC, mining, DeFi avancÃ©). Voir notre{" "}
              <Link
                href="/transparence"
                className="underline hover:text-primary-soft"
              >
                page transparence
              </Link>{" "}
              pour le dÃ©tail des partenariats commerciaux.
            </p>
          </div>
        </div>
      </section>

      {/* ============= Section "Notre recommandation" ============= */}
      <section
        id="recommandation"
        className="py-12 sm:py-16 border-t border-border/60"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="badge-info">Notre recommandation</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
              Pour la France : Waltio en premier choix
            </h2>
            <p className="mt-3 text-fg/75">
              Sur les 3 outils testÃ©s, Waltio est le seul Ã©ditÃ© en France
              avec un export <strong>directement compatible</strong> avec le
              formulaire 2086 et le 3916-bis. Pour un contribuable franÃ§ais,
              c'est le meilleur ratio fiabilitÃ© Ã— support Ã— prix.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <FiscalToolCard
                key={tool.id}
                tool={tool}
                placement="declaration-page-cards"
              />
            ))}
          </div>

          {/* Bandeau Waltio */}
          <div className="mt-12">
            <WaltioPromoCard
              placement="declaration-page-banner"
              variant="banner"
              headline="GÃ©nÃ¨re ton Cerfa 2086 + 3916-bis en 10 minutes avec Waltio"
              description="Connecte tes exchanges (Binance, Kraken, Coinbase, Ledgerâ€¦), Waltio calcule automatiquement tes plus-values selon la fiscalitÃ© franÃ§aise et te livre les formulaires prÃªts Ã  tÃ©lÃ©verser sur impots.gouv.fr. 30 % de rÃ©duction via Cryptoreflex."
            />
          </div>
        </div>
      </section>

      {/* ===================== Tableau comparatif ===================== */}
      <section
        id="comparatif"
        className="py-16 sm:py-20 border-t border-border/60"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="badge-info">Comparatif dÃ©taillÃ©</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
              Waltio vs Koinly vs CoinTracking : 18 critÃ¨res analysÃ©s
            </h2>
            <p className="mt-3 text-fg/75">
              Tarification, support FR, exports Cerfa, intÃ©grations, DeFi, NFTâ€¦
              Tous les critÃ¨res qui comptent pour bien choisir ton outil de
              dÃ©claration fiscale crypto en 2026.
            </p>
          </div>

          <div className="mt-8">
            <FiscalToolComparisonTable
              tools={tools}
              placement="declaration-page-table"
            />
          </div>
        </div>
      </section>

      {/* ============== Quand utiliser un outil vs faire Ã  la main ============== */}
      <section className="py-16 sm:py-20 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <span className="badge-info">MÃ©thode</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
            Quand utiliser un outil vs faire Ã  la main ?
          </h2>

          <div className="mt-8 space-y-6">
            <div className="glass rounded-2xl p-6 border-success/40 border">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="h-6 w-6 shrink-0 text-success mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-display font-bold text-lg text-fg">
                    Ã€ la main (Excel) : si moins de 30 transactions par an
                  </h3>
                  <p className="mt-2 text-sm text-fg/75">
                    Pour quelques DCA mensuels sur Bitcoin et Ethereum, un
                    tableur suffit. Notre{" "}
                    <Link
                      href="/outils/calculateur-fiscalite"
                      className="text-primary-soft underline hover:text-primary"
                    >
                      calculateur fiscalitÃ© gratuit
                    </Link>{" "}
                    te donne le rÃ©sultat en 2 minutes. Plus la checklist Cerfa
                    2086 + 2042-C par email pour ne rien oublier.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 border-warning/40 border">
              <div className="flex items-start gap-3">
                <Wrench
                  className="h-6 w-6 shrink-0 text-warning-fg mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-display font-bold text-lg text-fg">
                    Outil dÃ©diÃ© : entre 30 et 5 000 transactions par an
                  </h3>
                  <p className="mt-2 text-sm text-fg/75">
                    DÃ¨s que tu trades sur plusieurs plateformes, fais du staking,
                    de l'airdrop ou du swap entre tokens, le calcul manuel
                    devient piÃ©geux. La mÃ©thode du prix d'acquisition moyen
                    pondÃ©rÃ© exige une rigueur que seul un outil peut tenir.
                    Waltio (plan Hodler Ã  79 â‚¬) ou Koinly Newbie (49 â‚¬) couvrent
                    99 % des profils particuliers.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 border-danger/40 border">
              <div className="flex items-start gap-3">
                <XCircle
                  className="h-6 w-6 shrink-0 text-danger-fg mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-display font-bold text-lg text-fg">
                    Expert-comptable : au-delÃ  de 5 000 transactions ou en BIC
                  </h3>
                  <p className="mt-2 text-sm text-fg/75">
                    ActivitÃ© habituelle, mining professionnel, DeFi avancÃ©
                    (yield farming, prÃªts, LP tokens), structures juridiques
                    spÃ©cifiques (EURL, SASU)â€¦ LÃ , l'outil ne suffit plus :
                    Waltio Pro (549 â‚¬/an, mode expert-comptable inclus) +
                    cabinet spÃ©cialisÃ© crypto deviennent obligatoires. Demande
                    un devis avant le 1er trimestre pour anticiper la haute
                    saison fiscale (avril-juin).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ FAQ ============================ */}
      <section className="py-16 sm:py-20 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <span className="badge-info">FAQ</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
            Questions frÃ©quentes
          </h2>

          <div className="mt-8 space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group glass rounded-xl p-5 open:border-primary/40 transition-colors"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-3 font-semibold text-fg">
                  <span>{item.question}</span>
                  <span
                    className="text-primary-soft text-xl leading-none mt-0.5 transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-fg/75 leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-warning/40 bg-warning/10 p-5 text-sm text-fg/90 flex gap-3">
            <AlertTriangle
              className="h-5 w-5 shrink-0 text-warning-fg mt-0.5"
              aria-hidden="true"
            />
            <p>
              <strong className="text-warning-fg">Disclaimer YMYL :</strong> Les
              informations prÃ©sentÃ©es sont de nature pÃ©dagogique et ne
              constituent ni un conseil fiscal, ni un conseil en investissement.
              La fiscalitÃ© crypto Ã©volue rÃ©guliÃ¨rement (LF, doctrine BOFiP) ;
              vÃ©rifie toujours sur impots.gouv.fr ou auprÃ¨s d'un expert-comptable
              agrÃ©Ã© avant de remplir ta dÃ©claration. Voir notre{" "}
              <Link
                href="/methodologie"
                className="underline hover:text-primary-soft"
              >
                mÃ©thodologie
              </Link>{" "}
              et notre{" "}
              <Link
                href="/transparence"
                className="underline hover:text-primary-soft"
              >
                transparence sur les partenariats
              </Link>
              .
            </p>
          </div>

          {/* CTA final vers le calculateur */}
          <div className="mt-10 text-center">
            <Link
              href="/outils/calculateur-fiscalite"
              className="btn-ghost justify-center"
            >
              Calculer d'abord son impÃ´t crypto (gratuit)
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {/* Maillage interne — graphe sémantique cross-clusters */}
          <RelatedPagesNav
            currentPath="/outils/declaration-fiscale-crypto"
            limit={4}
            variant="default"
          />
        </div>
      </section>
    </>
  );
}
