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
/*  ISR — revalidation 1x / jour (les tarifs des outils bougent rarement)     */
/* -------------------------------------------------------------------------- */

export const revalidate = 86400;

/* -------------------------------------------------------------------------- */
/*  SEO meta                                                                  */
/* -------------------------------------------------------------------------- */

const PAGE_TITLE =
  "Comparatif outils déclaration fiscale crypto 2026 — Waltio vs Koinly vs CoinTracking";
const PAGE_DESCRIPTION =
  "Quel outil choisir pour déclarer ses crypto aux impôts en France ? Comparatif Waltio (recommandé), Koinly et CoinTracking : tarifs, Cerfa 2086, 3916-bis, support FR.";
const PAGE_PATH = "/outils/declaration-fiscale-crypto";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  keywords: [
    "déclaration crypto",
    "outil déclaration crypto",
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
/*  FAQ — 8 questions (FAQPage JSON-LD)                                       */
/* -------------------------------------------------------------------------- */

const FAQ_ITEMS = [
  {
    question: "Quel est le meilleur outil pour déclarer ses crypto aux impôts en France ?",
    answer:
      "Pour un contribuable français, Waltio est notre recommandation #1 : édité en France, il génère directement le formulaire 2086 et le 3916-bis pré-remplis et conformes à l'article 150 VH bis du CGI. Koinly et CoinTracking restent d'excellents outils, mais leur orientation internationale les rend moins efficaces pour la déclaration française clé-en-main.",
  },
  {
    question: "Waltio vs Koinly : lequel choisir ?",
    answer:
      "Waltio si tu es contribuable en France et veux une déclaration clé-en-main : interface FR, support FR, export Cerfa 2086 + 3916-bis prêt à téléverser sur impots.gouv.fr. Koinly si tu es expatrié, multi-pays ou que tu veux un free tier généreux (10 000 transactions visibles) avant d'acheter un export. Côté tarif palier d'entrée, Waltio est à 79 €/an et Koinly à environ 49 €/an (45 USD).",
  },
  {
    question: "Pourquoi ne pas faire la déclaration crypto manuellement ?",
    answer:
      "Au-delà de 50 transactions par an, le calcul manuel devient piégeux : prix d'acquisition moyen pondéré, conversions crypto-crypto neutres, gestion du seuil de 305 €, méthode FIFO… Une erreur sur la valeur globale du portefeuille au moment de chaque cession peut multiplier ton imposition par 2. Un outil automatisé évite ces erreurs et fournit le détail ligne par ligne en cas de contrôle.",
  },
  {
    question: "Combien coûte Waltio pour 500 transactions ?",
    answer:
      "Le plan Hodler de Waltio (jusqu'à 500 transactions par an) coûte 79 € pour la déclaration de l'année. C'est un achat ponctuel annuel : tu ne paies que les années où tu déclares. Avec le code Cryptoreflex, tu bénéficies de 30 % de réduction sur ton premier paiement.",
  },
  {
    question: "Ces outils peuvent-ils générer le formulaire 3916-bis (comptes étrangers) ?",
    answer:
      "Seul Waltio le pré-remplit complètement (avec le code BIC/SWIFT et l'adresse de chaque exchange étranger). Koinly et CoinTracking exportent une liste de tes comptes mais sans la mise en forme attendue par l'administration française. Rappel : oublier de déclarer un compte étranger crypto coûte 750 € d'amende par compte (1 500 € si valeur > 50 000 €).",
  },
  {
    question: "Que se passe-t-il si je change d'outil l'année suivante ?",
    answer:
      "Tu peux importer ton historique CSV depuis n'importe lequel de ces 3 outils vers les 2 autres — c'est même conseillé pour comparer les calculs avant de valider ta déclaration. Waltio accepte directement les exports Koinly et CoinTracking. Conserve toujours tes archives fiscales 6 ans (durée du droit de reprise de l'administration).",
  },
  {
    question: "Ces outils sont-ils conformes à la fiscalité crypto 2026 ?",
    answer:
      "Waltio met à jour son moteur de calcul à chaque évolution réglementaire française (LF 2024, ajustements DeFi, traitement des airdrops). Koinly et CoinTracking suivent la fiscalité internationale mais pas les spécificités françaises (formulaire 2086, abattement 305 €, neutralité crypto-crypto). Pour 2026, les 3 intègrent bien le régime PFU 30 % par défaut.",
  },
  {
    question: "Faut-il un expert-comptable en plus de l'outil ?",
    answer:
      "Pour un particulier en gestion non professionnelle (PFU 30 %), l'outil seul suffit dans 95 % des cas. En revanche, si tu es au régime BIC, en activité de mining/staking professionnel, ou si tu fais de la DeFi complexe (LP tokens, prêts), un expert-comptable spécialisé crypto reste indispensable. Les 3 outils proposent un mode \"accès comptable\" pour partager facilement tes données.",
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
      "Logiciel français de déclaration fiscale crypto : génération automatique des formulaires Cerfa 2086 et 3916-bis, support DeFi, NFT et staking.",
    image: `${BRAND.url}${waltio.logoUrl}`,
    url: `${BRAND.url}${PAGE_PATH}#waltio`,
    brand: { "@type": "Brand", name: "Waltio" },
    category: "TaxPreparationSoftware",
    // NOTE — `aggregateRating` volontairement absent : on n'a pas (encore) de
    // base d'avis utilisateurs vérifiés. Hardcoder une note expose à une
    // manual action Google ("Review snippet spam"). On garde une `Review`
    // ÉDITORIALE unique — éthiquement OK car identifiée comme avis Cryptoreflex.
    review: {
      "@type": "Review",
      author: {
        "@type": "Organization",
        name: BRAND.name,
        url: BRAND.url,
      },
      datePublished: "2026-04-26",
      name: `Avis éditorial ${BRAND.name} sur ${waltio.name}`,
      reviewBody:
        "Testé sur 3 cycles fiscaux complets (2023, 2024, 2025) avec import multi-exchanges (Binance, Coinbase, Kraken, Ledger). Génération conforme du Cerfa 2086 et du 3916-bis selon l'article 150 VH bis du CGI. Support FR réactif. Notre #1 pour un contribuable français.",
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
      description: "Plan Hodler — jusqu'à 500 transactions, déclaration FR clé-en-main",
    },
  };

  const itemListSchema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Top 3 outils de déclaration fiscale crypto 2026 (France)",
    description:
      "Comparatif éditorial Cryptoreflex des outils Waltio, Koinly et CoinTracking pour la déclaration fiscale crypto en France.",
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
              name: "Déclaration fiscale crypto",
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
              Comparatif éditorial 2026 — mis à jour {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </span>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-fg">
              Comparatif outils{" "}
              <span className="gradient-text">déclaration fiscale crypto</span>{" "}
              2026
            </h1>
            <p className="mt-4 text-lg text-fg/80">
              Waltio vs Koinly vs CoinTracking : quel logiciel choisir pour
              déclarer tes plus-values crypto aux impôts en France ? Comparatif
              tarifs, formulaires Cerfa 2086 / 3916-bis, support FR, intégrations.
            </p>

            <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { icon: ShieldCheck, label: "Conformité fiscalité française vérifiée" },
                { icon: FileText, label: "Cerfa 2086 + 3916-bis pré-remplis" },
                { icon: TrendingUp, label: "DeFi, NFT et staking pris en compte" },
                { icon: CheckCircle2, label: "Tarifs réels — vérifiés sites éditeurs" },
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
                Information à but pédagogique (YMYL).
              </strong>{" "}
              Cet article ne constitue pas un conseil fiscal personnalisé. Les
              tarifs et fonctionnalités sont à recouper sur les sites officiels
              avant souscription. Consulte un expert-comptable agréé pour les
              situations complexes (BIC, mining, DeFi avancé). Voir notre{" "}
              <Link
                href="/transparence"
                className="underline hover:text-primary-soft"
              >
                page transparence
              </Link>{" "}
              pour le détail des partenariats commerciaux.
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
              Sur les 3 outils testés, Waltio est le seul édité en France
              avec un export <strong>directement compatible</strong> avec le
              formulaire 2086 et le 3916-bis. Pour un contribuable français,
              c'est le meilleur ratio fiabilité × support × prix.
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
              headline="Génère ton Cerfa 2086 + 3916-bis en 10 minutes avec Waltio"
              description="Connecte tes exchanges (Binance, Kraken, Coinbase, Ledger…), Waltio calcule automatiquement tes plus-values selon la fiscalité française et te livre les formulaires prêts à téléverser sur impots.gouv.fr. 30 % de réduction via Cryptoreflex."
            />
          </div>

          {/* Pro feature : Cerfa 2086 auto Cryptoreflex (alternative complémentaire) */}
          <div className="mt-6 rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 to-transparent p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sparkles
                className="h-5 w-5 shrink-0 text-warning-fg mt-0.5"
                aria-hidden="true"
              />
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning-fg">
                  Soutien Cryptoreflex
                </span>
                <h3 className="mt-2 font-display font-bold text-lg text-fg">
                  Tu veux le PDF Cerfa 2086 sans payer Waltio ? Outil Pro
                </h3>
                <p className="mt-1 text-sm text-fg/70">
                  Notre outil Soutien (2,99 €/mois) génère un Cerfa 2086 +
                  3916-bis pré-rempli depuis ton CSV. Idéal pour les profils
                  &lt; 200 transactions / an.
                </p>
              </div>
            </div>
            <Link
              href="/outils/cerfa-2086-auto"
              className="btn-ghost justify-center shrink-0"
            >
              Tester l'outil Pro
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
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
            <span className="badge-info">Comparatif détaillé</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
              Waltio vs Koinly vs CoinTracking : 18 critères analysés
            </h2>
            <p className="mt-3 text-fg/75">
              Tarification, support FR, exports Cerfa, intégrations, DeFi, NFT…
              Tous les critères qui comptent pour bien choisir ton outil de
              déclaration fiscale crypto en 2026.
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

      {/* ============== Quand utiliser un outil vs faire à la main ============== */}
      <section className="py-16 sm:py-20 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <span className="badge-info">Méthode</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
            Quand utiliser un outil vs faire à la main ?
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
                    À la main (Excel) : si moins de 30 transactions par an
                  </h3>
                  <p className="mt-2 text-sm text-fg/75">
                    Pour quelques DCA mensuels sur Bitcoin et Ethereum, un
                    tableur suffit. Notre{" "}
                    <Link
                      href="/outils/calculateur-fiscalite"
                      className="text-primary-soft underline hover:text-primary"
                    >
                      calculateur fiscalité gratuit
                    </Link>{" "}
                    te donne le résultat en 2 minutes. Plus la checklist Cerfa
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
                    Outil dédié : entre 30 et 5 000 transactions par an
                  </h3>
                  <p className="mt-2 text-sm text-fg/75">
                    Dès que tu trades sur plusieurs plateformes, fais du staking,
                    de l'airdrop ou du swap entre tokens, le calcul manuel
                    devient piégeux. La méthode du prix d'acquisition moyen
                    pondéré exige une rigueur que seul un outil peut tenir.
                    Waltio (plan Hodler à 79 €) ou Koinly Newbie (49 €) couvrent
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
                    Expert-comptable : au-delà de 5 000 transactions ou en BIC
                  </h3>
                  <p className="mt-2 text-sm text-fg/75">
                    Activité habituelle, mining professionnel, DeFi avancé
                    (yield farming, prêts, LP tokens), structures juridiques
                    spécifiques (EURL, SASU)… Là, l'outil ne suffit plus :
                    Waltio Pro (549 €/an, mode expert-comptable inclus) +
                    cabinet spécialisé crypto deviennent obligatoires. Demande
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
            Questions fréquentes
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
              informations présentées sont de nature pédagogique et ne
              constituent ni un conseil fiscal, ni un conseil en investissement.
              La fiscalité crypto évolue régulièrement (LF, doctrine BOFiP) ;
              vérifie toujours sur impots.gouv.fr ou auprès d'un expert-comptable
              agréé avant de remplir ta déclaration. Voir notre{" "}
              <Link
                href="/methodologie"
                className="underline hover:text-primary-soft"
              >
                méthodologie
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
              Calculer d'abord son impôt crypto (gratuit)
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
