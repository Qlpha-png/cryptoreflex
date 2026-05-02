import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  GraduationCap,
  Cpu,
  Users,
  Coins,
  Clock,
  Bell,
} from "lucide-react";

import {
  getCryptoBySlug,
  getCryptoSlugs,
  getRelatedCryptos,
  type AnyCrypto,
  type HiddenGem,
  type TopCrypto,
} from "@/lib/cryptos";
import { fetchCoinDetail } from "@/lib/coingecko";
import { BRAND } from "@/lib/brand";
import {
  articleSchema,
  breadcrumbSchema,
  cryptoFinancialProductSchema,
  faqSchema,
  graphSchema,
} from "@/lib/schema";

import StructuredData from "@/components/StructuredData";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import CryptoHero from "@/components/crypto-detail/CryptoHero";
import CryptoStats from "@/components/crypto-detail/CryptoStats";
import AddToCompareButton from "@/components/crypto-detail/AddToCompareButton";
import dynamic from "next/dynamic";
import { SkeletonChart } from "@/components/ui/Skeleton";

// Lazy-load PriceChart : Client Component lourd (chart + fetch /api/historical
// au mount), positionné below-the-fold sous Hero+Stats. Audit Perf 26-04 :
// gain JS eval -50ms + TTI -100ms par chart différée.
const PriceChart = dynamic(
  () => import("@/components/crypto-detail/PriceChart"),
  {
    loading: () => (
      <SkeletonChart height={384} label="Chargement du graphique de prix" />
    ),
    ssr: false,
  },
);

// Polish UX 01/05/2026 : composants Client purement décoratifs lazy-loadés
// pour 0 coût SSR. Aucun n'est critique au LCP.
const ReadingProgressBar = dynamic(
  () => import("@/components/crypto-detail/ReadingProgressBar"),
  { ssr: false },
);
const StickyBreadcrumb = dynamic(
  () => import("@/components/crypto-detail/StickyBreadcrumb"),
  { ssr: false },
);
const FloatingShareButton = dynamic(
  () => import("@/components/crypto-detail/FloatingShareButton"),
  { ssr: false },
);

// Lazy-load OnChainMetricsLive : Client Component qui fetch /api/onchain au
// mount. SSR désactivé pour 0 coût TTFB et pour ne pas bloquer le ISR de la page.
// Si la donnée n'est pas dispo, le composant rend null → aucun bloc fantôme.
const OnChainMetricsLive = dynamic(
  () => import("@/components/crypto-detail/OnChainMetricsLive"),
  { ssr: false },
);

// Lazy-load ROISimulator : Client Component interactif (sliders + fetch
// /api/historical) positionné après le verdict pour engager le visiteur
// avant la roadmap. ssr:false : aucun intérêt à SSR une UI qui dépend
// d'un fetch client + Date.now().
const ROISimulator = dynamic(
  () => import("@/components/crypto-detail/ROISimulator"),
  {
    loading: () => (
      <div
        className="h-[420px] animate-pulse rounded-2xl bg-elevated/40"
        aria-label="Chargement du simulateur ROI"
      />
    ),
    ssr: false,
  },
);

// Audit user 2026-05-02 : barre de recherche compacte pour switcher entre
// fiches cryptos sans repasser par /cryptos. ssr:false car purement
// client-side (state, keyboard nav). Lazy = 0 coût SSR/TTFB sur le hero.
const CryptoQuickSwitcher = dynamic(
  () => import("@/components/crypto-detail/CryptoQuickSwitcher"),
  { ssr: false },
);
import WhereToBuy from "@/components/crypto-detail/WhereToBuy";
import QuickBuyBox from "@/components/crypto-detail/QuickBuyBox";
import RiskBadge from "@/components/crypto-detail/RiskBadge";
// Lazy-load TradingView : iframe externe qui charge ~200KB de JS quand
// dépliée. Skeleton chart court (replié par défaut, on évite un trou visuel).
const TradingViewWidget = dynamic(
  () => import("@/components/crypto-detail/TradingViewWidget"),
  {
    loading: () => (
      <SkeletonChart height={120} label="Chargement du graphique avancé TradingView" />
    ),
    ssr: false,
  },
);
import RecommendedWallets from "@/components/crypto-detail/RecommendedWallets";
import CryptoRoadmap from "@/components/crypto-detail/CryptoRoadmap";
import CryptoEventCalendar from "@/components/crypto-detail/CryptoEventCalendar";
import WhitepaperTldr from "@/components/crypto-detail/WhitepaperTldr";
import DecentralizationScore from "@/components/crypto-detail/DecentralizationScore";
// Lazy-load CryptoNewsAggregator (Client + fetch /api/news au mount).
const CryptoNewsAggregator = dynamic(
  () => import("@/components/crypto-detail/CryptoNewsAggregator"),
  { ssr: false },
);
// Lazy-load WhaleWatcher (Client + fetch /api/whales, top cryptos seulement).
const WhaleWatcher = dynamic(
  () => import("@/components/crypto-detail/WhaleWatcher"),
  { ssr: false },
);
// Lazy-load CryptoQuiz (Client component avec state).
const CryptoQuiz = dynamic(
  () => import("@/components/crypto-detail/CryptoQuiz"),
  { ssr: false },
);
// Lazy-load AskAI : Client Component qui fetch /api/me + /api/ask. Pro-only.
// ssr:false : aucun intérêt à SSR (état dépend du plan user via fetch).
const AskAI = dynamic(() => import("@/components/crypto-detail/AskAI"), {
  ssr: false,
  loading: () => (
    <div
      className="h-64 animate-pulse rounded-3xl bg-elevated/40"
      aria-label="Chargement de l'assistant IA"
    />
  ),
});
import MobileStickyCTA from "@/components/MobileStickyCTA";
import { getAllPlatforms } from "@/lib/platforms";
import RelatedPagesNav from "@/components/RelatedPagesNav";
// FIX UX FLOW 2026-05-02 #7 — NextStepsGuide en fin de fiche crypto pour
// éviter le cul-de-sac après 25 sections (audit UX expert).
import NextStepsGuide from "@/components/NextStepsGuide";
import { getWalletsForCrypto } from "@/lib/crypto-wallets";
import { getRoadmapFor } from "@/lib/crypto-roadmaps";
// Programmatic SEO #8 (ETUDE-2026-05-02) : maillage interne vers les pages
// /comparer/[a]/[b] (435 paires) et /acheter/[crypto]/[pays] (600 guides).
import {
  COUNTRIES,
  COUNTRY_CODES,
  buildComparerPairUrl,
  getSimilarCryptosForCompare,
} from "@/lib/programmatic-pages";

/* -------------------------------------------------------------------------- */
/*  Static generation                                                         */
/* -------------------------------------------------------------------------- */

export const revalidate = 3600; // 1h — la donnée éditoriale bouge peu, le prix vient de fetchCoinDetail
// On ne sert QUE les 100 fiches éditoriales (top10 + 90 hidden gems).
// Tout autre slug → 404, même si listé dans `lib/programmatic.ts`.
export const dynamicParams = false;

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return getCryptoSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const c = getCryptoBySlug(params.slug);
  if (!c) return {};
  const isGem = c.kind === "hidden-gem";
  const title = isGem
    ? `${c.name} (${c.symbol}) — Hidden Gem 2026 : prix, fiabilité, où acheter`
    : `${c.name} (${c.symbol}) — Prix, explication & où acheter en France 2026`;
  const description = isGem
    ? `Tout savoir sur ${c.name} (${c.symbol}) : prix temps réel, score de fiabilité, risques, plateformes régulées MiCA pour acheter en France. Analyse Cryptoreflex.`
    : `Tout savoir sur ${c.name} (${c.symbol}) : prix temps réel, ce que c'est, à quoi ça sert, forces/faiblesses et où acheter en France sur des plateformes régulées MiCA.`;
  return {
    title,
    description,
    alternates: { canonical: `${BRAND.url}/cryptos/${c.id}` },
    openGraph: {
      title,
      description,
      url: `${BRAND.url}/cryptos/${c.id}`,
      type: "article",
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Verdict & FAQ — générés contextuellement (rédactionnel unique par crypto) */
/* -------------------------------------------------------------------------- */

function buildVerdict(c: AnyCrypto): string {
  if (c.kind === "hidden-gem") {
    const r = c.reliability;
    const score = r.score;
    const auditList = r.auditedBy.length ? r.auditedBy.slice(0, 2).join(" et ") : "auditeurs reconnus";
    if (score >= 8.5) {
      return `${c.name} coche la quasi-totalité des cases qu'on attend d'un projet crypto sérieux à ce stade : équipe identifiée, code open-source, ${r.yearsActive} années d'activité sans incident majeur, et au moins deux audits indépendants signés par ${auditList}. Notre score de fiabilité de ${score.toFixed(1)}/10 reflète cette robustesse opérationnelle. Cela ne dit rien de la performance future du token : la thèse "${c.tagline.toLowerCase()}" peut très bien échouer commercialement même si le code est béton. Mais sur le plan du "downside binaire" — rug pull, abandon, hack catastrophique — ${c.name} est probablement dans le quintile supérieur de l'univers altcoin.`;
    }
    if (score >= 7) {
      return `${c.name} est un projet sérieux mais avec quelques zones d'ombre qu'il faut accepter. Score de fiabilité ${score.toFixed(1)}/10 : équipe identifiée et audits récents, mais ${r.majorIncidents.startsWith("Aucun") ? "concentration des holders ou validateurs à surveiller" : r.majorIncidents.toLowerCase()}. C'est typiquement le profil d'une crypto où la thèse fondamentale est solide, mais où il faut sizer raisonnablement (pas plus de 1-3 % du portefeuille crypto) et accepter une volatilité supérieure à celle des Top 10.`;
    }
    return `${c.name} est intéressant sur le papier mais notre score de fiabilité de ${score.toFixed(1)}/10 reflète des risques structurels non négligeables : ${c.risks[0]?.toLowerCase() ?? "concentration ou liquidité limitée"}. Le projet n'est pas un scam — équipe identifiée, code ouvert, audits faits — mais il appartient à la catégorie "haute conviction / petite position" où le ratio risque/rendement n'est pas symétrique pour la plupart des investisseurs.`;
  }

  // Top10
  const t = c as TopCrypto;
  if (t.beginnerFriendly >= 5) {
    return `${t.name} est un excellent point d'entrée pour quelqu'un qui n'a jamais touché aux cryptos : disponible sur toutes les plateformes régulées en France, niveau de risque "${t.riskLevel.toLowerCase()}" relatif au reste du marché, et un cas d'usage suffisamment intuitif pour ne pas avoir à comprendre la blockchain pour s'en servir. Notre score "beginner-friendly" de ${t.beginnerFriendly}/5 confirme cette accessibilité. Comme pour toute crypto, la règle reste la même : ne mets que ce que tu es prêt à voir baisser de 50 % sans paniquer.`;
  }
  if (t.beginnerFriendly >= 4) {
    return `${t.name} fait partie des cryptos majeures et reste accessible pour un débutant — ${t.beginnerFriendly}/5 sur notre score "beginner-friendly". Le risque est ${t.riskLevel.toLowerCase()} relativement aux altcoins, mais largement supérieur à celui d'actions cotées. Stratégie raisonnable : un Dollar Cost Averaging (DCA) mensuel, sur une plateforme régulée MiCA, avec une exposition qui reste sous 5 % de ton patrimoine financier total tant que tu n'es pas à l'aise avec la volatilité.`;
  }
  return `${t.name} reste accessible pour un débutant éduqué, mais nécessite de comprendre son cas d'usage spécifique (${t.category.toLowerCase()}) avant d'investir. Score "beginner-friendly" ${t.beginnerFriendly}/5 : ce n'est pas un Bitcoin ou un Ethereum qu'on peut acheter "parce que tout le monde en parle". Lis la section "À quoi ça sert" et "Forces/Faiblesses" ci-dessus avant de prendre position. Si l'usage ne te parle pas, mieux vaut rester sur les majors.`;
}

function buildFaq(c: AnyCrypto): { q: string; a: string }[] {
  const faq: { q: string; a: string }[] = [];

  faq.push({
    q: `Qu'est-ce que ${c.name} (${c.symbol}) ?`,
    a: c.what,
  });

  faq.push({
    q: `Comment acheter ${c.name} en France en 2026 ?`,
    a: `Tu peux acheter ${c.name} sur ${c.whereToBuy.slice(0, 3).join(", ")} et d'autres plateformes régulées MiCA. La procédure standard prend 5 à 10 minutes : création du compte, vérification d'identité (KYC), dépôt en euros par virement SEPA ou carte bancaire, puis ordre d'achat sur le marché spot. Voir la section "Où acheter" plus haut pour la liste complète et les liens directs.`,
  });

  if (c.kind === "hidden-gem") {
    const g = c as HiddenGem;
    faq.push({
      q: `${g.name} est-il un projet fiable ?`,
      a: `Notre score de fiabilité Cryptoreflex est de ${g.reliability.score.toFixed(1)}/10. Critères validés : équipe ${g.reliability.teamIdentified ? "identifiée publiquement" : "anonyme"}, code ${g.reliability.openSource ? "open-source" : "non ouvert"}, ${g.reliability.yearsActive} années d'activité, audits par ${g.reliability.auditedBy.join(", ")} (${g.reliability.lastAuditDate}). Incidents : ${g.reliability.majorIncidents}. Levée de fonds : ${g.reliability.fundingRaised}.`,
    });
    faq.push({
      q: `Quels sont les principaux risques de ${g.name} ?`,
      a: `Les trois risques principaux identifiés : (1) ${g.risks[0] ?? "—"} ; (2) ${g.risks[1] ?? "—"} ; (3) ${g.risks[2] ?? "—"}. C'est une crypto à faible/moyenne capitalisation : volatilité élevée et liquidité parfois limitée selon les plateformes.`,
    });
    faq.push({
      q: `Quels indicateurs surveiller pour ${g.name} ?`,
      a: `Pour suivre la santé du projet on-chain : ${g.monitoringSignals.join(" ; ")}. Ces métriques sont accessibles publiquement sur les explorers et dashboards officiels (lien sur le site officiel ${g.officialUrl}).`,
    });
  } else {
    const t = c as TopCrypto;
    faq.push({
      q: `${t.name} est-il un bon investissement pour un débutant ?`,
      a: `Notre score "beginner-friendly" est de ${t.beginnerFriendly}/5 et le niveau de risque ${t.riskLevel.toLowerCase()}. ${t.name} est ${t.beginnerFriendly >= 4 ? "généralement adapté" : "à aborder avec prudence"} pour un débutant, à condition de respecter les bases : passer par une plateforme régulée MiCA, n'investir que de l'épargne dont tu n'as pas besoin à 1-3 ans, et privilégier un DCA (achats étalés) à un achat unique pour lisser la volatilité.`,
    });
    faq.push({
      q: `Quelle est la quantité maximale de ${t.symbol} ?`,
      a: `${t.maxSupply}. Cette donnée est cruciale : une supply limitée (comme Bitcoin avec ses 21 millions) crée une rareté programmée, alors qu'une supply illimitée implique généralement une inflation continue qui peut diluer la valeur de chaque unité.`,
    });
    faq.push({
      q: `Quelle est la différence entre ${t.name} et Bitcoin ?`,
      a: t.id === "bitcoin"
        ? "Bitcoin est la première et la plus connue des cryptomonnaies, conçue principalement comme une réserve de valeur (\"or numérique\")."
        : `Bitcoin est avant tout une réserve de valeur ("or numérique") avec une supply limitée à 21 millions. ${t.name} a un objectif différent : ${t.tagline.toLowerCase()}. Les deux ne se substituent pas, ils répondent à des cas d'usage distincts. Beaucoup de portefeuilles crypto contiennent les deux.`,
    });
  }

  faq.push({
    q: `Quelle fiscalité s'applique aux gains sur ${c.name} en France ?`,
    a: `En 2026, les plus-values crypto pour un particulier sont imposées au PFU (Prélèvement Forfaitaire Unique) de 30 % par défaut (12,8 % d'impôt + 17,2 % de prélèvements sociaux), uniquement lors de la conversion en euros (article 150 VH bis du CGI). Tant que tu restes en crypto-vers-crypto, aucun impôt n'est dû. Voir notre /outils/calculateur-fiscalite-crypto pour simuler ta note fiscale.`,
  });

  return faq;
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function CryptoPage({ params }: Props) {
  const c = getCryptoBySlug(params.slug);
  if (!c) notFound();

  const detail = await fetchCoinDetail(c.coingeckoId);
  const verdict = buildVerdict(c);
  const faq = buildFaq(c);
  const related = getRelatedCryptos(c.id, 4);
  const walletGuide = getWalletsForCrypto(c);
  const roadmapEvents = getRoadmapFor(c.id);

  const isGem = c.kind === "hidden-gem";
  const kindLabel = isGem ? "Hidden Gem" : `Top ${c.rank} mondial`;
  const pageUrl = `${BRAND.url}/cryptos/${c.id}`;

  // Plateforme recommandée pour la sticky CTA mobile : on prend la 1re plateforme
  // listée dans `whereToBuy` qui a une fiche dans `lib/platforms.ts`.
  const knownPlatforms = getAllPlatforms();
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const recommendedPlatform = c.whereToBuy
    .map((name) =>
      knownPlatforms.find(
        (kp) => norm(kp.name) === norm(name) || norm(kp.id) === norm(name)
      )
    )
    .find((p): p is NonNullable<typeof p> => Boolean(p));

  // BLOCK 11 fix (Agent /cryptos audit P0) : ajout cryptoFinancialProductSchema
  // pour signaler à Google que cette page traite d'un cryptoactif structuré
  // (ticker, sameAs CoinGecko, catégorie, année) — boost rich snippets crypto.
  // SEO Schemas — Article + Breadcrumb + FAQPage + FinancialProduct en @graph.
  // Note : `officialUrl` n'existe que sur HiddenGem (pas TopCrypto), on filtre.
  const externalLinks: string[] = [
    `https://www.coingecko.com/en/coins/${c.coingeckoId}`,
    ...(c.kind === "hidden-gem" && c.officialUrl ? [c.officialUrl] : []),
  ];

  const schemas = graphSchema([
    articleSchema({
      slug: `cryptos/${c.id}`,
      title: `${c.name} (${c.symbol}) — fiche complète Cryptoreflex`,
      description: c.what,
      date: "2026-04-25",
      // BLOCK 11 fix (Agent /cryptos audit P2) : dateModified=today sur
      // toutes les fiches = signal de "churning" suspect pour Google. Sans
      // édit éditorial réel, on garde la date de publication. Quand on
      // mettra à jour une fiche, on bumpera le frontmatter.
      dateModified: "2026-04-25",
      category: c.category,
      tags: [c.name, c.symbol, "crypto", c.category],
    }),
    cryptoFinancialProductSchema({
      slug: c.id,
      name: c.name,
      symbol: c.symbol,
      description: c.tagline,
      // Pas d'`image` field sur AnyCrypto — le helper retombe sur l'OG fallback.
      // Si on ajoute un champ `image` plus tard à TopCrypto/HiddenGem, on le passe ici.
      category: c.category,
      yearCreated: c.yearCreated,
      sameAs: externalLinks,
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Cryptos", url: "/cryptos" },
      { name: c.name, url: `/cryptos/${c.id}` },
    ]),
    faqSchema(faq.map((f) => ({ question: f.q, answer: f.a }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData data={schemas} id={`crypto-${c.id}`} />

      {/* Polish UX 01/05/2026 — barre de progression de lecture sticky top */}
      <ReadingProgressBar targetSelector="article" />

      {/* Breadcrumb sticky : devient fixed après 200px de scroll */}
      <StickyBreadcrumb
        cryptoName={c.name}
        cryptoSymbol={c.symbol}
        logoUrl={detail?.image}
        slug={c.id}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* QUICK SWITCHER (audit user 2026-05-02) — barre de recherche
            visible juste sous le breadcrumb, permet de naviguer vers une
            autre fiche crypto sans repasser par /cryptos. Complète la
            command palette ⌘K (cachée) qui restait peu découvrable. */}
        <div className="mt-6">
          <CryptoQuickSwitcher currentSlug={c.id} />
        </div>

        {/* HERO */}
        <div className="mt-6">
          <CryptoHero
            name={c.name}
            symbol={c.symbol}
            category={c.category}
            tagline={c.tagline}
            yearCreated={c.yearCreated}
            detail={detail}
            kindLabel={kindLabel}
            // CoinGecko id = clé canonique de la watchlist (alignée avec MarketCoin.id).
            cryptoId={c.coingeckoId}
          />
        </div>

        {/* ACTION : ajouter au comparateur multi-cryptos. Subtile, sous le
            Hero, au-dessus du QuickBuyBox pour rester accessible sans gêner
            la conversion. Le drawer global remontera ensuite la sélection. */}
        <div className="mt-4">
          <AddToCompareButton slug={c.id} cryptoName={c.name} />
        </div>

        {/* QUICK BUY BOX (FIX #1 audit conversion 2026-04-26) — encart d'achat
            above-the-fold, top 2 plateformes par score. <WhereToBuy /> en bas
            reste la source de vérité détaillée. */}
        <div className="mt-8">
          <QuickBuyBox
            cryptoName={c.name}
            cryptoSymbol={c.symbol}
            platformNames={c.whereToBuy}
          />
        </div>

        {/* QUICK STATS */}
        <div className="mt-10">
          <CryptoStats
            symbol={c.symbol}
            detail={detail}
            fallbackMaxSupply={c.kind === "top10" ? c.maxSupply : c.marketCapRange}
          />
        </div>

        {/* ON-CHAIN METRICS LIVE — TVL DeFiLlama + dominance + FDV + holders.
            Lazy-loaded, fetch côté client, rend null si la donnée est indispo
            pour ne pas dégrader la fiche. */}
        <div className="mt-8">
          <OnChainMetricsLive
            coingeckoId={c.coingeckoId}
            cryptoName={c.name}
          />
        </div>

        {/* WHALE WATCHER — top 8 cryptos seulement, render null sinon */}
        <div className="mt-8">
          <WhaleWatcher
            coingeckoId={c.coingeckoId}
            cryptoName={c.name}
            cryptoSymbol={c.symbol}
          />
        </div>

        {/* MINI-GRAPH 7j / 30j / 1an (P1-2) — Client-fetch /api/historical au mount */}
        <div className="mt-8">
          <PriceChart
            coingeckoId={c.coingeckoId}
            currency="eur"
            cryptoName={c.name}
          />
        </div>

        {/* GRAPHIQUE AVANCÉ TRADINGVIEW — repliable, lazy iframe (Sprint 4 C.14).
            Affichage dépliable pour rester léger sur le 1er affichage et laisser
            le PriceChart natif comme indicateur principal. */}
        <div className="mt-8">
          <TradingViewWidget
            symbol={c.symbol}
            name={c.name}
            interval="D"
            defaultOpen={false}
          />
        </div>

        {/* RISK + BEGINNER / FIABILITÉ */}
        <div className="mt-8">
          <RiskBadge
            riskLevel={c.kind === "top10" ? c.riskLevel : undefined}
            reliabilityScore={c.kind === "hidden-gem" ? c.reliability.score : undefined}
            beginnerFriendly={c.kind === "top10" ? c.beginnerFriendly : undefined}
          />
        </div>

        {/* DECENTRALIZATION SCORE — composite 5 critères, render null si absent */}
        <div className="mt-12">
          <DecentralizationScore cryptoId={c.id} cryptoName={c.name} />
        </div>

        {/* DESCRIPTION */}
        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Qu'est-ce que {c.name} ?
          </h2>
          <p className="mt-4 text-base text-fg/85 leading-relaxed">{c.what}</p>

          {c.kind === "top10" && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Spec icon={Users} label="Créé par" value={c.createdBy} />
              <Spec icon={Cpu} label="Consensus" value={c.consensus} />
              <Spec icon={Activity} label="Block time" value={c.blockTime} />
              <Spec icon={Coins} label="Supply max" value={c.maxSupply} />
            </div>
          )}
        </section>

        {/* WHITEPAPER TLDR — synthèse 5 points pour top 30, render null sinon */}
        <div className="mt-12">
          <WhitepaperTldr cryptoId={c.id} cryptoName={c.name} />
        </div>

        {/* USE CASE */}
        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            À quoi sert {c.name} ?
          </h2>
          <p className="mt-4 text-base text-fg/85 leading-relaxed">{c.useCase}</p>
        </section>

        {/* FORCES / FAIBLESSES (Top10) ou WHY GEM (Gems) */}
        {c.kind === "top10" ? (
          <section className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-accent-green/30 bg-accent-green/5 p-6">
              <h3 className="text-lg font-bold text-accent-green flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> Forces
              </h3>
              <ul className="mt-4 space-y-3">
                {c.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-fg/85">
                    <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-accent-rose/30 bg-accent-rose/5 p-6">
              <h3 className="text-lg font-bold text-accent-rose flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Faiblesses
              </h3>
              <ul className="mt-4 space-y-3">
                {c.weaknesses.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-sm text-fg/85">
                    <XCircle className="h-4 w-4 text-accent-rose shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : (
          <HiddenGemSections gem={c as HiddenGem} />
        )}

        {/* "POUR LES DÉBUTANTS" (Top10 uniquement) */}
        {c.kind === "top10" && (
          <section className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              Pour les débutants
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted">
                  Première étape
                </div>
                <p className="mt-1 text-sm text-fg/85 leading-relaxed">
                  Choisis une plateforme régulée MiCA dans la liste ci-dessous (Coinbase, Bitpanda et Coinhouse sont les plus accessibles en français), crée un compte avec ta vraie identité et dépose 50 à 100 € pour te familiariser.
                </p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted">
                  Stratégie recommandée
                </div>
                <p className="mt-1 text-sm text-fg/85 leading-relaxed">
                  Préfère le DCA (Dollar Cost Averaging) : un petit montant chaque mois automatiquement, plutôt qu'un gros achat unique. Cela lisse la volatilité et évite le stress du timing parfait. Voir notre <Link href="/outils/simulateur-dca" className="underline hover:text-fg">simulateur DCA</Link>.
                </p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted">
                  Bonne hygiène de portefeuille
                </div>
                <p className="mt-1 text-sm text-fg/85 leading-relaxed">
                  Active la 2FA, ne stocke pas ton mot de passe dans un mail, et au-delà de 1 000 € envisage un wallet hardware (Ledger, Trezor) pour sortir tes fonds de la plateforme.
                </p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted">
                  Erreurs à éviter
                </div>
                <p className="mt-1 text-sm text-fg/85 leading-relaxed">
                  Ne jamais investir plus que ce que tu es prêt à perdre. Ignorer les "conseils" de TikTok/YouTube qui promettent du x10. Vérifier toujours le statut MiCA d'une plateforme avant de déposer.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* OÙ ACHETER */}
        <div className="mt-12">
          <WhereToBuy cryptoName={c.name} platformNames={c.whereToBuy} />
        </div>

        {/* WALLETS RECOMMANDÉS — étape post-achat : sécuriser ses fonds */}
        <div className="mt-12">
          <RecommendedWallets
            cryptoName={c.name}
            cryptoSymbol={c.symbol}
            chain={walletGuide.chain}
            recommendations={walletGuide.recommendations}
          />
        </div>

        {/* CTA Alertes prix — léger, contextuel */}
        <section
          aria-label={`Alerte prix ${c.name}`}
          className="mt-8 rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-soft">
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              Alerte prix gratuite
            </div>
            <p className="mt-2 text-base text-fg/90 leading-snug">
              Sois prévenu·e par email quand{" "}
              <strong className="text-fg">{c.name}</strong> franchit ton seuil. Sans
              compte, désinscription en 1 clic.
            </p>
          </div>
          <Link
            href={`/alertes?cryptoId=${c.id}`}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Créer une alerte {c.symbol}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </section>

        {/* VERDICT */}
        <section className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Verdict Cryptoreflex sur {c.name}
          </h2>
          <p className="mt-3 text-base text-fg/85 leading-relaxed">{verdict}</p>
        </section>

        {/* ROI SIMULATOR — composant interactif "Et si tu avais investi…" :
            sliders montant/date/stratégie + chart sparkline. Lazy-load
            ssr:false (cf. import en haut). Engage le visiteur entre verdict
            et roadmap. */}
        <div className="mt-12">
          <ROISimulator
            coingeckoId={c.coingeckoId}
            cryptoName={c.name}
            cryptoSymbol={c.symbol}
          />
        </div>

        {/* ASK AI — Q&A IA contextuelle Pro-only, post-ROISimulator pour
            engager le visiteur déjà conquis par les outils interactifs.
            Free voit un lock + CTA Pro, Pro voit l'input fonctionnel.
            Modèle Claude Haiku 4.5 (~$0.0025 par question, viable) avec
            gate triple : auth + plan + rate limit 20/jour/user. */}
        <div className="mt-12">
          <AskAI
            cryptoId={c.id}
            cryptoName={c.name}
            cryptoSymbol={c.symbol}
          />
        </div>

        {/* NEWS AGGREGATOR — 5 dernières news par crypto, fade-up, render null si vide */}
        <div className="mt-12">
          <CryptoNewsAggregator
            coingeckoId={c.coingeckoId}
            cryptoName={c.name}
            cryptoSymbol={c.symbol}
          />
        </div>

        {/* ROADMAP — uniquement si on a des données fiables pour cette crypto */}
        {roadmapEvents && (
          <div className="mt-12">
            <CryptoRoadmap cryptoName={c.name} events={roadmapEvents} />
          </div>
        )}

        {/* CALENDRIER ÉVÉNEMENTS — court-moyen terme (token unlocks, hard forks, ETF) */}
        <div className="mt-12">
          <CryptoEventCalendar cryptoId={c.id} cryptoName={c.name} />
        </div>

        {/* QUIZ — 8 questions par crypto pour top 20, render null sinon */}
        <div className="mt-12">
          <CryptoQuiz
            cryptoId={c.id}
            cryptoName={c.name}
            cryptoSymbol={c.symbol}
          />
        </div>

        {/* CROSS-LINK HALVING (Bitcoin uniquement) */}
        {c.id === "bitcoin" && (
          <section
            aria-label="Halving Bitcoin"
            className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6"
          >
            <h2 className="text-lg font-bold text-fg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-300" aria-hidden="true" />
              À savoir sur le Bitcoin
            </h2>
            <p className="mt-2 text-sm text-fg/85 leading-relaxed">
              Le prochain halving Bitcoin est attendu en avril 2028. Cet
              évènement programmé divise par deux la récompense des mineurs
              tous les 4 ans et structure l'inflation du BTC.{" "}
              <Link
                href="/halving-bitcoin"
                className="underline font-semibold hover:text-amber-200"
              >
                Voir le compte à rebours et l'analyse →
              </Link>
            </p>
          </section>
        )}

        {/* CROSS-LINK ACADÉMIE (Bitcoin uniquement — porte d'entrée pour
            les débutants qui atterrissent souvent sur la fiche BTC) */}
        {c.id === "bitcoin" && (
          <section
            aria-label="Académie crypto Cryptoreflex"
            className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6"
          >
            <h2 className="text-lg font-bold text-fg flex items-center gap-2">
              <GraduationCap
                className="h-5 w-5 text-emerald-300"
                aria-hidden="true"
              />
              Débutant ? Commence par notre académie
            </h2>
            <p className="mt-2 text-sm text-fg/85 leading-relaxed">
              On a structuré 15 leçons gratuites en 3 niveaux pour partir de
              zéro et progresser à ton rythme. Bitcoin est juste la première
              brique — il y a beaucoup à découvrir.{" "}
              <Link
                href="/academie"
                className="underline font-semibold hover:text-emerald-200"
              >
                Voir l&apos;Académie crypto →
              </Link>
            </p>
          </section>
        )}

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Questions fréquentes
          </h2>
          <div className="mt-5 space-y-3">
            {faq.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-surface px-5 py-4 open:bg-elevated"
              >
                <summary className="cursor-pointer list-none font-semibold text-fg flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-muted group-open:rotate-180 transition-transform shrink-0">
                    ▾
                  </span>
                </summary>
                <p className="mt-3 text-sm text-fg/80 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Maillage interne — cluster sémantique du graphe (compact, en chips) */}
        <RelatedPagesNav
          currentPath={`/cryptos/${c.id}`}
          limit={6}
          variant="compact"
        />

        {/* COMPARER AVEC… (Programmatic SEO #8) — top 5 cryptos similaires
            avec lien direct vers /comparer/[a]/[b]. Filtré sur TOP_30_CRYPTO_IDS
            pour ne pointer que vers des pages programmatic réellement générées. */}
        {(() => {
          const compareTargets = getSimilarCryptosForCompare(c.id, 5);
          if (compareTargets.length === 0) return null;
          return (
            <section className="mt-12">
              <h2 className="text-2xl font-bold tracking-tight">
                Comparer {c.name} avec…
              </h2>
              <p className="mt-2 text-sm text-muted">
                Cryptos comparables (même catégorie ou top 30 market cap) :
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {compareTargets.map((other) => (
                  <li key={other.id}>
                    <Link
                      href={buildComparerPairUrl(c.id, other.id)}
                      className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 hover:border-primary/40"
                    >
                      <span className="text-sm font-semibold text-fg">
                        {c.symbol} vs {other.symbol}
                      </span>
                      <span className="text-xs text-muted">{other.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })()}

        {/* ACHETER DANS TON PAYS (Programmatic SEO #8) — 6 liens vers
            /acheter/{slug}/{country} pour chaque pays FR-speaking. */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            Acheter {c.name} dans ton pays
          </h2>
          <p className="mt-2 text-sm text-muted">
            Guides MiCA localisés (fiscalité, régulateur, devise) pour 6 pays
            francophones :
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {COUNTRY_CODES.map((code) => {
              const co = COUNTRIES[code];
              return (
                <li key={code}>
                  <Link
                    href={`/acheter/${c.id}/${code}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 hover:border-primary/40"
                  >
                    <span className="text-sm font-semibold text-fg">
                      Acheter {c.symbol} en {co.name}
                    </span>
                    <span className="text-xs text-muted">
                      {co.regulator} · {co.currency}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ARTICLES CONNEXES */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold tracking-tight">
              D'autres cryptos à découvrir
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((rc) => (
                <Link
                  key={rc.id}
                  href={`/cryptos/${rc.id}`}
                  className="rounded-xl border border-border bg-surface p-4 hover:border-primary/40 transition-colors"
                >
                  <div className="text-[11px] uppercase tracking-wider text-muted">
                    {rc.kind === "hidden-gem" ? "Hidden Gem" : `Top ${rc.rank}`}
                  </div>
                  <div className="mt-1 text-sm font-bold text-fg">
                    {rc.name}{" "}
                    <span className="text-muted font-mono text-xs">{rc.symbol}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted line-clamp-2">{rc.tagline}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* DISCLAIMER AMF */}
        <div className="mt-12">
          <AmfDisclaimer variant={c.kind === "hidden-gem" ? "speculation" : "educatif"} />
        </div>

        {/* FIX UX FLOW 2026-05-02 #7 (audit expert UX) — la fiche crypto
            empile 25 sections, le visiteur ressort sans next step. Ajout
            d'un NextStepsGuide context="article" + categorie crypto pour
            proposer 3 destinations contextuelles (quiz, calculateur, académie).
            Cohérent avec le mantra "chaque page répond à 'Et maintenant ?'". */}
        <div className="mt-12">
          <NextStepsGuide
            context="article"
            articleCategory="Crypto"
          />
        </div>

        {/* MENTIONS */}
        <p className="mt-8 text-[11px] text-muted leading-relaxed">
          Données de prix CoinGecko (cache 5 min). Données éditoriales vérifiées le 25/04/2026
          par le fondateur {BRAND.name} (Kevin Voisin). Cette page contient des liens d'affiliation :
          Cryptoreflex perçoit une commission si tu ouvres un compte chez l'une des plateformes recommandées,
          sans surcoût pour toi et sans impact sur le classement. Pour le détail, voir notre{" "}
          <Link href="/methodologie" className="underline hover:text-fg">méthodologie</Link>{" "}
          et notre <Link href="/transparence" className="underline hover:text-fg">page transparence</Link>.
        </p>
      </div>

      {/* Sticky CTA mobile : meilleure plateforme connue listée pour cette crypto. */}
      {recommendedPlatform && (
        <MobileStickyCTA
          platformId={recommendedPlatform.id}
          title={`Acheter ${c.name}`}
          label={`Aller sur ${recommendedPlatform.name}`}
          href={recommendedPlatform.affiliateUrl}
          surface="crypto-page"
        />
      )}

      {/* Polish UX 01/05/2026 — bouton de partage flottant (bottom-left). */}
      <FloatingShareButton
        url={pageUrl}
        title={`${c.name} (${c.symbol}) — Cryptoreflex`}
        shareText={`${c.name} (${c.symbol}) : ${c.tagline} — Analyse Cryptoreflex`}
      />
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composants page                                                      */
/* -------------------------------------------------------------------------- */

function Spec({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 text-sm font-semibold text-fg">{value}</div>
    </div>
  );
}

function HiddenGemSections({ gem }: { gem: HiddenGem }) {
  const r = gem.reliability;
  return (
    <>
      <section className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Pourquoi {gem.name} est intéressant
        </h2>
        <p className="mt-3 text-base text-fg/85 leading-relaxed">{gem.whyHiddenGem}</p>
      </section>

      {/* Reliability détaillée */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Reliability score : {r.score.toFixed(1)}/10 — détail
        </h2>
        <p className="mt-2 text-sm text-muted max-w-3xl">
          Sept critères publics, vérifiables sur sources ouvertes (GitHub, registres, audits).
          Aucun jugement subjectif sur la "qualité" du token.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ReliabilityCell label="Équipe identifiée" ok={r.teamIdentified} value={r.teamIdentified ? "Oui (publique)" : "Anonyme"} />
          <ReliabilityCell label="Open source" ok={r.openSource} value={r.openSource ? "Oui (GitHub)" : "Non"} />
          <ReliabilityCell label="Années d'activité" ok={r.yearsActive >= 3} value={`${r.yearsActive} ans`} />
          <ReliabilityCell label="Audits indépendants" ok={r.auditedBy.length > 0} value={r.auditedBy.join(", ") || "—"} />
          <ReliabilityCell label="Dernier audit" ok={true} value={r.lastAuditDate} />
          <ReliabilityCell label="Incidents majeurs" ok={r.majorIncidents.startsWith("Aucun")} value={r.majorIncidents} multiline />
        </div>
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted">Levée de fonds</div>
              <div className="mt-1 text-sm font-semibold text-fg">{r.fundingRaised}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted">Investisseurs</div>
              <div className="mt-1 text-sm text-fg/85">{r.backers.join(" · ")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Risques détaillés */}
      <section className="mt-12 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-amber-300">
          <AlertTriangle className="h-6 w-6" />
          Risques détaillés
        </h2>
        <p className="mt-2 text-sm text-fg/80">
          Ces risques sont publics et identifiés par notre équipe. Ils ne disparaîtront pas
          parce que le prix monte : ils définissent le scénario baissier réaliste.
        </p>
        <ul className="mt-4 space-y-2">
          {gem.risks.map((risk, idx) => (
            <li key={risk} className="flex items-start gap-3 text-sm text-fg/85">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-300">
                {idx + 1}
              </span>
              <span>{risk}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Monitoring signals */}
      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Indicateurs à surveiller (monitoring on-chain)
        </h2>
        <p className="mt-2 text-sm text-muted">
          Plutôt que de regarder uniquement le prix, suivez ces métriques d'adoption et de
          santé du protocole. Si elles montent, la thèse fondamentale tient ; si elles
          stagnent ou baissent, le narratif s'essouffle.
        </p>
        <ul className="mt-4 space-y-2 list-disc pl-5 marker:text-primary">
          {gem.monitoringSignals.map((s) => (
            <li key={s} className="text-sm text-fg/85">{s}</li>
          ))}
        </ul>
        <div className="mt-5">
          <a
            href={gem.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-soft hover:text-primary"
          >
            Site officiel {gem.name}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>
    </>
  );
}

function ReliabilityCell({
  label,
  value,
  ok,
  multiline = false,
}: {
  label: string;
  value: string;
  ok: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div
        className={`mt-1 text-sm font-semibold ${
          ok ? "text-accent-green" : "text-accent-rose"
        } ${multiline ? "" : "truncate"}`}
      >
        {value}
      </div>
    </div>
  );
}
