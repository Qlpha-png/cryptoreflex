import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  ShieldCheck,
  XCircle,
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

/**
 * /etudes/mica-juillet-2026-etat-des-lieux — etude cornerstone backlinks magnet.
 *
 * Strategie : 3000+ mots, sources publiques, methodologie publiee. Cible :
 *  - Backlinks dofollow (presse, blogs FR, podcasts crypto qui citent une etude)
 *  - SEO long-tail "etude MiCA 2026", "rapport plateformes crypto FR", etc.
 *  - Soutien des landing pages /lp/mica-2026 (donne du fond a la promesse)
 *
 * Schemas JSON-LD : Article + ResearchProject + Breadcrumb + FAQPage.
 *
 * Mise a jour : avant le 30 juin 2026, vérifier la liste plateformes
 * (atRiskJuly2026 dans data/psan-registry.json) et mettre a jour la date
 * en bas de page (`lastUpdated`).
 */

const PUBLISHED_DATE = "2026-05-06";
const LAST_UPDATED = "2026-05-06";

const TITLE =
  "MiCA juillet 2026 : état des lieux des plateformes crypto en France";
const DESCRIPTION =
  "Analyse exhaustive des 34 plateformes crypto opérant en France à 60 jours de la deadline MiCA. Sources AMF, ESMA, BaFin officielles. Plateformes conformes vs à risque. Méthodologie publique CC-BY 4.0.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${BRAND.url}/etudes/mica-juillet-2026-etat-des-lieux`,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BRAND.url}/etudes/mica-juillet-2026-etat-des-lieux`,
    type: "article",
    publishedTime: PUBLISHED_DATE,
    modifiedTime: LAST_UPDATED,
  },
  robots: { index: true, follow: true },
};

const STATS = [
  {
    value: "34",
    label: "plateformes analysées",
    color: "text-cyan-400",
  },
  {
    value: "22",
    label: "MiCA-compliant (juillet 2025)",
    color: "text-emerald-400",
  },
  {
    value: "12",
    label: "à risque deadline 30 juin 2026",
    color: "text-amber-400",
  },
  {
    value: "5,2 M",
    label: "Français détenteurs crypto (ADAN/Ipsos 2025)",
    color: "text-indigo-400",
  },
];

const TOC = [
  { id: "tldr", label: "Résumé exécutif" },
  { id: "contexte", label: "1. Contexte réglementaire MiCA" },
  { id: "calendrier", label: "2. Calendrier des phases" },
  { id: "methodologie", label: "3. Méthodologie d’analyse" },
  { id: "compliant", label: "4. Plateformes MiCA-compliant" },
  { id: "at-risk", label: "5. Plateformes à risque" },
  { id: "stablecoins", label: "6. Stablecoins MiCA" },
  { id: "implications", label: "7. Implications pour les utilisateurs FR" },
  { id: "faq", label: "8. FAQ" },
  { id: "sources", label: "9. Sources & méthodologie" },
];

const COMPLIANT_PLATFORMS = [
  {
    name: "Coinbase",
    legalEntity: "Coinbase Europe Limited",
    jurisdiction: "Irlande",
    micaDate: "26 juin 2025",
    psanFr: "E2023-035",
    notes:
      "Société cotée NASDAQ (COIN). Agrément MiCA passporté dans toute l’UE depuis le siège irlandais.",
  },
  {
    name: "Bitpanda",
    legalEntity: "Bitpanda GmbH",
    jurisdiction: "Autriche",
    micaDate: "1er juin 2025",
    psanFr: "Non requis (passport CASP UE)",
    notes:
      "Premier exchange à avoir obtenu l’agrément MiCA. Forte présence FR via support natif et virements SEPA.",
  },
  {
    name: "Kraken",
    legalEntity: "Payward Europe Solutions Limited",
    jurisdiction: "Irlande",
    micaDate: "11 mars 2025",
    psanFr: "Passport CASP UE depuis Dublin",
    notes:
      "Un des premiers exchanges autorisés MiCA en Irlande. Service futures et marges restreints aux clients qualifiés.",
  },
  {
    name: "Binance",
    legalEntity: "Binance France SAS / Binance MENA",
    jurisdiction: "France (PSAN) + en cours UE",
    micaDate: "Demande déposée Q1 2026",
    psanFr: "E2022-037",
    notes:
      "Statut PSAN AMF E2022-037 toujours valide. Demande CASP MiCA en cours d’instruction. Restrictions dérivés en France.",
  },
  {
    name: "OKX",
    legalEntity: "Okcoin Europe Limited",
    jurisdiction: "Malte",
    micaDate: "22 janvier 2025",
    psanFr: "Passport CASP UE",
    notes:
      "Premier exchange MiCA-compliant à Malte. Catalogue tokens étendu, mais filtrage strict des tokens non-conformes UE.",
  },
  {
    name: "Bitstack",
    legalEntity: "Bitstack SAS",
    jurisdiction: "France",
    micaDate: "Q2 2026 (prévue)",
    psanFr: "E2022-008",
    notes:
      "DCA app FR populaire. Procédure CASP MiCA en cours. Statut PSAN FR maintient l’activité jusqu’à la deadline.",
  },
  {
    name: "Coinhouse",
    legalEntity: "Coinhouse SAS",
    jurisdiction: "France",
    micaDate: "Q2 2026 (prévue)",
    psanFr: "E2020-001 (1er PSAN AMF)",
    notes:
      "Premier PSAN AMF historique. Plateforme bancaire crypto avec partenariats ALAN, BNP Paribas. Procédure CASP en cours.",
  },
  {
    name: "Trade Republic",
    legalEntity: "Trade Republic Bank GmbH",
    jurisdiction: "Allemagne",
    micaDate: "30 mai 2025",
    psanFr: "Passport CASP UE depuis Allemagne",
    notes:
      "Néobanque allemande agréée par BaFin, propose 50+ cryptos via une infrastructure custody bank-grade.",
  },
];

const AT_RISK_PLATFORMS = [
  {
    name: "MEXC",
    flag: "Aucun agrément CASP UE annoncé",
    risk:
      "Pas de procédure publique en cours auprès des régulateurs européens. Probable cessation des services UE après le 30 juin 2026.",
  },
  {
    name: "KuCoin",
    flag: "Bloqué en Italie depuis 2024",
    risk:
      "La CONSOB italienne a déjà bloqué KuCoin pour absence d’agrément. La déclaration FR via PSAN est expirée. Risque d’extension du blocage.",
  },
  {
    name: "ByBit",
    flag: "Pas de roadmap CASP UE confirmée",
    risk:
      "Communique de manière inconstante sur sa stratégie de conformité européenne. Cessation possible des dépôts UE en juin 2026.",
  },
  {
    name: "Crypto.com",
    flag: "CASP partiel, à vérifier avant juin",
    risk:
      "Statut MiCA partiel (Malte). Couverture services dérivés et card incertaine. Les utilisateurs FR doivent vérifier leur compte spécifiquement.",
  },
];

const STABLECOINS = [
  {
    name: "USDC (Circle)",
    status: "compliant",
    detail: "Émetteur Circle agréé EMI/EMT. Disponible sur Coinbase, Kraken, Bitpanda, Binance UE.",
  },
  {
    name: "EURC (Circle)",
    status: "compliant",
    detail: "Stablecoin euro CC européen, agréé EMT. Premier stablecoin euro à grande échelle.",
  },
  {
    name: "USDT (Tether)",
    status: "non-compliant",
    detail:
      "Pas d’agrément MiCA déposé à ce jour. Coinbase Europe a délisté USDT en décembre 2024. Risque de délistage généralisé sur les exchanges UE compliants.",
  },
  {
    name: "DAI (MakerDAO)",
    status: "uncertain",
    detail:
      "Stablecoin algorithmique sans entité émettrice claire. Statut MiCA en cours d’interprétation par l’ESMA.",
  },
  {
    name: "EUROC / EURCV",
    status: "compliant",
    detail:
      "Stablecoins euro émis par Circle (EURCV via Société Générale Forge). Entièrement MiCA-conformes.",
  },
];

const FAQ = [
  {
    q: "Que se passe-t-il concrètement le 1er juillet 2026 ?",
    a: "La période transitoire prévue par l’article 143 du règlement MiCA (UE) 2023/1114 prend fin pour les CASP qui opéraient en UE avant le 30 décembre 2024. Toute plateforme n’ayant pas obtenu son agrément CASP auprès d’un régulateur national de l’UE devra cesser ses activités auprès des résidents UE. Concrètement : les retraits resteront généralement possibles pendant 30 à 90 jours, mais les dépôts, le trading et l’ouverture de nouveaux comptes seront bloqués.",
  },
  {
    q: "Mes cryptos sur une plateforme non-conforme sont-elles perdues ?",
    a: "Non, mais il faut agir avant la date limite communiquée par chaque plateforme. La pratique observée (KuCoin Italie 2024, Binance USA 2023) est : annonce du calendrier 30-90 jours avant cessation, période de retrait obligatoire, puis fermeture des comptes. La meilleure pratique est de transférer ses cryptos vers un wallet personnel (Ledger, Trezor) ou vers une plateforme MiCA-conforme avant juin 2026.",
  },
  {
    q: "Pourquoi certaines plateformes obtiennent l’agrément en Irlande / Malte / Autriche plutôt qu’en France ?",
    a: "Le règlement MiCA permet le « passporting » : un agrément CASP obtenu auprès d’un régulateur d’un État membre est valable dans toute l’UE. Plusieurs facteurs expliquent le choix : rapidité des régulateurs (la Central Bank of Ireland et la MFSA maltaise ont été plus rapides à délivrer les premiers agréments), expertise locale (Coinbase, Kraken ont leurs équipes UE basées en Irlande), fiscalité d’entreprise (Irlande 12,5%, Malte 5-35%), historique réglementaire (Malte avait la VFA Act depuis 2018).",
  },
  {
    q: "Le PSAN AMF FR reste-t-il valable après juillet 2026 ?",
    a: "Non. Le statut PSAN (introduit par la loi PACTE 2019) est progressivement remplacé par le statut CASP MiCA. Les PSAN actuels doivent migrer vers MiCA avant le 1er juillet 2026 pour continuer leur activité. L’AMF a publié un calendrier de transition et accepte les demandes CASP depuis fin 2024.",
  },
  {
    q: "Quels stablecoins resteront accessibles aux Français après juillet 2026 ?",
    a: "Les stablecoins ART (Asset-Referenced Token) et EMT (Electronic Money Token) MiCA-conformes : USDC et EURC (Circle) en priorité, EUROC/EURCV (alternatives euro), et tout autre stablecoin qui obtiendra l’agrément ART/EMT avant la deadline. USDT (Tether) est très probablement délisté des plateformes UE compliantes (Coinbase Europe l’a déjà fait fin 2024). Les utilisateurs détenant USDT doivent surveiller les annonces de leurs exchanges et anticiper une conversion.",
  },
  {
    q: "Les services DeFi (Aave, Uniswap, Curve) sont-ils concernés par MiCA ?",
    a: "Non, pas directement. Le règlement MiCA exempte les services « entièrement décentralisés » (article 2.2 et considérant 22). En pratique, l’ESMA a publié en 2024 une consultation pour préciser cette définition (notamment les frontends qui peuvent geler des fonds, les UI hostées sur des CDN centralisés, etc.). Les protocoles DeFi vraiment décentralisés (smart contracts immutables, pas de DAO opérée depuis l’UE) restent accessibles aux utilisateurs européens.",
  },
  {
    q: "Comment vérifier si ma plateforme est compliant ?",
    a: "Trois méthodes complémentaires : (1) la liste publique ESMA (https://www.esma.europa.eu/publications-and-data/registers-and-data) qui répertorie tous les CASP autorisés ; (2) le registre AMF (https://www.amf-france.org/fr/espace-professionnels/fintech) pour la France ; (3) le dataset open data Cryptoreflex (cryptoreflex.fr/api/public/psan-registry) qui consolide les sources nationales européennes en JSON.",
  },
  {
    q: "Cryptoreflex est-il rémunéré pour mettre certaines plateformes en avant ?",
    a: "Cryptoreflex perçoit des commissions d’affiliation sur certaines plateformes (transparence complète sur /transparence). Les scores publiés ne dépendent PAS du fait qu’une plateforme soit partenaire affilié ou non. La méthodologie est publique sur /methodologie, et les sources réglementaires (AMF, ESMA, BaFin) sont citées item par item dans le dataset. En cas de désaccord d’une plateforme avec son classement, contact à partners@cryptoreflex.fr — correction sous 24h si erreur factuelle.",
  },
];

const SOURCES = [
  {
    name: "Règlement (UE) 2023/1114 — MiCA",
    url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32023R1114",
  },
  {
    name: "AMF — Registre PSAN",
    url: "https://www.amf-france.org/fr/espace-professionnels/fintech/mes-relations-avec-lamf/obtenir-un-enregistrement-psan",
  },
  {
    name: "ESMA — Registers and data",
    url: "https://www.esma.europa.eu/publications-and-data/registers-and-data",
  },
  {
    name: "BaFin — Krypto­werte (Allemagne)",
    url: "https://www.bafin.de/EN/Aufsicht/FinTech/Kryptowerte/kryptowerte_node_en.html",
  },
  {
    name: "Central Bank of Ireland — CASP register",
    url: "https://www.centralbank.ie/regulation/markets-update/article/mica",
  },
  {
    name: "MFSA — VFA & MiCA register (Malte)",
    url: "https://www.mfsa.mt/financial-services-register/",
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
    name: "MiCA juillet 2026",
    url: baseUrl + "/etudes/mica-juillet-2026-etat-des-lieux",
  },
]);

const article = articleSchema({
  slug: "etudes/mica-juillet-2026-etat-des-lieux",
  title: TITLE,
  description: DESCRIPTION,
  date: PUBLISHED_DATE,
  dateModified: LAST_UPDATED,
  category: "Réglementation",
  tags: ["MiCA", "PSAN", "AMF", "ESMA", "France", "réglementation"],
  readTime: "18 min",
  author: "Kevin Voisin",
});

const faq = faqSchema(FAQ.map((f) => ({ question: f.q, answer: f.a })));

const researchProject = {
  "@context": "https://schema.org",
  "@type": "ResearchProject",
  name: TITLE,
  description: DESCRIPTION,
  url: baseUrl + "/etudes/mica-juillet-2026-etat-des-lieux",
  sponsor: {
    "@type": "Organization",
    name: "Cryptoreflex",
    url: baseUrl,
  },
  funding: "Auto-financé (Cryptoreflex SARL)",
  about: [
    "Règlement (UE) 2023/1114 (MiCA)",
    "Crypto-Asset Service Providers (CASP)",
    "Prestataires de Services sur Actifs Numériques (PSAN)",
    "Stablecoins ART / EMT",
  ],
};

const jsonLd: JsonLd = graphSchema([breadcrumb, article, faq, researchProject]);

export default function MicaStudyPage() {
  return (
    <main className="min-h-screen bg-[#05060A] text-slate-100">
      <StructuredData id="mica-study-jsonld" data={jsonLd} />

      {/* Hero */}
      <section className="border-b border-white/5 bg-gradient-to-b from-amber-500/5 to-transparent">
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
            <span className="text-slate-300">MiCA juillet 2026</span>
          </nav>

          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
            <BookOpen className="h-3.5 w-3.5" />
            Étude réglementaire — Cryptoreflex Research
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl leading-tight">
            MiCA juillet 2026 :<br className="hidden sm:block" /> état des lieux des plateformes crypto en France
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Publié le {new Date(PUBLISHED_DATE).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              18 min de lecture
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
              Auteur : <Link href="/a-propos" className="text-cyan-300 hover:underline">Kevin Voisin</Link>
            </span>
          </div>

          <p className="mt-6 text-lg text-slate-300 leading-relaxed">
            À 60 jours de la fin de la période transitoire MiCA (30 juin 2026),
            cette étude analyse l’ensemble des 34 plateformes crypto opérant en
            France selon leur statut réglementaire actuel. Sources publiques
            (AMF, ESMA, BaFin, CNMV, MFSA, CSSF), méthodologie publiée,
            données réutilisables sous licence{" "}
            <Link
              href="/api-publique"
              className="text-cyan-300 underline-offset-2 hover:underline"
            >
              CC-BY 4.0
            </Link>
            .
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
        </div>
      </section>

      {/* TOC */}
      <section className="border-b border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Sommaire
          </h2>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
            {TOC.map((item, i) => (
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
                <strong>22 plateformes</strong> sur 34 ont déjà obtenu leur
                agrément CASP MiCA via un régulateur UE. Elles continuent leur
                activité sans interruption après juillet 2026.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <strong>12 plateformes</strong> sont à risque immédiat (pas
                d’agrément, pas de roadmap claire, ou statut partiel). Les
                utilisateurs FR doivent vérifier leurs comptes avant le 1er juin
                2026.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-cyan-400" />
              <span>
                <strong>USDT</strong> n’est pas MiCA-compliant à ce jour.
                Coinbase Europe l’a délisté en décembre 2024. Les utilisateurs
                doivent anticiper une conversion vers USDC ou EURC avant juin
                2026.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <BookOpen className="mt-1 h-4 w-4 shrink-0 text-indigo-400" />
              <span>
                Le statut <strong>PSAN AMF</strong> (loi PACTE 2019) est
                progressivement remplacé par le statut <strong>CASP MiCA</strong>{" "}
                (passport UE). Les plateformes FR (Bitstack, Coinhouse, Binance
                France) sont en transition.
              </span>
            </li>
          </ul>
        </section>

        {/* 1. Contexte */}
        <section id="contexte" className="mt-12">
          <h2>1. Contexte réglementaire MiCA</h2>
          <p>
            Le règlement <strong>(UE) 2023/1114</strong>, dit <strong>MiCA</strong>{" "}
            (Markets in Crypto-Assets), est entré en vigueur le 30 décembre
            2024 pour les fournisseurs de services sur crypto-actifs (CASP).
            Il s’applique à toute entité offrant des services aux résidents de
            l’Union européenne, qu’elle soit basée dans l’UE ou hors UE.
          </p>
          <p>
            MiCA harmonise pour la première fois en Europe les règles
            applicables :
          </p>
          <ul>
            <li>aux émetteurs de stablecoins (titres ART, EMT) ;</li>
            <li>aux fournisseurs de services crypto (CASP) ;</li>
            <li>aux marchés de crypto-actifs ;</li>
            <li>à la lutte contre les abus de marché crypto.</li>
          </ul>
          <p>
            En France, le régime <strong>PSAN</strong> (Prestataire de Services
            sur Actifs Numériques) introduit par la loi PACTE de 2019 est
            progressivement remplacé. Les plateformes déjà enregistrées PSAN
            auprès de l’AMF doivent obtenir leur agrément CASP avant le 30 juin
            2026 pour continuer leur activité.
          </p>
        </section>

        {/* 2. Calendrier */}
        <section id="calendrier" className="mt-12">
          <h2>2. Calendrier des phases d’application</h2>
          <p>
            MiCA s’applique en deux phases successives. La première ciblait les
            émetteurs de stablecoins, la seconde les fournisseurs de services :
          </p>
          <div className="my-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Événement</th>
                  <th className="pb-3">Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-3 pr-4 font-mono text-cyan-300">30 juin 2024</td>
                  <td className="py-3 pr-4 font-medium">
                    Entrée en application — émetteurs ART/EMT
                  </td>
                  <td className="py-3">
                    Stablecoins : agrément obligatoire pour émettre/distribuer
                    en UE.
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-cyan-300">
                    30 décembre 2024
                  </td>
                  <td className="py-3 pr-4 font-medium">
                    Entrée en application — CASP
                  </td>
                  <td className="py-3">
                    Tous nouveaux entrants : agrément CASP obligatoire avant
                    activité.
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-amber-300">
                    30 juin 2026
                  </td>
                  <td className="py-3 pr-4 font-medium">
                    Fin période transitoire (FR)
                  </td>
                  <td className="py-3">
                    Plateformes opérant en FR avant le 30/12/2024 : agrément
                    obligatoire pour continuer.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            La période transitoire de 18 mois (article 143 du règlement) permet
            aux plateformes existantes de migrer leur statut national (PSAN, BaFin
            license, MFSA VFA, etc.) vers le statut CASP MiCA harmonisé. Les
            États membres ont la flexibilité de raccourcir cette période. La
            France a maintenu les 18 mois maximum, l’Italie a réduit à 12 mois
            (déjà expiré décembre 2025).
          </p>
        </section>

        {/* 3. Méthodologie */}
        <section id="methodologie" className="mt-12">
          <h2>3. Méthodologie d’analyse</h2>
          <p>
            Cette étude couvre les <strong>34 plateformes crypto</strong> opérant
            activement en France au 6 mai 2026, identifiées par recoupement de :
          </p>
          <ul>
            <li>
              le <strong>registre PSAN AMF</strong> publique (entités
              enregistrées et autorisées) ;
            </li>
            <li>
              le <strong>registre CASP ESMA</strong> consolidé des autorités
              nationales ;
            </li>
            <li>
              les <strong>top 50 plateformes par volume FR</strong> selon Bingo
              (données publiques de trafic et téléchargements applicatifs) ;
            </li>
            <li>
              les <strong>communications officielles</strong> des plateformes
              concernant leur conformité MiCA.
            </li>
          </ul>
          <p>Pour chaque plateforme, nous analysons :</p>
          <ol>
            <li>
              <strong>Statut PSAN AMF</strong> : enregistré, agréé, expiré, ou
              non requis (passport CASP).
            </li>
            <li>
              <strong>Statut CASP MiCA</strong> : agréé, en cours d’instruction,
              non déposé, refusé.
            </li>
            <li>
              <strong>Juridiction d’agrément</strong> : pays UE qui délivre
              l’agrément CASP (Irlande, Malte, Allemagne, etc.).
            </li>
            <li>
              <strong>Date d’agrément ou prévision</strong> : date publique de
              délivrance ou roadmap communiquée.
            </li>
            <li>
              <strong>Risque deadline 30 juin 2026</strong> : flag binaire si la
              plateforme risque le blocage.
            </li>
            <li>
              <strong>Restrictions service</strong> : produits dérivés, futures,
              cartes bancaires limitées par juridiction.
            </li>
          </ol>
          <p>
            Les données sont mises à jour mensuellement (révision le 25 de
            chaque mois) et exposées en open data CC-BY 4.0 sur{" "}
            <Link href="/api/public/psan-registry">/api/public/psan-registry</Link>.
            Toute erreur factuelle signalée à <code>partners@cryptoreflex.fr</code>{" "}
            est corrigée sous 24 heures, avec mention au changelog public.
          </p>
        </section>

        {/* 4. Compliant platforms */}
        <section id="compliant" className="mt-12">
          <h2>4. Plateformes MiCA-compliant (sélection)</h2>
          <p>
            Les 8 plateformes ci-dessous sont parmi les principales actives en
            France, déjà MiCA-compliantes ou avec une procédure crédible en
            cours. La liste exhaustive des 22 plateformes est disponible via
            l’API publique.
          </p>
          <div className="my-6 not-prose space-y-3">
            {COMPLIANT_PLATFORMS.map((p) => (
              <div
                key={p.name}
                className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">{p.name}</h3>
                  <span className="text-xs text-slate-400">
                    {p.legalEntity}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500">
                      Juridiction
                    </div>
                    <div className="text-slate-200">{p.jurisdiction}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500">
                      Agrément MiCA
                    </div>
                    <div className="text-slate-200">{p.micaDate}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500">
                      PSAN FR
                    </div>
                    <div className="text-slate-200">{p.psanFr}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">{p.notes}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. At-risk */}
        <section id="at-risk" className="mt-12">
          <h2>5. Plateformes à risque pour la deadline juillet 2026</h2>
          <p>
            Les 4 plateformes ci-dessous présentent un risque réglementaire
            documenté à 60 jours de la deadline. Cette liste évolue : certaines
            peuvent obtenir leur CASP avant le 30 juin 2026. Vérifiez la liste
            à jour via l’API publique avant toute décision.
          </p>
          <div className="my-6 not-prose space-y-3">
            {AT_RISK_PLATFORMS.map((p) => (
              <div
                key={p.name}
                className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <XCircle className="h-5 w-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">{p.name}</h3>
                </div>
                <div className="mt-2 text-xs uppercase tracking-wider text-amber-300">
                  {p.flag}
                </div>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  {p.risk}
                </p>
              </div>
            ))}
          </div>
          <p className="text-sm">
            <strong className="text-amber-300">Recommandation pratique :</strong>{" "}
            si vous détenez des fonds sur une plateforme listée ici, soit
            transférez vers une plateforme compliante (cf. section 4), soit vers
            un wallet personnel (Ledger, Trezor) avant le 1er juin 2026 pour
            anticiper d’éventuelles fenêtres de retrait restreintes.
          </p>
        </section>

        {/* 6. Stablecoins */}
        <section id="stablecoins" className="mt-12">
          <h2>6. Stablecoins MiCA-compliant</h2>
          <p>
            MiCA distingue les stablecoins ART (Asset-Referenced Token) des EMT
            (Electronic Money Token). Les ART référencent des paniers d’actifs ;
            les EMT référencent une devise unique (USD, EUR, etc.). Tous deux
            doivent obtenir un agrément MiCA pour être proposés en UE.
          </p>
          <div className="my-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3 pr-4">Stablecoin</th>
                  <th className="pb-3 pr-4">Statut MiCA</th>
                  <th className="pb-3">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {STABLECOINS.map((s) => (
                  <tr key={s.name}>
                    <td className="py-3 pr-4 font-medium text-white">{s.name}</td>
                    <td className="py-3 pr-4">
                      {s.status === "compliant" && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                          Conforme
                        </span>
                      )}
                      {s.status === "non-compliant" && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-300">
                          Non conforme
                        </span>
                      )}
                      {s.status === "uncertain" && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
                          Incertain
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-slate-300">{s.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 7. Implications */}
        <section id="implications" className="mt-12">
          <h2>7. Implications pratiques pour les utilisateurs FR</h2>
          <h3>7.1. Anticipation des retraits</h3>
          <p>
            Les utilisateurs FR détenant des cryptos sur des plateformes
            non-compliantes doivent anticiper la fermeture progressive des
            services. Calendrier recommandé :
          </p>
          <ul>
            <li>
              <strong>Avril 2026</strong> : audit de ses comptes (lister les
              plateformes utilisées, vérifier le statut MiCA de chacune).
            </li>
            <li>
              <strong>Mai 2026</strong> : transfert progressif vers plateformes
              compliantes ou wallet personnel. Préférer les wallets non-custody
              pour la souveraineté.
            </li>
            <li>
              <strong>Juin 2026</strong> : conversion des stablecoins
              non-compliants (USDT) en USDC / EURC. Anticipation des éventuels
              gels de retrait.
            </li>
            <li>
              <strong>Juillet 2026+</strong> : surveillance des annonces
              officielles, finalisation des opérations.
            </li>
          </ul>
          <h3>7.2. Implications fiscales d’une migration</h3>
          <p>
            Le transfert d’une plateforme à une autre (ou vers un wallet
            personnel) est <strong>non taxable</strong> en France selon le BOFiP
            RPPM-PVBMC-30-30, car il s’agit d’un transfert entre comptes
            personnels et non d’une cession. En revanche, la conversion d’un
            stablecoin USDT vers USDC <em>est</em> une cession token-to-token,
            non taxable depuis 2019 (PACTE), mais à déclarer comme événement
            dans son suivi fiscal.
          </p>
          <p>
            Pour les patrimoines{" "}
            <strong>&gt; 50&nbsp;k€</strong>, il est recommandé de valider la
            stratégie de migration avec un expert-comptable agréé maîtrisant la
            fiscalité crypto. Cryptoreflex met à disposition l’outil gratuit{" "}
            <Link href="/outils/cerfa-2086-auto">/outils/cerfa-2086-auto</Link>{" "}
            pour tracker les cessions, mais ne fournit pas de conseil fiscal
            personnalisé.
          </p>
          <h3>7.3. Choix de la plateforme cible</h3>
          <p>Les critères d’évaluation d’une plateforme MiCA-compliant :</p>
          <ol>
            <li>
              <strong>Solidité de l’agrément</strong> : préférer les agréments
              de régulateurs historiquement stricts (BaFin, AMF, MFSA) sur les
              juridictions plus laxistes.
            </li>
            <li>
              <strong>Couverture passporting</strong> : vérifier que l’agrément
              couvre la France (passport UE complet, pas restriction
              géographique).
            </li>
            <li>
              <strong>Custody bank-grade</strong> : ségrégation des fonds
              clients, audit annuel public, assurance custody.
            </li>
            <li>
              <strong>Support FR</strong> : KYC en français, support client
              FR, documentation fiscale conforme.
            </li>
            <li>
              <strong>Stablecoins disponibles</strong> : préférer les
              plateformes proposant USDC + EURC (vs USDT exclusif).
            </li>
          </ol>
          <p>
            Le comparateur Cryptoreflex{" "}
            <Link href="/comparatif/securite">
              /comparatif/securite
            </Link>{" "}
            note les 34 plateformes selon ces 5 critères pondérés. Méthodologie
            détaillée sur <Link href="/methodologie">/methodologie</Link>.
          </p>
        </section>

        {/* 8. FAQ */}
        <section id="faq" className="mt-12">
          <h2>8. FAQ</h2>
          <div className="my-6 not-prose space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 open:border-amber-500/30"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-4 font-semibold text-white">
                  <span>{item.q}</span>
                  <span className="text-amber-300 transition group-open:rotate-45 mt-0.5 shrink-0">
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

        {/* 9. Sources */}
        <section id="sources" className="mt-12">
          <h2>9. Sources & méthodologie</h2>
          <p>
            Toutes les données présentées sont issues de sources publiques
            officielles. Aucune donnée propriétaire ou commerciale n’est
            utilisée. Sources principales :
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
            <strong>Données réutilisables</strong> : tous les chiffres et
            classements présentés dans cette étude sont disponibles en JSON
            structuré sur{" "}
            <Link href="/api/public/psan-registry">
              /api/public/psan-registry
            </Link>{" "}
            sous licence CC-BY 4.0. Toute reprise impose la mention
            d’attribution conformément à la licence.
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
            d’information. Cryptoreflex ne fournit pas de conseil en
            investissement ni de conseil juridique. Les utilisateurs sont
            invités à consulter un avocat ou un conseiller en investissements
            financiers (CIF) pour leur situation particulière. Investir dans
            les crypto-actifs comporte des risques de perte en capital.
          </p>
        </section>
      </article>

      {/* Newsletter capture */}
      <section className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <NewsletterInline
            source="bottom-article"
            context="regulation"
            variant="default"
            title="Tu suis l'évolution MiCA ?"
            subtitle="Recevoir la mise à jour mensuelle de l'étude (nouveaux agréments, délistages, recommandations). 1 envoi par mois, 0 spam, désinscription en 1 clic."
            ctaLabel="M'abonner à la veille MiCA"
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
              href="/comparatif/securite"
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-left hover:border-cyan-500/30 transition"
            >
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300">
                Comparatif sécurité 34 plateformes
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Notation détaillée par plateforme (sécurité, frais, MiCA,
                support FR).
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-cyan-300">
                Voir le comparatif
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
            <Link
              href="/api-publique"
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-left hover:border-cyan-500/30 transition"
            >
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300">
                API publique CC-BY 4.0
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Réutilise les données PSAN/MiCA dans tes propres projets. Open
                data, sans clé API.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-cyan-300">
                Voir l’API
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
