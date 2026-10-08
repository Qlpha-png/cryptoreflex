/**
 * SEO helpers — Cluster fiscalité crypto Cryptoreflex.fr
 *
 * Fournit :
 *  - getRelatedFiscaliteArticles() : crawler du cluster fiscalité (silo + satellites)
 *  - generateFiscaliteSchema()    : @graph JSON-LD (Calculator + HowTo + FAQ + Breadcrumb)
 *
 * Tous les slugs renvoyés vivent dans `content/articles/*.mdx`. Le cluster
 * pointe systématiquement vers /outils/calculateur-fiscalite (PageRank +
 * topical authority).
 */
import {
  faqSchema,
  howToSchema,
  type FaqItem,
  type JsonLd,
} from "@/lib/schema";
import { BRAND } from "@/lib/brand";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface FiscaliteRelatedArticle {
  slug: string;
  title: string;
  description: string;
  category: string;
  /** Tag d'origine du cluster : "silo" (5 piliers) ou "satellite" (long-tail). */
  cluster: "silo" | "satellite";
}

/* -------------------------------------------------------------------------- */
/*  Sources cluster — silo principal + 5 satellites long-tail (avril 2026).   */
/*  La liste est volontairement codée en dur : on veut un contrôle éditorial  */
/*  fin sur quels articles apparaissent dans le bloc "Articles connexes" de   */
/*  /outils/calculateur-fiscalite (et l'ordre d'affichage = poids SEO).       */
/* -------------------------------------------------------------------------- */

export const FISCALITE_SILO: FiscaliteRelatedArticle[] = [
  {
    slug: "comment-declarer-crypto-impots-2026-guide-complet",
    title: "Déclaration crypto impôts 2026 — guide complet pas-à-pas",
    description:
      "Procédure officielle pour déclarer toutes ses cryptos en 2026 : calendrier DGFiP, formulaire 2086 ligne par ligne, 3916-bis comptes étrangers, sanctions.",
    category: "Fiscalité",
    cluster: "silo",
  },
  {
    slug: "eviter-pfu-30-crypto-bareme-progressif-legalement-2026",
    title: "Éviter le PFU 31,4 % crypto — option barème progressif 2026",
    description:
      "PFU 31,4 % ou barème progressif sur vos plus-values 2026 ? Comparatif chiffré par TMI, option case 3CN (2042 C) et effet de seuil sur la TMI.",
    category: "Fiscalité",
    cluster: "silo",
  },
  {
    slug: "cerfa-3916-bis-crypto-declarer-comptes-etrangers-2026",
    title: "Cerfa 3916-bis — déclarer ses comptes crypto étrangers 2026",
    description:
      "Tutoriel complet du Cerfa 3916-bis pour déclarer Binance, Bitget, Kraken Irlande. Sanctions 750 € à 1 500 € par compte oublié, délai de reprise porté à 10 ans.",
    category: "Fiscalité",
    cluster: "silo",
  },
  {
    slug: "fiscalite-staking-eth-sol-ada-france-2026-guide-complet",
    title: "Fiscalité staking ETH / SOL / ADA en France 2026",
    description:
      "Régime BNC ou plus-value pour les récompenses de staking ? Cas Coinbase, Kraken, validateur perso. Calculs, formulaires et erreurs à éviter.",
    category: "Fiscalité",
    cluster: "silo",
  },
  {
    slug: "fiscalite-defi-france-2026-bic-ou-bnc-guide-pratique",
    title: "Fiscalité DeFi France 2026 — BIC ou BNC ?",
    description:
      "Yield farming, lending, LP tokens, airdrops : quel régime fiscal pour votre DeFi en 2026 ? Critères BIC/BNC, exemples chiffrés et ce qui reste non tranché.",
    category: "Fiscalité",
    cluster: "silo",
  },
];

export const FISCALITE_SATELLITES: FiscaliteRelatedArticle[] = [
  {
    slug: "calcul-pfu-30-crypto-exemple-chiffre",
    title: "Calcul PFU 31,4 % crypto — 5 exemples chiffrés concrets (2026)",
    description:
      "Comment calculer concrètement le PFU 31,4 % sur vos plus-values crypto en 2026 : 5 cas chiffrés (DCA, swap, perte, gros gain, micro), formules, pièges.",
    category: "Fiscalité",
    cluster: "satellite",
  },
  {
    slug: "declaration-crypto-cerfa-2086-tutoriel-2026",
    title: "Déclaration crypto Cerfa 2086 — tutoriel complet 2026",
    description:
      "Tutoriel pas-à-pas du Cerfa 2086 pour la campagne 2026 : ligne par ligne, captures d'écran, exemple rempli, erreurs fréquentes et reports vers le 2042-C.",
    category: "Fiscalité",
    cluster: "satellite",
  },
  {
    slug: "bareme-progressif-vs-pfu-crypto-2026",
    title: "Barème progressif ou PFU 31,4 % crypto — lequel choisir en 2026 ?",
    description:
      "Tableau comparatif chiffré : à partir de quelle TMI le PFU est plus avantageux ? Cas étudiants, retraités, cadres, traders. Option case 3CN.",
    category: "Fiscalité",
    cluster: "satellite",
  },
  {
    slug: "deduire-pertes-crypto-impot-2026",
    title: "Déduire ses pertes crypto de l'impôt en 2026 — méthode complète",
    description:
      "Moins-values crypto : compensation sur les plus-values de la même année (150 VH bis), absence de report sur les années suivantes, cas pratiques et limites légales 2026.",
    category: "Fiscalité",
    cluster: "satellite",
  },
  {
    slug: "frais-acquisition-crypto-deductible-2026",
    title: "Frais d'acquisition crypto — sont-ils déductibles en 2026 ?",
    description:
      "Frais Binance, Coinbase, Kraken, Bitget, gas fees, frais de retrait : ce qui est déductible et ce qui ne l'est pas. Justificatifs et formulaire 2086.",
    category: "Fiscalité",
    cluster: "satellite",
  },
];

export const FISCALITE_CLUSTER: FiscaliteRelatedArticle[] = [
  ...FISCALITE_SATELLITES,
  ...FISCALITE_SILO,
];

/* -------------------------------------------------------------------------- */
/*  Helpers cluster                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Renvoie la liste d'articles connexes (sans le slug courant), triée pour
 * exposer en priorité les satellites puis le silo. `limit` = 10 par défaut.
 */
export function getRelatedFiscaliteArticles(
  currentSlug?: string,
  limit = 10
): FiscaliteRelatedArticle[] {
  return FISCALITE_CLUSTER.filter((a) => a.slug !== currentSlug).slice(0, limit);
}

/** Retourne uniquement les satellites (5 articles long-tail). */
export function getFiscaliteSatellites(): FiscaliteRelatedArticle[] {
  return FISCALITE_SATELLITES;
}

/** Retourne uniquement le silo principal (5 articles piliers). */
export function getFiscaliteSilo(): FiscaliteRelatedArticle[] {
  return FISCALITE_SILO;
}

/* -------------------------------------------------------------------------- */
/*  generateFiscaliteSchema — JSON-LD riche pour /outils/calculateur-fiscalite */
/* -------------------------------------------------------------------------- */

const PAGE_PATH = "/outils/calculateur-fiscalite";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;

/** Schema.org SoftwareApplication custom (Calculator). */
function calculatorSoftwareSchema(description: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": ["SoftwareApplication", "WebApplication"],
    name: "Calculateur fiscalité crypto France 2026",
    alternateName: [
      "Simulateur impôt crypto 2026",
      "Calculateur PFU 31,4 % crypto",
      "Calculateur déclaration 2086",
    ],
    description,
    url: PAGE_URL,
    applicationCategory: "FinanceApplication",
    applicationSubCategory: "TaxCalculator",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    inLanguage: "fr-FR",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    featureList: [
      "Calcul PFU 31,4 % (12,8 % IR + 18,6 % PS)",
      "Option barème progressif IR",
      "Estimation au régime BNC (cas rares)",
      "Seuil exonération 305 € pris en compte",
      "Aide Cerfa 2086 + 2042-C",
      "Calcul 100 % local (aucune donnée envoyée)",
    ],
    // NOTE — `aggregateRating` volontairement absent : Google peut prendre une
    // manual action si la note n'est pas représentative d'avis utilisateurs
    // réels collectés (cf. policy "Review snippet"). À ré-activer quand on aura
    // ≥ 5 reviews authentiques (Trustpilot ou formulaire post-utilisation PDF).
    // 05/10/2026 : plus de `Review` notée par le site sur son propre outil (avis auto-attribué, et son texte
    // annonçait des « tests internes par l'équipe » invérifiables).
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
    },
  };
}

/**
 * Génère le bloc complet @graph JSON-LD pour la page calculateur :
 * SoftwareApplication + HowTo + FAQPage (le fil d'Ariane et son BreadcrumbList viennent de <Breadcrumbs>).
 *
 * @param faqItems — liste des questions/réponses à inclure dans le FAQPage.
 * @param description — description meta utilisée par SoftwareApplication.
 */
export function generateFiscaliteSchema(
  faqItems: FaqItem[],
  description: string
): JsonLd {
  const calculator = calculatorSoftwareSchema(description);

  const howTo = howToSchema({
    name: "Comment calculer son impôt crypto en France en 2026",
    description:
      "Méthode pas-à-pas pour estimer l'impôt sur les plus-values crypto 2026 (PFU 31,4 % ou barème progressif), du calcul de la plus-value nette au report sur le Cerfa 2086.",
    totalTime: "PT5M",
    estimatedCost: { currency: "EUR", value: 0 },
    tools: [
      { name: "Calculateur fiscalité crypto Cryptoreflex" },
      { name: "Cerfa 2086" },
      { name: "Cerfa 2042-C" },
    ],
    supplies: [
      { name: "Historique des cessions 2025 (export CSV exchange)" },
      { name: "Total des achats EUR 2025" },
      { name: "Frais de courtage 2025" },
    ],
    steps: [
      {
        name: "Récupérer l'historique d'opérations 2025",
        text: "Exportez le CSV complet de vos cessions sur Binance, Coinbase, Kraken, Bitget. Conservez uniquement les cessions vers monnaie ayant cours légal (EUR, USD) — les swaps crypto/crypto sont fiscalement neutres.",
        url: "/blog/declaration-crypto-cerfa-2086-tutoriel-2026",
      },
      {
        name: "Calculer le total des cessions et des acquisitions",
        text: "Additionnez le montant total des ventes en euros (T1) puis le total des achats correspondants (T2). Si T1 reste inférieur ou égal à 305 euros sur l'année, vous êtes exonéré : passez directement à l'étape 5.",
      },
      {
        name: "Appliquer la formule article 150 VH bis du CGI",
        text: "Plus-value nette = total cessions − (prix total acquisition × cessions / valeur globale portefeuille) − frais. Le calculateur applique cette formule de prorata automatiquement. Les moins-values ne s'imputent que sur les plus-values de la même année, sans report.",
        url: "/outils/calculateur-fiscalite",
      },
      {
        name: "Choisir entre PFU 31,4 % et barème progressif",
        text: "Le PFU à 31,4 % (12,8 % IR + 18,6 % PS) est avantageux dès que votre TMI dépasse 12,8 %. À TMI 0 %, le barème progressif (case 3CN de la déclaration 2042 C) est plus avantageux. À TMI 11 %, il ne l'est que si votre impôt ne bénéficie pas de la décote : sinon, chaque euro de plus-value coûte environ 16 % d'impôt au barème, plus que les 12,8 % du PFU. Simulez avant de cocher la case 3CN. Le calculateur estime un régime à la fois : faites le calcul avec le PFU, puis avec le barème, pour comparer.",
        url: "/blog/bareme-progressif-vs-pfu-crypto-2026",
      },
      {
        name: "Reporter sur le Cerfa 2086 puis 2042-C",
        text: "Remplissez le formulaire 2086 ligne par ligne (une ligne par cession), reportez le total plus-value en case 3AN du 2042-C (moins-value en case 3BN), et déclarez vos comptes étrangers en 3916-bis. Date limite 21 mai au 4 juin 2026 en ligne (19 mai pour la déclaration papier) selon votre département ; correction en ligne possible du 29 juillet au 30 novembre 2026 inclus.",
        url: "/blog/declaration-crypto-cerfa-2086-tutoriel-2026",
      },
    ],
  });

  const faq = faqSchema(faqItems);

  return {
    "@context": "https://schema.org",
    "@graph": [calculator, howTo, faq].map((s) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { "@context": _ctx, ...rest } = s;
      return rest;
    }),
  };
}
