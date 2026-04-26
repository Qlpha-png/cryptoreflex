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
  breadcrumbSchema,
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
    title: "Eviter le PFU 30 % crypto — option barème progressif 2026",
    description:
      "PFU 30 % ou barème progressif sur tes plus-values 2026 ? Comparatif chiffré par TMI, mécanisme case 2OP et piège de l'engagement annuel global.",
    category: "Fiscalité",
    cluster: "silo",
  },
  {
    slug: "cerfa-3916-bis-crypto-declarer-comptes-etrangers-2026",
    title: "Cerfa 3916-bis — déclarer ses comptes crypto étrangers 2026",
    description:
      "Tutoriel complet du Cerfa 3916-bis pour déclarer Binance, Bitget, Kraken Irlande. Sanctions 750 € à 1 500 € par compte oublié, prescription 6 ans.",
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
      "Yield farming, lending, LP tokens, airdrops : quel régime fiscal pour ta DeFi en 2026 ? Critères BIC/BNC, exemples chiffrés, jurisprudence DGFiP.",
    category: "Fiscalité",
    cluster: "silo",
  },
];

export const FISCALITE_SATELLITES: FiscaliteRelatedArticle[] = [
  {
    slug: "calcul-pfu-30-crypto-exemple-chiffre",
    title: "Calcul PFU 30 % crypto — 5 exemples chiffrés concrets (2026)",
    description:
      "Comment calculer concrètement le PFU 30 % sur tes plus-values crypto en 2026 : 5 cas chiffrés (DCA, swap, perte, gros gain, micro), formules, pièges.",
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
    title: "Barème progressif ou PFU 30 % crypto — lequel choisir en 2026 ?",
    description:
      "Tableau comparatif chiffré : à partir de quelle TMI le PFU est plus avantageux ? Cas étudiants, retraités, cadres, traders. Méthode case 2OP.",
    category: "Fiscalité",
    cluster: "satellite",
  },
  {
    slug: "deduire-pertes-crypto-impot-2026",
    title: "Déduire ses pertes crypto de l'impôt en 2026 — méthode complète",
    description:
      "Moins-values crypto : règle du report fiscal, mécanisme de compensation 150 VH bis, durée de report, cas pratiques et limites légales 2026.",
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
      "Calculateur PFU 30 crypto",
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
      "Calcul PFU 30 % (12,8 % IR + 17,2 % PS)",
      "Option barème progressif IR",
      "Régime BIC professionnel",
      "Seuil exonération 305 € pris en compte",
      "Aide Cerfa 2086 + 2042-C",
      "Calcul 100 % local (aucune donnée envoyée)",
    ],
    // NOTE — `aggregateRating` volontairement absent : Google peut prendre une
    // manual action si la note n'est pas représentative d'avis utilisateurs
    // réels collectés (cf. policy "Review snippet"). À ré-activer quand on aura
    // ≥ 5 reviews authentiques (Trustpilot ou formulaire post-utilisation PDF).
    // En attendant, on signale notre verdict éditorial via une `Review` unique.
    review: {
      "@type": "Review",
      author: {
        "@type": "Organization",
        name: BRAND.name,
        url: BRAND.url,
      },
      datePublished: "2026-04-26",
      name: `Verdict éditorial ${BRAND.name} — calculateur fiscalité crypto`,
      reviewBody:
        "Outil testé en interne par l'équipe Cryptoreflex sur 12 cas types (DCA, swap, gros gain, micro montant, BIC). Calcul conforme à l'article 150 VH bis du CGI et au BOFiP en vigueur. Calcul 100 % local — aucune donnée envoyée.",
      reviewRating: {
        "@type": "Rating",
        ratingValue: "4.7",
        bestRating: "5",
        worstRating: "1",
      },
    },
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
    },
  };
}

/**
 * Génère le bloc complet @graph JSON-LD pour la page calculateur :
 * SoftwareApplication + HowTo + FAQPage + BreadcrumbList.
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
      "Méthode pas-à-pas pour estimer l'impôt sur les plus-values crypto 2026 (PFU 30 % ou barème progressif), du calcul de la plus-value nette au report sur le Cerfa 2086.",
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
        text: "Exporte le CSV complet de tes cessions sur Binance, Coinbase, Kraken, Bitget. Conserve uniquement les cessions vers monnaie ayant cours légal (EUR, USD) — les swaps crypto/crypto sont fiscalement neutres.",
        url: "/blog/declaration-crypto-cerfa-2086-tutoriel-2026",
      },
      {
        name: "Calculer le total des cessions et des acquisitions",
        text: "Additionne le montant total des ventes en euros (T1) puis le total des achats correspondants (T2). Si T1 reste inférieur ou égal à 305 euros sur l'année, tu es exonéré : passe directement à l'étape 5.",
      },
      {
        name: "Appliquer la formule article 150 VH bis du CGI",
        text: "Plus-value nette = total cessions − (prix total acquisition × cessions / valeur globale portefeuille) − frais. Le calculateur applique cette formule de prorata automatiquement et déduit les reports de moins-values.",
        url: "/outils/calculateur-fiscalite",
      },
      {
        name: "Choisir entre PFU 30 % et barème progressif",
        text: "Le PFU à 30 % (12,8 % IR + 17,2 % PS) est avantageux dès que ta TMI dépasse 12,8 %. Si ta TMI est à 0 ou 11 %, opte pour le barème progressif via la case 2OP du Cerfa 2042. Le calculateur affiche les deux scénarios côte à côte.",
        url: "/blog/bareme-progressif-vs-pfu-crypto-2026",
      },
      {
        name: "Reporter sur le Cerfa 2086 puis 2042-C",
        text: "Remplis le formulaire 2086 ligne par ligne (une ligne par cession), reporte le total plus-value en case 3AN du 2042-C, et déclare tes comptes étrangers en 3916-bis. Date limite 22 mai à 5 juin 2026 selon ton département.",
        url: "/blog/declaration-crypto-cerfa-2086-tutoriel-2026",
      },
    ],
  });

  const faq = faqSchema(faqItems);

  const breadcrumb = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Outils", url: "/outils" },
    { name: "Calculateur fiscalité crypto", url: PAGE_PATH },
  ]);

  return {
    "@context": "https://schema.org",
    "@graph": [calculator, howTo, faq, breadcrumb].map((s) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { "@context": _ctx, ...rest } = s;
      return rest;
    }),
  };
}
