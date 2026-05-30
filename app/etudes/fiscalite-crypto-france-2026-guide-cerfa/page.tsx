import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  AlertTriangle,
  Calculator,
  ShieldCheck,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import NewsletterInline from "@/components/NewsletterInline";
import PackCTABlock from "@/components/fiscalite/PackCTABlock";
import { withHreflang } from "@/lib/seo-alternates";

/**
 * /etudes/fiscalite-crypto-france-2026-guide-cerfa
 *
 * Cornerstone #2 : guide complet fiscalite crypto FR 2026.
 *
 * Aligne avec :
 *  - Saison fiscale active (mai 2026, deadline declaration revenus 19 mai)
 *  - LP /lp/cerfa-2026 (pre-conversion)
 *  - CP #2 fiscalite (Affidavit Press)
 *  - Outil /outils/cerfa-2086-auto (CTA principal)
 *
 * SEO target : "fiscalite crypto 2026", "comment declarer crypto impots",
 * "Cerfa 2086 explication", "BOI-RPPM-PVBMC-30-30", "PFU 31,4%".
 *
 * 4 schemas JSON-LD : Article + ResearchProject + FAQPage + BreadcrumbList.
 */

const PUBLISHED_DATE = "2026-05-06";
const LAST_UPDATED = "2026-05-06";

const TITLE =
  "Fiscalité crypto France 2026 : guide complet Cerfa 2086 + 3916-bis";
const DESCRIPTION =
  "Tout sur la déclaration des cryptos en 2026 : régime PFU 31,4%, Cerfa 2086 ligne par ligne, annexe 3916-bis (comptes étrangers), cas particuliers (staking, NFT, airdrops). Sources BOFiP officielles.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(`${BRAND.url}/etudes/fiscalite-crypto-france-2026-guide-cerfa`),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BRAND.url}/etudes/fiscalite-crypto-france-2026-guide-cerfa`,
    type: "article",
    publishedTime: PUBLISHED_DATE,
    modifiedTime: LAST_UPDATED,
  },
  robots: { index: true, follow: true },
};

const STATS = [
  {
    value: "5,2 M",
    label: "Français détenteurs crypto (ADAN/Ipsos 2025)",
    color: "text-cyan-400",
  },
  {
    value: "30 %",
    label: "PFU sur plus-values crypto",
    color: "text-emerald-400",
  },
  {
    value: "21 mai",
    label: "Deadline déclaration revenus 2026",
    color: "text-amber-400",
  },
  {
    value: "305 €",
    label: "seuil annuel d’exonération",
    color: "text-indigo-400",
  },
];

const TOC = [
  { id: "tldr", label: "Résumé exécutif" },
  { id: "calendrier", label: "1. Calendrier 2026" },
  { id: "regime", label: "2. Régime fiscal applicable" },
  { id: "cerfa-2086", label: "3. Cerfa 2086 ligne par ligne" },
  { id: "cerfa-3916", label: "4. Annexe 3916-bis" },
  { id: "cas-speciaux", label: "5. Cas particuliers" },
  { id: "erreurs", label: "6. Erreurs courantes & redressements" },
  { id: "optimisation", label: "7. Optimisation légale" },
  { id: "outils", label: "8. Outils gratuits" },
  { id: "faq", label: "9. FAQ" },
  { id: "sources", label: "10. Sources & méthodologie" },
];

const FAQ = [
  {
    q: "À partir de quel montant suis-je obligé de déclarer mes cessions crypto ?",
    a: "À partir de 305 € de cessions cumulées dans l’année. En dessous de ce seuil, vous êtes exonéré de l’impôt sur la plus-value. Au-dessus, l’ensemble de la plus-value (et non l’excédent au-delà de 305 €) est imposable au PFU 31,4 %. Attention : le seuil de 305 € s’applique au montant des CESSIONS (vente vers euro), pas au montant de la plus-value elle-même.",
  },
  {
    q: "Le change crypto-vers-crypto (token-to-token) est-il imposable ?",
    a: "Non. Depuis la loi PACTE de 2019 (art. 41) et confirmé par BOFiP RPPM-PVBMC-30-30 §10, les opérations d’échange entre actifs numériques sont fiscalement neutres : ni gain ni perte n’est constaté à l’occasion de l’échange. Seule la cession contre devise ayant cours légal (euro, dollar, etc.) ou contre un bien/service déclenche un événement imposable.",
  },
  {
    q: "Comment calcule-t-on la plus-value ?",
    a: "La formule officielle (BOFiP §70) est : Plus-Value = Prix de cession − [Prix total d’acquisition × (Prix de cession / Valeur globale du portefeuille à la date de cession)]. Cette formule, dite « par fraction », tient compte du prix moyen pondéré du portefeuille au moment de chaque cession. Elle est complexe à calculer à la main, d’où l’existence d’outils dédiés.",
  },
  {
    q: "Dois-je déclarer mes cryptos même si je n’ai rien vendu ?",
    a: "Pour le Cerfa 2086 (plus-values) : non, l’absence de cession contre euro = pas de déclaration. Pour l’annexe 3916-bis (comptes étrangers) : OUI. Tout compte ouvert chez un exchange étranger (Binance, Kraken, Coinbase, Bybit, etc.) doit être déclaré chaque année tant qu’il existe, même sans transaction. Oubli = amende 750 € par compte non déclaré (1 500 € si solde supérieur à 50 000 €, ou 10 000 € si compte dans un État non coopératif).",
  },
  {
    q: "Que se passe-t-il en cas de moins-value (perte) ?",
    a: "Les moins-values crypto sont imputables uniquement sur les plus-values crypto de la même année (BOFiP §150). Elles ne sont pas reportables sur les années suivantes (à la différence des moins-values mobilières classiques). En revanche, elles ne se compensent PAS avec d’autres revenus (salaires, dividendes, etc.). Une perte crypto qui n’est pas compensée par un gain crypto la même année est définitivement perdue fiscalement.",
  },
  {
    q: "Le staking et les rewards Proof-of-Stake sont-ils imposables ?",
    a: "Oui, mais le régime n’est pas encore parfaitement stabilisé. La doctrine actuelle (publication BOFiP attendue 2026) considère que les rewards de staking sont imposables au moment de la cession (vente contre euro), pas au moment de leur réception. Le prix d’acquisition retenu est généralement zéro (gain en capital intégral), sauf si le contribuable peut démontrer un autre prix de revient. Pour les patrimoines élevés, consulter un expert-comptable.",
  },
  {
    q: "Les NFT et les memecoins sont-ils traités différemment ?",
    a: "Pour les NFT : régime spécifique non encore stabilisé. La doctrine actuelle (BOFiP en cours de rédaction) tend à appliquer le régime des cessions d’œuvres d’art (régime forfaitaire 6,5 %) lorsque le NFT a une dimension artistique, sinon le régime PFU 31,4 % crypto. Les memecoins (DOGE, SHIB, etc.) suivent strictement le régime crypto classique : PFU 31,4 % à la cession contre euro.",
  },
  {
    q: "Si j’utilise un exchange français (Coinhouse, Bitstack), dois-je quand même remplir le 3916-bis ?",
    a: "Non, si l’exchange est régulé en France (PSAN/CASP avec siège social FR). Coinhouse et Bitstack sont des entités françaises : leurs comptes ne sont PAS étrangers et ne déclenchent pas l’obligation 3916-bis. En revanche, Coinbase Europe Limited (Irlande), Bitpanda (Autriche), Kraken (Irlande), Binance France SAS (entité FR mais comptes hébergés sur infrastructure UE) sont à vérifier au cas par cas : si vous accédez à un compte hébergé hors France, déclarez par sécurité.",
  },
  {
    q: "Y a-t-il un risque de redressement TRACFIN si je déclare correctement ?",
    a: "Non. TRACFIN intervient sur les obligations de transparence anti-blanchiment, pas sur la fiscalité. Une déclaration correcte du Cerfa 2086 + 3916-bis vous met en règle vis-à-vis de la DGFiP. Les redressements crypto les plus courants observés en 2024-2025 concernent : (1) l’absence totale de déclaration malgré des cessions, (2) l’oubli du 3916-bis sur les exchanges étrangers, (3) la déclaration tardive ou incomplète. Un dossier complet et déclaré dans les délais réduit drastiquement le risque.",
  },
  {
    q: "L’outil gratuit Cryptoreflex remplace-t-il un expert-comptable ?",
    a: "Non. L’outil /outils/cerfa-2086-auto automatise le calcul mécanique de la plus-value selon la formule BOFiP §70 et génère le PDF pré-rempli. Pour les patrimoines complexes (>50k€, multi-exchanges, staking, DeFi, NFT), Cryptoreflex recommande systématiquement la validation par un expert-comptable agréé maîtrisant la fiscalité numérique. L’outil est un assistant, pas un conseil fiscal personnalisé.",
  },
];

const SOURCES = [
  {
    name: "BOFiP — BOI-RPPM-PVBMC-30-30 (Plus-values actifs numériques)",
    url: "https://bofip.impots.gouv.fr/bofip/11704-PGP.html/identifiant=BOI-RPPM-PVBMC-30-30",
  },
  {
    name: "BOFiP — Régime des comptes ouverts à l’étranger",
    url: "https://bofip.impots.gouv.fr/bofip/3863-PGP.html",
  },
  {
    name: "Article 150 VH bis du CGI (régime des plus-values numériques)",
    url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038612084/",
  },
  {
    name: "Loi PACTE 2019-486 (art. 41 — neutralité fiscale token-to-token)",
    url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000038496102/",
  },
  {
    name: "DGFiP — Notice Cerfa 2086 (déclaration plus-values numériques)",
    url: "https://www.impots.gouv.fr/portail/formulaire/2086/declaration-des-plus-ou-moins-values-realisees-en-2024",
  },
  {
    name: "DGFiP — Annexe 3916-bis (comptes ouverts à l’étranger)",
    url: "https://www.impots.gouv.fr/portail/formulaire/3916/declaration-par-un-resident-dun-compte-ouvert-hors-de-france",
  },
  {
    name: "ADAN x Ipsos — Étude des Français et la crypto 2025",
    url: "https://adan.eu/etudes/",
  },
];

const baseUrl = BRAND.url;

const breadcrumb = breadcrumbSchema([
  { name: "Accueil", url: baseUrl + "/" },
  { name: "Études", url: baseUrl + "/etudes" },
  {
    name: "Fiscalité crypto France 2026",
    url: baseUrl + "/etudes/fiscalite-crypto-france-2026-guide-cerfa",
  },
]);

const article = articleSchema({
  slug: "etudes/fiscalite-crypto-france-2026-guide-cerfa",
  title: TITLE,
  description: DESCRIPTION,
  date: PUBLISHED_DATE,
  dateModified: LAST_UPDATED,
  category: "Fiscalité",
  tags: [
    "Cerfa 2086",
    "3916-bis",
    "PFU",
    "BOFiP",
    "fiscalité crypto",
    "France",
    "DGFiP",
  ],
  readTime: "22 min",
  author: "Kevin Voisin",
});

const faq = faqSchema(FAQ.map((f) => ({ question: f.q, answer: f.a })));

const researchProject = {
  "@context": "https://schema.org",
  "@type": "ResearchProject",
  name: TITLE,
  description: DESCRIPTION,
  url: baseUrl + "/etudes/fiscalite-crypto-france-2026-guide-cerfa",
  sponsor: {
    "@type": "Organization",
    name: "Cryptoreflex",
    url: baseUrl,
  },
  funding: "Auto-financé (Cryptoreflex SARL)",
  about: [
    "BOI-RPPM-PVBMC-30-30",
    "Cerfa 2086",
    "Cerfa 3916-bis",
    "PFU 31,4 % (Prélèvement Forfaitaire Unique)",
    "Article 150 VH bis du Code général des impôts",
  ],
};

const jsonLd: JsonLd = graphSchema([breadcrumb, article, faq, researchProject]);

export default function FiscaliteCryptoStudyPage() {
  return (
    <main className="min-h-screen bg-[#05060A] text-slate-100">
      <StructuredData id="fiscalite-study-jsonld" data={jsonLd} />

      {/* Hero */}
      <section className="border-b border-white/5 bg-gradient-to-b from-emerald-500/5 to-transparent">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <nav className="mb-6 text-sm text-slate-400" aria-label="Fil d'Ariane">
            <Link href="/" className="hover:text-cyan-300">
              Accueil
            </Link>
            <span className="mx-2 text-slate-600">/</span>
            <Link href="/etudes" className="hover:text-cyan-300">
              Études
            </Link>
            <span className="mx-2 text-slate-600">/</span>
            <span className="text-slate-300">Fiscalité crypto FR 2026</span>
          </nav>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <Calculator className="h-3.5 w-3.5" />
            Étude fiscale — Cryptoreflex Research
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl leading-tight">
            Fiscalité crypto France 2026 :<br className="hidden sm:block" /> guide
            complet Cerfa 2086 + 3916-bis
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Publié le{" "}
              {new Date(PUBLISHED_DATE).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              22 min de lecture
            </span>
            <span className="inline-flex items-center gap-1.5">
              Mis à jour le{" "}
              {new Date(LAST_UPDATED).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              Auteur :{" "}
              <Link href="/a-propos" className="text-cyan-300 hover:underline">
                Kevin Voisin
              </Link>
            </span>
          </div>

          <p className="mt-6 text-lg text-slate-300 leading-relaxed">
            Tout ce qu’il faut savoir pour déclarer ses cryptomonnaies en
            France en 2026 : régime PFU 31,4 %, Cerfa 2086 ligne par ligne,
            annexe 3916-bis (comptes étrangers), cas particuliers (staking,
            NFT, airdrops, hard forks). Sources BOFiP officielles. Méthodologie
            publique. <strong>Aucun conseil fiscal personnalisé</strong> —
            information à valider avec un expert-comptable pour les patrimoines
            complexes.
          </p>

          {/* Stats grid */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-slate-400 leading-tight">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Primary CTA */}
          <div className="mt-8">
            <Link
              href="/outils/cerfa-2086-auto"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-3 font-bold text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition"
            >
              Outil gratuit Cerfa 2086 auto
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* TOC */}
      <section className="border-b border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Sommaire
          </h2>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
            {TOC.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="inline-flex items-center gap-2 text-slate-300 hover:text-cyan-300 transition"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-cyan-500" />
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Body */}
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 prose prose-invert prose-slate prose-headings:tracking-tight prose-headings:text-white prose-p:text-slate-300 prose-li:text-slate-300 prose-a:text-cyan-300 prose-strong:text-white">
        {/* TL;DR */}
        <section id="tldr">
          <h2 className="text-2xl font-bold tracking-tight">Résumé exécutif</h2>
          <ul className="mt-4 space-y-2 list-none p-0">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <strong>PFU 31,4 %</strong> applicable aux plus-values
                crypto-fiat (12,8 % IR + 18,6 % CSG/CRDS). Régime obligatoire
                par défaut depuis 2023, sauf option pour le barème progressif.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <strong>Cessions &lt; 305 €</strong> dans l’année :
                exonération totale d’impôt (mais déclaration recommandée si
                portefeuille étranger).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <strong>Token-to-token non taxable</strong> depuis la loi
                PACTE 2019. Seule la cession token-to-fiat (ou token-to-bien)
                déclenche un événement imposable.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <strong>Annexe 3916-bis obligatoire</strong> pour tout compte
                ouvert chez un exchange étranger (Binance, Kraken, Coinbase,
                etc.). Oubli = amende 750 €/compte (1 500 € si solde &gt; 50 000 €,
                10 000 € en cas d’État non coopératif).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-cyan-400" />
              <span>
                <strong>Deadline 2026</strong> : déclaration des revenus 2025
                avant le <strong>21 mai 2026</strong> (départements 1-19 et
                non-résidents) ou <strong>début juin</strong> selon le
                département.
              </span>
            </li>
          </ul>
        </section>

        {/* 1. Calendrier */}
        <section id="calendrier" className="mt-12">
          <h2>1. Calendrier 2026</h2>
          <p>
            La déclaration des revenus 2025 — incluant les cessions
            crypto-fiat — se fait entre <strong>avril et début juin 2026</strong>{" "}
            selon le département de résidence et le mode de déclaration (papier
            vs en ligne).
          </p>
          <div className="my-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Action</th>
                  <th className="pb-3">Concerné</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-3 pr-4 font-mono text-cyan-300">
                    Avril 2026
                  </td>
                  <td className="py-3 pr-4 font-medium">
                    Ouverture du service de déclaration en ligne
                  </td>
                  <td className="py-3">Tous résidents fiscaux FR.</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-amber-300">
                    19 mai 2026
                  </td>
                  <td className="py-3 pr-4 font-medium">
                    Date limite déclaration papier
                  </td>
                  <td className="py-3">Contribuables sans accès internet.</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-amber-300">
                    21 mai 2026
                  </td>
                  <td className="py-3 pr-4 font-medium">
                    Limite — départements 1 à 19 + non-résidents
                  </td>
                  <td className="py-3">Cible la plus précoce en ligne.</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-amber-300">
                    28 mai 2026
                  </td>
                  <td className="py-3 pr-4 font-medium">
                    Limite — départements 20 à 54
                  </td>
                  <td className="py-3">2ème vague.</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-amber-300">
                    4 juin 2026
                  </td>
                  <td className="py-3 pr-4 font-medium">
                    Limite — départements 55 à 976
                  </td>
                  <td className="py-3">3ème vague (DOM-TOM inclus).</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm">
            Les dates officielles 2026 sont publiées par la DGFiP sur{" "}
            <a
              href="https://www.impots.gouv.fr"
              target="_blank"
              rel="noreferrer noopener"
            >
              impots.gouv.fr
            </a>
            .
          </p>
        </section>

        {/* 2. Régime */}
        <section id="regime" className="mt-12">
          <h2>2. Régime fiscal applicable</h2>
          <h3>2.1. Le PFU 31,4 %</h3>
          <p>
            Les plus-values de cession d’actifs numériques par les particuliers
            relèvent du <strong>Prélèvement Forfaitaire Unique (PFU)</strong>{" "}
            défini à l’article 200 A du Code général des impôts (CGI). Le taux
            est de <strong>30 %</strong>, qui se décompose en :
          </p>
          <ul>
            <li>
              <strong>12,8 %</strong> au titre de l’impôt sur le revenu (IR) ;
            </li>
            <li>
              <strong>17,2 %</strong> au titre des prélèvements sociaux (CSG +
              CRDS).
            </li>
          </ul>
          <p>
            Le PFU s’applique <strong>par défaut</strong> aux plus-values de
            cession d’actifs numériques depuis l’imposition des revenus 2023.
            Les contribuables peuvent opter pour le <strong>barème progressif</strong>{" "}
            à condition que cette option couvre l’ensemble des revenus du
            capital de l’année (intérêts, dividendes, plus-values mobilières et
            crypto). L’option est avantageuse uniquement pour les contribuables
            dont la TMI (Tranche Marginale d’Imposition) est inférieure à 12,8
            % — soit des revenus annuels imposables inférieurs à environ
            28 800 € pour un célibataire.
          </p>
          <h3>2.2. Le seuil d’exonération de 305 €</h3>
          <p>
            L’article 150 VH bis I-2° du CGI prévoit une{" "}
            <strong>exonération totale</strong> de la plus-value lorsque le{" "}
            <strong>montant total des cessions</strong> de l’année n’excède pas
            305 €. Le seuil porte sur le <em>prix de cession</em>, pas sur la
            plus-value elle-même.
          </p>
          <p>
            <strong>Exemple chiffré.</strong> Vous achetez 1 BTC à 30 000 € en
            2024. Vous le vendez 32 000 € en 2025. La plus-value est de
            2 000 €, MAIS le montant de la cession est de 32 000 € — bien
            au-dessus de 305 €. La plus-value est donc imposable au PFU 31,4 % =
            600 €.
          </p>
          <p>
            <strong>Exemple inverse.</strong> Vous vendez 50 € de Bitcoin pour
            tester un retrait. Pas d’autre cession dans l’année. Cessions
            totales = 50 € &lt; 305 € → exonération totale, pas d’impôt sur la
            plus-value (mais toujours le 3916-bis si le compte est à
            l’étranger).
          </p>
          <h3>2.3. La formule de calcul de la plus-value</h3>
          <p>
            La doctrine BOFiP §70 prévoit une formule dite « par fraction » qui
            tient compte du prix moyen pondéré du portefeuille global au moment
            de chaque cession :
          </p>
          <pre className="not-prose rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-xs text-slate-200 overflow-x-auto my-4">
            <code>{`PV = Px_cession − (Px_acq_total × (Px_cession / Valeur_globale_portefeuille))`}</code>
          </pre>
          <p>Avec :</p>
          <ul>
            <li>
              <strong>PV</strong> : plus-value de la cession.
            </li>
            <li>
              <strong>Px_cession</strong> : prix de cession (en euros, à la date
              de la cession).
            </li>
            <li>
              <strong>Px_acq_total</strong> : somme des prix d’acquisition de
              tous les actifs numériques détenus au moment de la cession.
            </li>
            <li>
              <strong>Valeur_globale_portefeuille</strong> : valeur de marché de
              l’ensemble du portefeuille à la date de la cession.
            </li>
          </ul>
          <p>
            Cette formule est complexe à appliquer manuellement, notamment en
            cas de cessions multiples ou de portefeuille fragmenté entre
            plusieurs exchanges. Un outil dédié (
            <Link href="/outils/cerfa-2086-auto">
              /outils/cerfa-2086-auto
            </Link>
            ) automatise le calcul à partir d’un export CSV.
          </p>
        </section>

        {/* 3. Cerfa 2086 */}
        <section id="cerfa-2086" className="mt-12">
          <h2>3. Cerfa 2086 ligne par ligne</h2>
          <p>
            Le formulaire <strong>Cerfa 2086</strong> est l’annexe à la
            déclaration des revenus (formulaire 2042) qui détaille chaque
            cession d’actifs numériques de l’année. Il se compose de plusieurs
            sections :
          </p>
          <h3>3.1. Identification du contribuable (lignes 1-3)</h3>
          <p>
            Nom, prénom, numéro fiscal. Pré-rempli si vous déclarez en ligne.
          </p>
          <h3>3.2. Détail des cessions (lignes 211 à 234)</h3>
          <p>Pour chaque cession, indiquer :</p>
          <ul>
            <li>
              <strong>Ligne 211</strong> — Date de la cession (JJ/MM/AAAA).
            </li>
            <li>
              <strong>Ligne 212</strong> — Prix de cession (en euros, net de
              frais d’exchange).
            </li>
            <li>
              <strong>Ligne 213</strong> — Frais inhérents à la cession (frais
              de plateforme, déductibles du prix de cession).
            </li>
            <li>
              <strong>Ligne 214</strong> — Prix d’acquisition retenu pour la
              cession (calculé selon la formule par fraction §70).
            </li>
            <li>
              <strong>Ligne 215</strong> — Plus-value ou moins-value de la
              cession.
            </li>
          </ul>
          <h3>3.3. Récapitulatif annuel (lignes 233-235)</h3>
          <ul>
            <li>
              <strong>Ligne 233</strong> — Somme totale des plus-values.
            </li>
            <li>
              <strong>Ligne 234</strong> — Somme totale des moins-values.
            </li>
            <li>
              <strong>Ligne 235</strong> — Plus-value nette imposable (233 −
              234).
            </li>
          </ul>
          <p>
            Le résultat de la ligne 235 est ensuite reporté sur la ligne{" "}
            <strong>3AN</strong> de la déclaration 2042-C (cessions d’actifs
            numériques) et imposé au PFU 31,4 %.
          </p>
          <h3>3.4. Saisie en ligne sur impots.gouv.fr</h3>
          <p>
            Si vous déclarez en ligne, le formulaire est intégré au parcours
            standard. Cherchez la section « Plus-values » → « Cessions
            d’actifs numériques » → cochez la case correspondante. Le détail
            des cessions est saisi dans une grille interactive.
          </p>
        </section>

        {/* 4. 3916-bis */}
        <section id="cerfa-3916" className="mt-12">
          <h2>4. Annexe 3916-bis : la déclaration des comptes étrangers</h2>
          <p>
            L’annexe 3916-bis (réf. CERFA 16091) est obligatoire pour toute
            personne physique ou morale fiscalement domiciliée en France qui{" "}
            <strong>détient, ouvre, utilise ou clôt</strong> un compte d’actifs
            numériques chez un prestataire établi à l’étranger.
          </p>
          <h3>4.1. Quels exchanges sont concernés ?</h3>
          <p>
            Tout exchange dont le siège social ou l’infrastructure de garde
            est situé hors de France. À la date de cette étude :
          </p>
          <ul>
            <li>
              <strong>Comptes à déclarer</strong> : Coinbase Europe (Irlande),
              Kraken (Irlande), Bitpanda (Autriche), Binance (entité MENA pour
              certains comptes), Bybit (BVI), KuCoin (Seychelles), MEXC
              (Seychelles), OKX (Malte), Bit2Me (Espagne), Bitvavo (Pays-Bas).
            </li>
            <li>
              <strong>Comptes NON à déclarer</strong> : Coinhouse (siège FR),
              Bitstack (siège FR), Binance France SAS (entité FR — sauf si
              certains comptes sont migrés sur l’infrastructure UE, à vérifier
              au cas par cas).
            </li>
          </ul>
          <h3>4.2. Sanctions en cas d’oubli</h3>
          <p>
            L’absence de déclaration d’un compte étranger entraîne une amende
            forfaitaire de :
          </p>
          <ul>
            <li>
              <strong>750 € par compte non déclaré</strong> (régime de droit
              commun), porté à <strong>1 500 €</strong> si le solde du compte
              dépasse 50 000 € à un moment de l’année ;
            </li>
            <li>
              <strong>10 000 € par compte non déclaré</strong> si l’État
              concerné figure sur la liste des États non coopératifs (rares
              cas pour la crypto).
            </li>
          </ul>
          <p>
            Cette amende s’applique <strong>par compte et par année</strong>{" "}
            d’omission, dans la limite de la prescription fiscale (6 à 10 ans
            selon les cas). Un oubli sur 4 ans pour 3 exchanges = 18 000 €
            d’amende théorique.
          </p>
          <h3>4.3. Régularisation spontanée</h3>
          <p>
            Si vous découvrez un oubli, la <strong>régularisation spontanée</strong>{" "}
            via le service de mise en conformité de la DGFiP réduit
            généralement les sanctions à un niveau symbolique (cf. circulaire
            n°2017-12-15 et pratique observée sur les régularisations crypto
            2023-2025).
          </p>
        </section>

        {/* 5. Cas spéciaux */}
        <section id="cas-speciaux" className="mt-12">
          <h2>5. Cas particuliers</h2>
          <h3>5.1. Staking et rewards Proof-of-Stake</h3>
          <p>
            La doctrine fiscale française considère que les rewards de staking
            sont fiscalement neutres au moment de leur réception (pas
            d’imposition) et imposables au moment de leur cession contre euro.
            Le prix d’acquisition retenu est généralement zéro (gain en
            capital intégral), sauf si le contribuable peut démontrer un autre
            prix de revient (par exemple, des frais d’exploitation d’un
            validator).
          </p>
          <p>
            Cette doctrine n’est pas encore stabilisée par un BOFiP dédié
            (publication attendue 2026). Pour les patrimoines stakés
            significatifs (&gt; 5 000 €/an de rewards), consulter un
            expert-comptable.
          </p>
          <h3>5.2. Airdrops et hard forks</h3>
          <p>
            Les tokens reçus gratuitement par airdrop ou suite à un hard fork
            sont, comme le staking, fiscalement neutres au moment de leur
            réception et imposables à la cession. Prix d’acquisition retenu :
            zéro (sauf si le contribuable a participé activement, par exemple
            en payant des frais de gas, auquel cas ces frais peuvent être
            imputés).
          </p>
          <h3>5.3. NFT (Non-Fungible Tokens)</h3>
          <p>
            Le régime fiscal des NFT n’est pas encore parfaitement stabilisé.
            La doctrine actuelle, en cours de consolidation par BOFiP, tend à
            distinguer :
          </p>
          <ul>
            <li>
              les NFT « œuvres d’art » (collections art-digital, génératifs
              certifiés) — éventuel régime forfaitaire 6,5 % des cessions
              d’œuvres d’art ;
            </li>
            <li>
              les NFT « utilitaires » (PFP collection, in-game, gaming
              assets) — régime PFU 31,4 % crypto classique.
            </li>
          </ul>
          <p>
            Cette distinction crée une zone grise : la plupart des
            contribuables et conseillers appliquent par sécurité le régime
            crypto PFU 31,4 % à tous les NFT.
          </p>
          <h3>5.4. DeFi (Aave, Uniswap, Compound, etc.)</h3>
          <p>
            Les opérations DeFi sont traitées comme des opérations crypto
            classiques :
          </p>
          <ul>
            <li>
              <strong>Liquidity provision (LP)</strong> : le dépôt d’actifs
              dans un pool n’est pas une cession (token-to-LP-token est
              considéré comme un échange neutre).
            </li>
            <li>
              <strong>Yield farming</strong> : les rewards reçus sont
              imposables à la cession contre euro.
            </li>
            <li>
              <strong>Lending</strong> : les intérêts perçus en crypto sont
              imposables à la cession contre euro.
            </li>
          </ul>
        </section>

        {/* 6. Erreurs */}
        <section id="erreurs" className="mt-12">
          <h2>6. Erreurs courantes & redressements</h2>
          <p>Les motifs de redressement crypto les plus observés en 2024-2025 :</p>
          <ol>
            <li>
              <strong>Absence totale de déclaration</strong> alors que des
              cessions ont été effectuées. Ce cas est facilement détecté par
              recoupement DGFiP avec les rapports d’exchanges via la directive
              DAC8 (échange automatique d’informations entre administrations
              fiscales européennes, applicable depuis 2026).
            </li>
            <li>
              <strong>Oubli du 3916-bis</strong> alors que des comptes
              étrangers existent. Détection facilitée par les obligations
              déclaratives des exchanges UE (CASP MiCA imposent des reporting
              à l’ESMA partagés avec les autorités fiscales).
            </li>
            <li>
              <strong>Calcul incorrect de la plus-value</strong> (oubli de la
              formule §70 par fraction). Erreur fréquente quand le contribuable
              calcule « cession − achat » sans tenir compte du prix moyen
              pondéré.
            </li>
            <li>
              <strong>Omission des frais de cession</strong> (pas déduits du
              prix de cession), ce qui gonfle artificiellement la plus-value.
            </li>
            <li>
              <strong>Confusion token-to-token / token-to-fiat</strong>.
              Certains contribuables déclarent à tort les swaps crypto-crypto
              comme imposables (alors qu’ils sont neutres depuis 2019).
            </li>
          </ol>
          <p className="text-sm">
            <strong className="text-amber-300">
              Recommandation pratique :
            </strong>{" "}
            si vous découvrez un oubli sur les années précédentes, déposez une
            déclaration rectificative avant tout contrôle. La régularisation
            spontanée réduit drastiquement les sanctions et démontre la bonne
            foi du contribuable.
          </p>
        </section>

        {/* 7. Optimisation */}
        <section id="optimisation" className="mt-12">
          <h2>7. Optimisation légale</h2>
          <p>
            La fiscalité crypto FR offre quelques leviers d’optimisation
            légaux. Aucun de ces leviers n’est un schéma d’évasion fiscale —
            tous sont prévus par le code général des impôts.
          </p>
          <h3>7.1. Étalement des cessions sur plusieurs années</h3>
          <p>
            Si votre patrimoine crypto contient des plus-values latentes
            importantes, étaler les cessions sur 2 ou 3 années fiscales peut
            optimiser. L’avantage est moindre depuis 2018 (PFU à taux fixe),
            mais l’étalement permet de :
          </p>
          <ul>
            <li>profiter du seuil d’exonération 305 €/an plusieurs fois ;</li>
            <li>
              optimiser le couplage avec d’autres revenus (option barème
              progressif si revenus globaux faibles l’année N) ;
            </li>
            <li>
              lisser l’impact CSG/CRDS (qui n’est pas plafonné).
            </li>
          </ul>
          <h3>7.2. Compensation moins-values / plus-values intra-annuelle</h3>
          <p>
            Les moins-values crypto ne sont pas reportables d’une année sur
            l’autre. Pour les optimiser, il faut les compenser{" "}
            <strong>la même année</strong> avec des plus-values crypto. Si
            votre portefeuille contient des positions perdantes que vous
            comptez liquider, le faire avant le 31 décembre permet de
            compenser les gains réalisés sur d’autres positions la même année.
          </p>
          <h3>7.3. Don manuel / transmission</h3>
          <p>
            Le don de cryptomonnaies à un proche (en ligne directe, en
            descendant, etc.) bénéficie des abattements de droit commun de
            l’article 779 du CGI :
          </p>
          <ul>
            <li>100 000 € entre parent et enfant tous les 15 ans ;</li>
            <li>31 865 € entre grand-parent et petit-enfant ;</li>
            <li>80 724 € entre époux/PACS.</li>
          </ul>
          <p>
            Le don purge la plus-value latente : le donataire reçoit les
            cryptos avec une nouvelle base de coût (la valeur au jour du don).
            Pour les patrimoines crypto familiaux importants, c’est un levier
            majeur — à valider par notaire pour les valeurs au-dessus des
            abattements.
          </p>
          <h3>7.4. Option barème progressif si TMI faible</h3>
          <p>
            Si votre Tranche Marginale d’Imposition est inférieure à 12,8 %,
            vous avez intérêt à opter pour le barème progressif au lieu du
            PFU. Cette option couvre l’ensemble des revenus du capital de
            l’année (intérêts, dividendes, plus-values), à exercer chaque
            année lors de la déclaration.
          </p>
          <h3>7.5. Démembrement et nue-propriété</h3>
          <p>
            Pour les patrimoines crypto importants (&gt; 500 000 €), le
            démembrement (donation de la nue-propriété en gardant l’usufruit)
            permet d’optimiser la transmission. Schéma à valider impérativement
            avec un notaire.
          </p>
          <p className="text-sm">
            <strong>Rappel.</strong> Cryptoreflex ne fournit pas de conseil
            fiscal personnalisé. Pour toute optimisation au-delà des cas
            standards (cessions courantes), consulter un expert-comptable
            spécialisé en fiscalité numérique ou un conseiller en gestion de
            patrimoine (CGP).
          </p>
        </section>

        {/* 8. Outils gratuits */}
        <section id="outils" className="mt-12">
          <h2>8. Outils gratuits Cryptoreflex</h2>
          <p>
            Cryptoreflex propose plusieurs outils gratuits pour automatiser le
            calcul et la déclaration :
          </p>
          <ul className="not-prose mt-4 space-y-3">
            <li className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <Link
                href="/outils/cerfa-2086-auto"
                className="block hover:text-cyan-300"
              >
                <div className="flex items-start gap-3">
                  <Calculator className="mt-1 h-4 w-4 shrink-0 text-cyan-400" />
                  <div>
                    <strong className="text-white">
                      /outils/cerfa-2086-auto
                    </strong>
                    <p className="mt-1 text-sm text-slate-300">
                      Génère le Cerfa 2086 + 3916-bis pré-remplis depuis un
                      CSV exchange. Calcul automatique de la formule §70.
                      Sans inscription.
                    </p>
                  </div>
                </div>
              </Link>
            </li>
            <li className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <Link
                href="/outils/calculateur-fiscalite"
                className="block hover:text-cyan-300"
              >
                <div className="flex items-start gap-3">
                  <FileText className="mt-1 h-4 w-4 shrink-0 text-cyan-400" />
                  <div>
                    <strong className="text-white">
                      /outils/calculateur-fiscalite
                    </strong>
                    <p className="mt-1 text-sm text-slate-300">
                      Simulateur de l’imposition PFU 31,4 % vs barème
                      progressif. Calcule le gain fiscal de chaque option en
                      fonction de votre TMI.
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          </ul>
        </section>

        {/* 9. FAQ */}
        <section id="faq" className="mt-12">
          <h2>9. FAQ</h2>
          <div className="my-6 not-prose space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 open:border-emerald-500/30"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-4 font-semibold text-white">
                  <span>{item.q}</span>
                  <span className="text-emerald-300 transition group-open:rotate-45 mt-0.5 shrink-0">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* 10. Sources */}
        <section id="sources" className="mt-12">
          <h2>10. Sources & méthodologie</h2>
          <p>
            Toutes les informations présentées sont issues de sources
            officielles ou de la doctrine BOFiP publique. Aucune donnée
            propriétaire ou confidentielle n’est utilisée. Sources principales :
          </p>
          <ul className="not-prose mt-4 space-y-2">
            {SOURCES.map((s) => (
              <li key={s.url} className="flex items-start gap-2 text-sm">
                <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-cyan-300 hover:underline"
                >
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm">
            <strong>Mise à jour</strong> : cette étude est révisée chaque
            trimestre, et systématiquement après publication d’un nouveau
            BOFiP relatif à la fiscalité numérique. Dernière révision indiquée
            en haut de la page.
          </p>
          <p className="mt-4 text-sm">
            <strong>Contact erreurs / corrections</strong> :{" "}
            <a href={`mailto:${BRAND.partnersEmail}`} className="text-cyan-300">
              {BRAND.partnersEmail}
            </a>
            . Délai de correction maximal : 24 heures pour toute erreur
            factuelle documentée.
          </p>
          <p className="mt-4 text-xs text-slate-500 leading-relaxed">
            <strong>Disclaimer.</strong> Cette étude est publiée à titre
            d’information. Cryptoreflex ne fournit pas de conseil fiscal ni
            juridique personnalisé. Les contribuables sont invités à consulter
            un expert-comptable agréé ou un avocat fiscaliste pour leur
            situation particulière, notamment pour les patrimoines complexes
            ou supérieurs à 50 000 €.
          </p>
        </section>
      </article>

      {/* Pack CTA — maillage interne pack 49€ (audit 2026-05-14) */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
          <PackCTABlock fromPage="etude-fiscalite-cerfa" />
        </div>
      </section>

      {/* Newsletter capture */}
      <section className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <NewsletterInline
            source="bottom-article"
            context="fiscalite"
            variant="default"
            title="Rate aucune mise à jour fiscale"
            subtitle="Cette étude est révisée chaque trimestre et après chaque nouvelle publication BOFiP. Reçois la version mise à jour par email. 1 envoi par trimestre, 0 spam."
            ctaLabel="M'abonner à la veille fiscale crypto"
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Continue la lecture
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              href="/outils/cerfa-2086-auto"
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-left hover:border-emerald-500/30 transition"
            >
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-300">
                Outil Cerfa 2086 + 3916-bis auto
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Génère ton PDF en 2 minutes depuis un CSV exchange. Gratuit,
                sans inscription.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-300">
                Lancer l’outil
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
            <Link
              href="/etudes/mica-juillet-2026-etat-des-lieux"
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-left hover:border-amber-500/30 transition"
            >
              <h3 className="text-lg font-bold text-white group-hover:text-amber-300">
                Étude MiCA juillet 2026
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Quelles plateformes vont disparaître ? Comment migrer ?
                Implications fiscales.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-amber-300">
                Lire l’étude
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
