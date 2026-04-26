import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import CalculateurFiscalite from "@/components/CalculateurFiscalite";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import { generateWebApplicationSchema } from "@/lib/schema-tools";
import { BRAND } from "@/lib/brand";
import { getAllFiscalTools } from "@/lib/fiscal-tools";
import {
  generateFiscaliteSchema,
  getRelatedFiscaliteArticles,
} from "@/lib/seo-fiscalite-helpers";

/* -------------------------------------------------------------------------- */
/*  SEO meta — H1 et meta alignées sur la cible "calculateur fiscalité crypto */
/*  France 2026" + variantes longues (PFU 30 %, barème, BIC).                 */
/* -------------------------------------------------------------------------- */

const PAGE_TITLE =
  "Calculateur fiscalité crypto 2026 — PFU 30%, Barème, Cerfa 2086 (Gratuit)";
// 158 caractères, optimisé Google SERP
const PAGE_DESCRIPTION =
  "Calcule ton impôt crypto 2026 en 2 min : PFU 30%, barème progressif IR, BIC. Aide Cerfa 2086 + 3916-bis. Calcul officiel 150 VH bis CGI, gratuit, anonyme.";
const PAGE_PATH = "/outils/calculateur-fiscalite";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;

const PAGE_KEYWORDS = [
  "calculateur fiscalité crypto",
  "calcul impôt crypto 2026",
  "PFU 30 crypto calcul",
  "calculateur PFU crypto",
  "déclaration crypto 2086",
  "impot crypto simulateur",
  "calculateur impôt crypto",
  "calcul plus-value crypto 2026",
  "simulateur fiscalité crypto",
  "Cerfa 2086 calcul",
  "barème progressif crypto",
  "fiscalité bitcoin France",
  "déclaration plus-value crypto 2026",
  "article 150 VH bis calcul",
  "flat tax crypto 30",
  "calculateur impôt bitcoin",
  "outil fiscalité crypto gratuit",
];

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: PAGE_KEYWORDS,
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    locale: "fr_FR",
    siteName: BRAND.name,
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
};

/* -------------------------------------------------------------------------- */
/*  FAQ — 12 questions enrichies (FAQPage JSON-LD via generateFiscaliteSchema) */
/* -------------------------------------------------------------------------- */

const FAQ_ITEMS = [
  {
    question:
      "Quel régime fiscal s'applique aux plus-values crypto en France en 2026 ?",
    answer:
      "Par défaut, un particulier en gestion non professionnelle est soumis au Prélèvement Forfaitaire Unique (PFU) de 30 % : 12,8 % d'impôt sur le revenu et 17,2 % de prélèvements sociaux. Tu peux aussi opter pour le barème progressif (TMI 11/30/41/45 %) si c'est plus avantageux. Si tu trades de manière habituelle, l'administration peut requalifier ton activité en BIC professionnel.",
  },
  {
    question: "À partir de quel montant dois-je déclarer mes plus-values crypto ?",
    answer:
      "Le seuil d'exonération 2026 est de 305 € par an. Si le total de tes cessions (ventes vers euros) reste inférieur ou égal à 305 €, tu es exonéré d'impôt. Au-delà, tu dois remplir le formulaire 2086 et reporter le total sur le 2042-C, même si la plus-value finale est faible.",
  },
  {
    question: "PFU ou barème progressif : que choisir ?",
    answer:
      "Le PFU à 30 % est avantageux dès que ta TMI dépasse 12,8 %. Le barème devient intéressant si ta TMI est de 0 ou 11 %. Notre calculateur affiche les deux scénarios — compare le résultat avant de cocher l'option case 2OP du Cerfa 2042 dans ta déclaration.",
  },
  {
    question: "Quand bascule-t-on en BIC professionnel ?",
    answer:
      "Il n'y a pas de seuil chiffré officiel. Le BIC s'applique en cas d'activité habituelle, organisée et utilisant des outils complexes (bots, leverage, arbitrage). En BIC, le bénéfice est imposé à ta TMI + 17,2 % PS + cotisations sociales URSSAF (~22 %). C'est généralement moins avantageux que le PFU pour des plus-values modérées.",
  },
  {
    question: "Cet outil prend-il en compte le staking, le DeFi et les NFT ?",
    answer:
      "Non, pas directement. Les revenus de staking et lending sont assimilés à des BNC (bénéfices non commerciaux), avec un régime spécifique. Les NFT et les opérations DeFi (yield farming, prêts, airdrops) relèvent de cas qui dépassent le cadre de cet outil. Pour ces situations, consulte un expert-comptable spécialisé.",
  },
  {
    question:
      "Comment se calcule exactement la plus-value selon l'article 150 VH bis ?",
    answer:
      "La formule officielle est : plus-value nette = prix de cession − (prix total d'acquisition × prix de cession / valeur globale du portefeuille au jour de cession) − frais. Notre calculateur applique ce prorata automatiquement et déduit les reports de moins-values des années précédentes (jusqu'à 10 ans).",
  },
  {
    question:
      "Les swaps crypto contre crypto (BTC vers ETH) sont-ils imposables ?",
    answer:
      "Non. Les conversions entre cryptoactifs sont fiscalement neutres depuis 2019 (BOFiP BOI-RPPM-PVBMC-30-30). Seul le passage en monnaie ayant cours légal (EUR, USD) ou l'achat d'un bien/service avec une crypto déclenche l'imposition. Mets simplement à jour ton PRU pour la nouvelle crypto.",
  },
  {
    question:
      "Mes frais Binance ou Coinbase sont-ils déductibles de la plus-value ?",
    answer:
      "Oui pour les frais de cession (commission Binance, Coinbase, Kraken sur la vente) — ils s'intègrent au prix de cession net. Les frais d'achat s'incorporent au prix d'acquisition. En revanche, les frais de retrait, frais de réseau (gas Ethereum) et abonnements de plateforme ne sont pas déductibles.",
  },
  {
    question:
      "Puis-je reporter une moins-value crypto sur les années suivantes ?",
    answer:
      "Oui, pendant 10 ans (article 150 VH bis I 4° du CGI). Une moins-value crypto se compense d'abord avec les plus-values crypto de la même année, puis l'excédent est reportable sur les 10 années suivantes — uniquement contre des plus-values d'actifs numériques, pas contre d'autres revenus.",
  },
  {
    question:
      "Que se passe-t-il si j'ai un compte sur une plateforme étrangère ?",
    answer:
      "Tu dois remplir le Cerfa 3916-bis pour CHAQUE compte ouvert sur une plateforme étrangère (Binance Lithuania, Bitget, Kraken Irlande, Coinbase Irlande), même si le compte est inactif. Sanction d'oubli : 750 € par compte si solde sous 50 000 €, 1 500 € au-dessus. Applicable sur 4 à 6 ans.",
  },
  {
    question:
      "Quel est le calendrier de la déclaration crypto 2026 ?",
    answer:
      "La déclaration en ligne ouvre le 10 avril 2026. Date limite selon ton département : 22 mai 2026 (départements 1-19 + non-résidents UE), 29 mai 2026 (20-54), 5 juin 2026 (55-95 + outre-mer). Tu peux modifier ta déclaration en ligne jusqu'au 4 décembre 2026 sans pénalité.",
  },
  {
    question:
      "L'outil envoie-t-il mes données à un serveur externe ?",
    answer:
      "Non. Le calcul se fait 100 % localement dans ton navigateur. Aucune donnée (montant des cessions, plus-value, identité) n'est transmise à Cryptoreflex ou à un tiers. Tu peux fermer la page : rien n'est conservé. Aide Cerfa par email uniquement si tu donnes ton email volontairement.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Articles connexes — cluster fiscalité (5 satellites + 5 silo)              */
/* -------------------------------------------------------------------------- */

const RELATED_FISCALITE_ARTICLES = getRelatedFiscaliteArticles(undefined, 10);

/* -------------------------------------------------------------------------- */
/*  Schema.org : WebApplication enrichi (lib/schema-tools.ts)                  */
/*  + Breadcrumb + FAQPage + ItemList outils complémentaires.                  */
/*                                                                              */
/*  IMPORTANT : on n'injecte PAS d'aggregateRating pour le moment — Google     */
/*  pénalise le rating spam (manual action review snippet) si la note n'est    */
/*  pas représentative d'avis utilisateurs réels. À ré-activer quand on aura   */
/*  collecté ≥ 5 avis authentiques (ex: via formulaire post-utilisation).      */
/* -------------------------------------------------------------------------- */

const webAppSchema: JsonLd = generateWebApplicationSchema({
  slug: "calculateur-fiscalite",
  name: "Calculateur fiscalité crypto France 2026",
  description: PAGE_DESCRIPTION,
  featureList: [
    "PFU 30 % (12,8 % IR + 17,2 % PS)",
    "Barème progressif IR (TMI 11/30/41/45 %)",
    "BIC professionnel (TMI + PS + URSSAF)",
    "Seuil exonération 305 € / an pris en compte",
    "Calcul 100 % local — aucune donnée envoyée",
    "Aide Cerfa 2086 + 2042-C par email",
    "Mise à jour 2026",
  ],
  keywords: [
    "calculateur fiscalité crypto",
    "PFU 30",
    "barème progressif",
    "BIC crypto",
    "Cerfa 2086",
    "3916-bis",
  ],
});

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function CalculateurFiscalitePage() {
  // Outils complémentaires (Waltio, Koinly, CoinTracking) injectés en JSON-LD
  // ItemList relatif pour signaler à Google la grappe "fiscalité crypto".
  const fiscalTools = getAllFiscalTools();
  const relatedToolsSchema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Outils complémentaires de déclaration fiscale crypto",
    description:
      "Logiciels recommandés par Cryptoreflex pour générer automatiquement la déclaration crypto en France.",
    numberOfItems: fiscalTools.length,
    itemListElement: fiscalTools.map((t, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${BRAND.url}/outils/declaration-fiscale-crypto#${t.id}`,
      item: {
        "@type": "WebApplication",
        name: t.name,
        url: t.websiteUrl,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Any",
        inLanguage: t.supportFr ? "fr-FR" : "en",
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

  // generateFiscaliteSchema renvoie un @graph (Calculator + HowTo + FAQ +
  // Breadcrumb). On l'unwrap pour le merger avec les schemas existants
  // (webApp, relatedTools) et conserver un graphe unique.
  const fiscaliteGraph = generateFiscaliteSchema(FAQ_ITEMS, PAGE_DESCRIPTION);
  const fiscaliteNodes = (fiscaliteGraph["@graph"] as JsonLd[]) ?? [];

  return (
    <>
      <StructuredData
        data={graphSchema([
          webAppSchema,
          relatedToolsSchema,
          ...fiscaliteNodes,
        ])}
      />

      {/* ============================ Hero ============================ */}
      <section className="relative py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb visuel — le BreadcrumbList JSON-LD est dans fiscaliteNodes */}
          <nav
            aria-label="Fil d'Ariane"
            className="mb-6 text-xs text-white/60"
          >
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="hover:text-primary-soft">
                  Accueil
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/outils" className="hover:text-primary-soft">
                  Outils
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-white/80" aria-current="page">
                Calculateur fiscalité crypto
              </li>
            </ol>
          </nav>

          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Mis à jour pour la déclaration 2026
              </span>
              {/* Phase 3 / A3 — annonce de la nouvelle fonctionnalité PDF */}
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-soft">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                Téléchargez votre simulation en PDF
              </span>
            </div>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Calculateur fiscalité crypto 2026 —{" "}
              <span className="gradient-text">
                PFU 30 %, Barème, Cerfa 2086 / 3916-bis
              </span>
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Estime ton impôt sur les plus-values crypto en 2 min selon le
              régime fiscal applicable : <strong>PFU 30 %</strong>,{" "}
              <strong>barème progressif IR</strong> ou{" "}
              <strong>BIC professionnel</strong>. Calcul officiel article{" "}
              <strong>150 VH bis</strong>, 100 % local, aucune donnée envoyée.
            </p>

            <ul className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { icon: Lock, label: "Calcul local — aucune donnée envoyée" },
                { icon: CheckCircle2, label: "PFU, barème, BIC : 3 régimes" },
                { icon: FileText, label: "Aide Cerfa 2086 + 2042-C par email" },
                { icon: ShieldCheck, label: "Seuil 305 € pris en compte" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-white/80">
                  <Icon
                    className="h-4 w-4 text-primary-soft"
                    aria-hidden="true"
                  />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimer obligatoire */}
          <div
            role="note"
            className="mt-8 max-w-3xl rounded-xl border border-warning/40 bg-warning/10 p-4 flex gap-3 text-sm text-white/90"
          >
            <AlertTriangle
              className="h-5 w-5 shrink-0 text-warning-fg mt-0.5"
              aria-hidden="true"
            />
            <p>
              <strong className="text-warning-fg">
                Estimation à titre indicatif.
              </strong>{" "}
              Cet outil ne remplace pas un conseil fiscal personnalisé. Consulte
              ton expert-comptable pour les cas complexes (DeFi, staking, NFT,
              mining).
            </p>
          </div>

          {/* Calculateur */}
          <div className="mt-10 max-w-4xl">
            <CalculateurFiscalite />
          </div>
        </div>
      </section>

      {/* ====================== SEO 1 — Comment calculer (~1000 mots) ===================== */}
      <section
        id="comment-calculer-impot-crypto"
        className="py-16 sm:py-20 border-t border-border/60"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <span className="badge-info">Méthode officielle</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Comment calculer son impôt crypto en France en 2026 ?
          </h2>
          <div className="mt-6 space-y-4 text-white/80 text-sm sm:text-base leading-relaxed">
            <p>
              La fiscalité des plus-values crypto en France repose sur l'
              <strong>article 150 VH bis du CGI</strong>, complété par le BOFiP
              BOI-RPPM-PVBMC-30-30. Pour un particulier en gestion occasionnelle,
              le régime par défaut est le <strong>Prélèvement Forfaitaire Unique
              (PFU)</strong> à 30 % : 12,8 % d'impôt sur le revenu et 17,2 % de
              prélèvements sociaux. Tu peux aussi opter pour le barème
              progressif (TMI 11/30/41/45 %) via la case 2OP du Cerfa 2042 si ta
              tranche d'IR est basse — l'option est globale et annuelle, elle
              s'applique à l'ensemble de tes revenus de capitaux mobiliers
              (dividendes, intérêts, plus-values mobilières).
            </p>

            <h3 className="text-xl font-bold text-white mt-8">
              La formule officielle (article 150 VH bis)
            </h3>
            <p>
              Notre calculateur applique la formule légale de prorata :{" "}
              <em>
                plus-value nette = prix de cession − (prix total d'acquisition ×
                prix de cession / valeur globale du portefeuille au jour de
                cession) − frais de cession
              </em>
              . C'est un calcul de fraction : tu n'imputes au prix de cession
              que la part du prix d'acquisition correspondant au pourcentage de
              portefeuille effectivement cédé. Si tu vends 1 BTC sur un
              portefeuille total de 75 000 euros valant 50 000 euros, tu
              n'imputes que 67 % de ton prix d'acquisition cumulé.
            </p>

            <h3 className="text-xl font-bold text-white mt-8">
              Exemple chiffré rapide
            </h3>
            <p>
              Léo achète 1 BTC à 30 000 euros en mars 2025 et le revend à
              45 000 euros en octobre 2025. Frais Binance 45 euros à la vente.
              Pas d'autre crypto en portefeuille. Calcul : prix de cession net =
              44 955 euros. Prix d'acquisition = 30 000 euros. Valeur globale =
              45 000 euros. Plus-value = 44 955 − (30 000 × 44 955 / 45 000) =
              44 955 − 29 970 = <strong>14 985 euros</strong>. PFU 30 % :
              4 495,50 euros d'impôt. Pour 5 exemples chiffrés détaillés (DCA,
              swap, gros gain, micro montant), consulte notre guide{" "}
              <Link
                href="/blog/calcul-pfu-30-crypto-exemple-chiffre"
                className="text-primary-soft underline"
              >
                Calcul PFU 30 % crypto — 5 exemples concrets
              </Link>
              .
            </p>

            <h3 className="text-xl font-bold text-white mt-8">
              Le seuil 305 € — exonération totale
            </h3>
            <p>
              Si le <strong>total cumulé de tes cessions</strong> sur l'année
              reste inférieur ou égal à <strong>305 euros</strong>, tu es{" "}
              <strong>totalement exonéré</strong> d'impôt sur tes plus-values
              crypto. Attention : le seuil porte sur le total des prix de vente
              vers EUR, pas sur la plus-value. Dès que tu dépasses 305 euros sur
              l'année (cumul), <strong>toute</strong> la plus-value devient
              imposable, pas seulement la fraction au-dessus du seuil.
            </p>

            <h3 className="text-xl font-bold text-white mt-8">
              Cas particulier — swap crypto contre crypto
            </h3>
            <p>
              Les conversions <strong>crypto contre crypto</strong> (BTC vers
              ETH, USDC vers SOL, swap sur Uniswap) sont{" "}
              <strong>fiscalement neutres</strong> depuis le BOFiP de septembre
              2019. Aucune ligne sur le Cerfa 2086, aucun calcul de plus-value à
              déclarer. Tu mets simplement à jour ton PRU pour la nouvelle
              crypto reçue, et conserves l'historique du swap (export CSV) en
              cas de contrôle. Seul le passage en monnaie ayant cours légal
              (EUR, USD) ou l'achat d'un bien/service en crypto déclenche
              l'imposition.
            </p>

            <h3 className="text-xl font-bold text-white mt-8">
              Frais déductibles ou pas ?
            </h3>
            <p>
              Sont <strong>déductibles</strong> : les commissions de la
              plateforme à l'achat (intégrées au prix d'acquisition) et à la
              vente (réduisent le prix de cession). Ne sont{" "}
              <strong>pas déductibles</strong> : les frais de retrait fiat (vers
              banque), les frais de réseau (gas Ethereum, fee Bitcoin), les
              abonnements de plateforme, les frais d'envoi vers cold wallet.
              Détail complet :{" "}
              <Link
                href="/blog/frais-acquisition-crypto-deductible-2026"
                className="text-primary-soft underline"
              >
                Frais d'acquisition crypto — sont-ils déductibles en 2026 ?
              </Link>
              .
            </p>

            <h3 className="text-xl font-bold text-white mt-8">
              Et si j'ai des moins-values ?
            </h3>
            <p>
              Tes moins-values crypto se compensent avec tes plus-values crypto
              de la même année (compensation automatique). Si le solde annuel
              est négatif, l'excédent est{" "}
              <strong>reportable pendant 10 ans</strong> sur les plus-values
              crypto futures uniquement (article 150 VH bis I 4° du CGI). Ce
              mécanisme est crucial pour optimiser ta fiscalité sur un cycle
              complet — méthode dans{" "}
              <Link
                href="/blog/deduire-pertes-crypto-impot-2026"
                className="text-primary-soft underline"
              >
                Comment déduire ses pertes crypto de l'impôt en 2026
              </Link>
              .
            </p>

            <h3 className="text-xl font-bold text-white mt-8">
              BIC professionnel — quand bascule-t-on ?
            </h3>
            <p>
              Si tu trades de manière habituelle, organisée et avec des outils
              avancés (bots, levier, arbitrage), l'administration peut
              requalifier ton activité en <strong>BIC professionnel</strong>.
              Le bénéfice net est alors imposé à ta TMI + 17,2 % PS +
              cotisations sociales URSSAF (~22 %). Le calculateur intègre cette
              option pour t'aider à comparer les trois régimes. Pas de seuil
              chiffré officiel — c'est une appréciation faisceau d'indices par
              le service vérificateur.
            </p>
          </div>
        </div>
      </section>

      {/* ====================== SEO 2 — PFU vs barème (~800 mots) ===================== */}
      <section
        id="pfu-vs-bareme-progressif"
        className="py-16 sm:py-20 border-t border-border/60"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <span className="badge-info">Comparatif</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Différence PFU 30 % vs barème progressif : que choisir ?
          </h2>
          <div className="mt-6 space-y-4 text-white/80 text-sm sm:text-base leading-relaxed">
            <p>
              Par défaut, tes plus-values crypto sont imposées au PFU 30 %
              (12,8 % d'IR + 17,2 % de prélèvements sociaux). Mais tu peux{" "}
              <strong>opter pour le barème progressif</strong> de l'impôt sur le
              revenu via la <strong>case 2OP du Cerfa 2042</strong>. Pour
              certains profils (TMI 0 ou 11 %), cette option divise l'impôt par
              deux. Pour d'autres (TMI 30, 41, 45 %), elle est désastreuse.
            </p>

            <h3 className="text-xl font-bold text-white mt-8">
              Tableau comparatif par TMI
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-3 py-2 text-left text-white">TMI</th>
                    <th className="px-3 py-2 text-left text-white">PFU 30 %</th>
                    <th className="px-3 py-2 text-left text-white">
                      Barème + PS
                    </th>
                    <th className="px-3 py-2 text-left text-white">
                      Régime gagnant
                    </th>
                  </tr>
                </thead>
                <tbody className="text-white/80">
                  <tr className="border-b border-border/40">
                    <td className="px-3 py-2">0 %</td>
                    <td className="px-3 py-2">30 %</td>
                    <td className="px-3 py-2">17,2 %</td>
                    <td className="px-3 py-2 text-success font-semibold">
                      Barème (−12,8 pts)
                    </td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="px-3 py-2">11 %</td>
                    <td className="px-3 py-2">30 %</td>
                    <td className="px-3 py-2">28,2 %</td>
                    <td className="px-3 py-2 text-success font-semibold">
                      Barème (−1,8 pt)
                    </td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="px-3 py-2">30 %</td>
                    <td className="px-3 py-2">30 %</td>
                    <td className="px-3 py-2">47,2 %</td>
                    <td className="px-3 py-2 text-warning-fg font-semibold">
                      PFU (+17,2 pts)
                    </td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="px-3 py-2">41 %</td>
                    <td className="px-3 py-2">30 %</td>
                    <td className="px-3 py-2">58,2 %</td>
                    <td className="px-3 py-2 text-warning-fg font-semibold">
                      PFU (+28,2 pts)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">45 %</td>
                    <td className="px-3 py-2">30 %</td>
                    <td className="px-3 py-2">62,2 %</td>
                    <td className="px-3 py-2 text-warning-fg font-semibold">
                      PFU (+32,2 pts)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-bold text-white mt-8">Règle pratique</h3>
            <p>
              Le PFU est avantageux dès que ta TMI dépasse{" "}
              <strong>12,8 %</strong>, c'est-à-dire à partir de la tranche 30 %
              (revenu fiscal au-dessus de 29 315 euros pour une part). En
              tranche 11 % et 0 %, le barème est gagnant. Notre calculateur
              affiche les deux scénarios côte à côte selon ta TMI déclarée.
            </p>

            <h3 className="text-xl font-bold text-white mt-8">
              Le piège de la case 2OP
            </h3>
            <p>
              L'option case 2OP est <strong>annuelle et globale</strong> : elle
              s'applique à <em>tous</em> tes revenus de capitaux mobiliers de
              l'année (dividendes, intérêts, plus-values crypto, plus-values
              mobilières). Avant de cocher, simule l'impact sur l'ensemble de
              tes revenus, pas seulement ta crypto. Un dividende de 5 000 euros
              peut transformer une bonne idée en mauvaise affaire si tu es
              proche d'une frontière de tranche TMI.
            </p>

            <h3 className="text-xl font-bold text-white mt-8">
              Comparatif détaillé
            </h3>
            <p>
              Tableau complet par profil (étudiant, retraité, cadre, trader),
              calculs chiffrés et méthode case 2OP pas-à-pas dans nos guides{" "}
              <Link
                href="/blog/bareme-progressif-vs-pfu-crypto-2026"
                className="text-primary-soft underline"
              >
                Barème progressif ou PFU 30 % crypto — lequel choisir en 2026
              </Link>{" "}
              et{" "}
              <Link
                href="/blog/eviter-pfu-30-crypto-bareme-progressif-legalement-2026"
                className="text-primary-soft underline"
              >
                Comment éviter le PFU 30 % crypto légalement
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ====================== SEO 3 — Déclaration pas-à-pas (~1000 mots) ===================== */}
      <section
        id="declaration-2086-3916-bis"
        className="py-16 sm:py-20 border-t border-border/60"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <span className="badge-info">Déclaration 2026</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Déclaration crypto : étapes 2086 + 3916-bis pas-à-pas
          </h2>
          <div className="mt-6 space-y-4 text-white/80 text-sm sm:text-base leading-relaxed">
            <p>
              Une fois ton calcul effectué, deux formulaires obligatoires à
              déposer avec ta déclaration de revenus 2026 (sur les revenus
              2025). Le <strong>Cerfa 2086</strong> détaille tes cessions
              imposables ligne par ligne. Le <strong>Cerfa 3916-bis</strong>{" "}
              déclare tes comptes ouverts sur des plateformes étrangères
              (Binance, Kraken Irlande, Bitget, Coinbase Irlande, Bitpanda
              Autriche). L'oubli du 3916-bis coûte 750 euros à 1 500 euros par
              compte.
            </p>

            <h3 className="text-xl font-bold text-white mt-8">
              Étape 1 — Récupère tes données
            </h3>
            <p>
              Connecte-toi à chaque plateforme et exporte le CSV complet de
              l'année 2025 (généralement section "Historique" ou "Tax report").
              Tu auras besoin : date de chaque cession, prix de cession en
              euros, frais payés, prix d'acquisition cumulé. Pour les wallets
              DeFi (MetaMask, Phantom), un explorateur blockchain (Etherscan,
              Solscan) reconstitue ton historique.
            </p>

            <h3 className="text-xl font-bold text-white mt-8">
              Étape 2 — Calcule ta plus-value avec notre outil
            </h3>
            <p>
              Saisis tes cessions, achats, valeur globale du portefeuille et
              frais dans notre calculateur ci-dessus. Il applique automatiquement
              la formule article 150 VH bis (avec le prorata) et te donne le
              total plus-value à reporter, sous PFU 30 % et sous barème
              progressif. Calcul 100 % local, aucune donnée envoyée.
            </p>

            <h3 className="text-xl font-bold text-white mt-8">
              Étape 3 — Connecte-toi sur impots.gouv.fr
            </h3>
            <p>
              Sur impots.gouv.fr, clique sur "Déclarer mes revenus", coche la
              rubrique <strong>"Plus-values et gains divers"</strong> (rubrique
              3). Continue jusqu'à l'écran "Plus-values sur actifs numériques",
              clique sur <strong>"Annexe 2086"</strong>. Le formulaire dynamique
              s'ouvre avec ses 8 colonnes : date cession (211), prix cession
              (212), frais (213), prix cession net (214), valeur globale
              portefeuille (215), prix total acquisition (216), fraction
              imputée (217), plus-value (218).
            </p>

            <h3 className="text-xl font-bold text-white mt-8">
              Étape 4 — Remplis le Cerfa 2086 ligne par ligne
            </h3>
            <p>
              Une ligne par cession (ou agrégation par crypto/mois si tu as plus
              de 30 cessions). Saisis le prix de cession brut (col. 212), les
              frais de cession (col. 213), le prix net (col. 214 = auto), la
              valeur globale de TON portefeuille au jour de cession (col. 215 —
              tous wallets confondus), le prix total d'acquisition (col. 216),
              la fraction imputée (col. 217 = auto), et la plus-value (col. 218
              = auto). Tutoriel complet :{" "}
              <Link
                href="/blog/declaration-crypto-cerfa-2086-tutoriel-2026"
                className="text-primary-soft underline"
              >
                Déclaration crypto Cerfa 2086 — tutoriel 2026
              </Link>
              .
            </p>

            <h3 className="text-xl font-bold text-white mt-8">
              Étape 5 — Reporte le total sur le 2042-C
            </h3>
            <p>
              Le total annuel des plus-values du Cerfa 2086 se reporte
              automatiquement en <strong>case 3AN</strong> du Cerfa 2042-C
              (déclaration complémentaire). Pour les moins-values, c'est la
              <strong> case 3BN</strong>. Si tu as des stocks de moins-values
              antérieures à imputer, utilise la <strong>case 3SG</strong>. Si tu
              veux opter pour le barème progressif, coche aussi la{" "}
              <strong>case 2OP</strong>.
            </p>

            <h3 className="text-xl font-bold text-white mt-8">
              Étape 6 — N'oublie pas le Cerfa 3916-bis
            </h3>
            <p>
              Pour <strong>chaque compte ouvert sur une plateforme étrangère</strong>{" "}
              en 2025 (même inactif), tu dois déposer un Cerfa 3916-bis :
              identité du compte, plateforme, pays, numéro de compte (UID
              Binance), date d'ouverture/clôture. Sanction d'oubli : 750 euros
              par compte si solde inférieur à 50 000 euros, 1 500 euros au-dessus.
              Applicable rétroactivement sur 4 à 6 ans. Tutoriel :{" "}
              <Link
                href="/blog/cerfa-3916-bis-crypto-declarer-comptes-etrangers-2026"
                className="text-primary-soft underline"
              >
                Cerfa 3916-bis — déclarer ses comptes crypto étrangers 2026
              </Link>
              .
            </p>

            <h3 className="text-xl font-bold text-white mt-8">
              Étape 7 — Calendrier et derniers contrôles
            </h3>
            <p>
              La déclaration en ligne ouvre le 10 avril 2026. Date limite : 22
              mai 2026 (départements 1-19), 29 mai 2026 (20-54), 5 juin 2026
              (55-95 + outre-mer + non-résidents hors UE). Tu peux modifier ta
              déclaration en ligne <strong>jusqu'au 4 décembre 2026</strong>{" "}
              sans pénalité, ce qui est une bonne sécurité si tu réalises avoir
              oublié une cession ou un compte. Avis d'impôt envoyé entre juillet
              et septembre 2026, paiement solde au 15 septembre 2026.
            </p>
          </div>
        </div>
      </section>

      {/* ===================== Aide formulaires ====================== */}
      <section className="py-16 sm:py-20 border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="badge-info">Déclaration</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Aide pour remplir tes formulaires
            </h2>
            <p className="mt-3 text-white/70">
              Une fois le calcul effectué, deux formulaires à déposer avec ta
              déclaration de revenus.
            </p>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 gap-6">
            <Link
              href="/blog/declaration-crypto-cerfa-2086-tutoriel-2026"
              className="glass rounded-2xl p-6 sm:p-8 hover:border-primary/60 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText
                  className="h-6 w-6 text-primary-soft"
                  aria-hidden="true"
                />
                <h3 className="font-display font-bold text-lg text-white">
                  Formulaire 2086
                </h3>
              </div>
              <p className="mt-3 text-sm text-white/70">
                Tutoriel complet 2026 ligne par ligne, captures, exemple
                Bitcoin entièrement rempli, erreurs fréquentes.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary-soft group-hover:gap-2 transition-all">
                Lire le guide{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>

            <Link
              href="/blog/cerfa-3916-bis-crypto-declarer-comptes-etrangers-2026"
              className="glass rounded-2xl p-6 sm:p-8 hover:border-primary/60 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <BookOpen
                  className="h-6 w-6 text-primary-soft"
                  aria-hidden="true"
                />
                <h3 className="font-display font-bold text-lg text-white">
                  Formulaire 3916-bis
                </h3>
              </div>
              <p className="mt-3 text-sm text-white/70">
                Déclaration des comptes crypto à l'étranger (Binance, Kraken,
                Coinbase…). Obligatoire même sans vente. 750 € d'amende par
                compte oublié.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary-soft group-hover:gap-2 transition-all">
                Lire le guide{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* =============== Outils complémentaires (Waltio…) =============== */}
      <section
        id="outils-complementaires"
        className="py-16 sm:py-20 border-t border-border/60"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="badge-info">Outils complémentaires</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Au-delà de 30 transactions, automatise avec un logiciel dédié
            </h2>
            <p className="mt-3 text-white/75">
              Notre calculateur gratuit te donne le montant d'impôt en 2 min,
              mais ne génère pas les formulaires Cerfa pré-remplis. Pour ça, on
              recommande <strong>Waltio</strong> (édité en France, 30 % de
              réduction Cryptoreflex). Comparatif complet Waltio vs Koinly vs
              CoinTracking pour bien choisir.
            </p>
          </div>

          <div className="mt-8 glass rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileText
                className="h-6 w-6 shrink-0 text-primary-soft mt-0.5"
                aria-hidden="true"
              />
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Comparatif outils déclaration fiscale crypto 2026
                </h3>
                <p className="mt-1 text-sm text-white/70">
                  Waltio vs Koinly vs CoinTracking : tarifs, support FR, exports
                  Cerfa, intégrations. 18 critères analysés.
                </p>
              </div>
            </div>
            <Link
              href="/outils/declaration-fiscale-crypto"
              className="btn-primary justify-center shrink-0"
            >
              Voir le comparatif
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================ FAQ ============================ */}
      <section className="py-16 sm:py-20 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <span className="badge-info">FAQ</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Questions fréquentes — fiscalité crypto 2026
          </h2>

          <div className="mt-8 space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group glass rounded-xl p-5 open:border-primary/40 transition-colors"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-3 font-semibold text-white">
                  <span>{item.question}</span>
                  <span
                    className="text-primary-soft text-xl leading-none mt-0.5 transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-white/75 leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-warning/40 bg-warning/10 p-5 text-sm text-white/90 flex gap-3">
            <AlertTriangle
              className="h-5 w-5 shrink-0 text-warning-fg mt-0.5"
              aria-hidden="true"
            />
            <p>
              <strong className="text-warning-fg">Rappel :</strong> Cet outil
              ne remplace pas un expert-comptable agréé. Pour des situations
              complexes (staking, lending, NFT, mining, activité habituelle),
              fais-toi accompagner par un professionnel.
            </p>
          </div>
        </div>
      </section>

      {/* ============================ Articles connexes (cluster fiscalité) ============================ */}
      <section
        id="articles-connexes"
        className="py-16 sm:py-20 border-t border-border/60"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="badge-info">Cluster fiscalité</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Articles connexes — cluster fiscalité crypto
            </h2>
            <p className="mt-3 text-white/70">
              Le calculateur ci-dessus s'appuie sur 10 guides détaillés
              (5 satellites long-tail + 5 piliers du silo). Approfondis chaque
              cas spécifique selon ta situation fiscale.
            </p>
          </div>

          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {RELATED_FISCALITE_ARTICLES.map((article) => (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                className="glass rounded-2xl p-5 hover:border-primary/60 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                      article.cluster === "satellite"
                        ? "bg-primary/15 text-primary-soft"
                        : "bg-success/15 text-success"
                    }`}
                  >
                    {article.cluster === "satellite" ? "Satellite" : "Pilier"}
                  </span>
                  <span className="text-xs text-white/60">
                    {article.category}
                  </span>
                </div>
                <h3 className="mt-3 font-display font-bold text-base text-white group-hover:text-primary-soft transition-colors">
                  {article.title}
                </h3>
                <p className="mt-2 text-xs text-white/70 leading-relaxed line-clamp-3">
                  {article.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-primary-soft group-hover:gap-2 transition-all">
                  Lire le guide{" "}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
