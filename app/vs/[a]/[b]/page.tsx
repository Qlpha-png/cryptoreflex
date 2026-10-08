/**
 * /vs/[a]/[b] — Programmatic SEO crypto vs crypto (435 paires top 30).
 *
 * NOTE 2026-05-02 : route déplacée de /comparer/[a]/[b] → /vs/[a]/[b] pour
 * éviter le conflit Next.js avec /comparer/[slug] legacy (2 segments
 * dynamiques au même niveau avec noms différents = build error).
 *
 * Different from :
 *   - /comparer/[slug]      → legacy 105 paires top15 (slug "btc-vs-eth", same data)
 *   - /comparatif/[slug]    → plateformes (Coinbase vs Binance)
 *   - /cryptos/comparer     → comparateur DYNAMIQUE custom (noindex)
 *
 * URL canonique : /vs/{a}/{b} avec a < b lexicographique.
 * Si l'utilisateur arrive sur /vs/eth/btc → redirect 301 vers /vs/btc/eth.
 *
 * Contenu 100 % data-driven (pas de prose hallucinée) :
 * tout est généré depuis getAllCryptos(), getDecentralizationScore() et
 * fetchCoinDetailDaily() (CoinGecko/KV, cache par coin et par jour).
 * Lot légal du 08/10/2026 : aucun gagnant, aucun profil → crypto, seules les plateformes autorisées en France.
 */

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeftRight,
  CheckCircle2,
  ExternalLink,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { TOP_PAIRS } from "@/lib/historical-prices";

import {
  getCryptoPairs,
  isCanonicalPair,
  isMeaningfulPair,
  canonicalizePair,
  getPairCryptos,
} from "@/lib/programmatic-pages";
import {
  getDecentralizationScore,
  formatDecentralizationVerdict,
} from "@/lib/decentralization-scores";
import { fetchCoinDetailDaily, formatCompactNumber } from "@/lib/coingecko";
import { coursSourceTexte } from "@/lib/data-sources/attribution";
import { getAllCryptos, type AnyCrypto } from "@/lib/cryptos";
import { nomsAutorisesFr } from "@/lib/plateformes-autorisees";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import { cryptoFinancialProductSchema, faqSchema, graphSchema } from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import { fmtFr } from "@/lib/format-fr";
import Breadcrumbs from "@/components/Breadcrumbs";

// BATCH 58 (2026-05-03) — Extension TOP 30 -> TOP 100 (4950 paires).
// Strategy : pre-build top 15 cryptos = 105 paires (les plus search FR), les
// 4845 autres SSR a la demande (ISR cache 24h). Vercel Hobby timeout 45min
// supporte sans probleme : 105 paires × 6s = 10.5min de build, large marge.
// Crawler Google tape progressivement les 4845 autres a son rythme.
// QUOTA VERCEL 2026-06-11 — revalidate allongé (ISR writes 409K/200K Hobby) :
// le HTML seed peut dater, les données fraîches arrivent côté client.
// 4950 duels × 1 write/jour = ~150K/mois à eux seuls → 7 jours.
export const revalidate = 604800;
export const dynamicParams = true;

interface Props {
  params: { a: string; b: string };
}

/* -------------------------------------------------------------------------- */
/*  generateStaticParams — TOP 8 cryptos × 7 / 2 = 28 paires pre-build       */
/*  Les autres 407 paires sont SSR à la demande (ISR cache 24h ensuite).      */
/* -------------------------------------------------------------------------- */

// FIX BUILD 2026-05-06 — Réduit TOP 15 → TOP 5 (105 paires → 10).
// Avant : 105 paires × fetchCoinDetail × 2 = 210 appels CoinGecko au build,
// dont la majorité sur des coins exotiques (the-graph, render, celestia,
// near-protocol) absents de price-source.ts → rate-limit 429.
// Maintenant : seules les 5 paires de réputation max (BTC/ETH/SOL/BNB/XRP),
// toutes couvertes par price-source.ts (Binance + CoinCap, gratuit
// illimité). Les 4940 autres paires sont SSR au 1er hit + cache 24h ISR.
const PRE_BUILD_TOP = [
  "bitcoin",
  "ethereum",
  "solana",
  "bnb",
  "xrp",
];

export function generateStaticParams() {
  return getCryptoPairs()
    .filter((p) => PRE_BUILD_TOP.includes(p.a) && PRE_BUILD_TOP.includes(p.b))
    .map((p) => ({ a: p.a, b: p.b }));
}

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */

export function generateMetadata({ params }: Props): Metadata {
  // Si la paire n'est pas canonique on ne génère pas de métadonnées (la page
  // se chargera de rediriger ou 404). On évite un title mort.
  if (!isCanonicalPair(params.a, params.b)) {
    return { robots: { index: false, follow: false } };
  }
  const pair = getPairCryptos(params.a, params.b);
  if (!pair) return { robots: { index: false, follow: false } };
  const { a, b } = pair;

  // BATCH 58 — retire '— Cryptoreflex' suffix manuel : layout root applique
  // deja template '%s | Cryptoreflex' -> sans ca on aurait '...Cryptoreflex | Cryptoreflex'.
  // FIX 2026-06-13 — title raccourci (symboles front-loadés, query exacte
  // "btc vs eth") pour rester < 60 chars avec le suffixe " | Cryptoreflex".
  const title = `${a.symbol} vs ${b.symbol} : comparatif 2026`;
  // Description front-loadée + coupée proprement à 160 chars (le tail unique
  // était systématiquement tronqué par Google sinon). Une seule tagline.
  const rawDescription = `${a.name} (${a.symbol}) ou ${b.name} (${b.symbol}) en 2026 : market cap, supply, consensus, plateformes autorisées en France. ${a.tagline.replace(/\.*$/, "")}.`;
  const description =
    rawDescription.length > 160
      ? rawDescription.slice(0, 159).replace(/[\s,;:.…-]+$/, "").replace(/\s+\S*$/, "").trimEnd() + "…"
      : rawDescription;

  const url = `${BRAND.url}/vs/${params.a}/${params.b}`;
  return {
    title,
    description,
    alternates: withHreflang(url),
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [{ url: `${BRAND.url}/og-image.png`, width: 1200, height: 630, alt: "Cryptoreflex" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers texte (data-driven, jamais halluciné)                              */
/* -------------------------------------------------------------------------- */

function fmtUsd(n: number | null | undefined): string {
  // FIX 2026-06-13 (red team) — 0 sur un prix / market cap / volume d'un top-10
  // = donnée manquante (impossible en réalité), pas une vraie valeur. On affiche
  // « — » plutôt que « 0.00 $ » (qui faisait douter de toute la donnée du tableau).
  if (n == null || Number.isNaN(n) || n === 0) return "—";
  if (n >= 1_000_000_000) return `${fmtFr((n / 1_000_000_000), 1)} Md $`;
  if (n >= 1_000_000) return `${fmtFr((n / 1_000_000), 1)} M $`;
  if (n >= 1_000) return `${fmtFr((n / 1_000), 1)} k $`;
  return `${fmtFr(n, 2)} $`;
}

function consensusOf(c: AnyCrypto): string {
  return c.kind === "top10" ? c.consensus : "—";
}

function blockTimeOf(c: AnyCrypto): string {
  return c.kind === "top10" ? c.blockTime : "—";
}

function maxSupplyOf(c: AnyCrypto): string {
  return c.kind === "top10" ? c.maxSupply : c.marketCapRange;
}

/* Lot légal du 08/10/2026 : plus de « niveau de risque » (« Faible » pour BTC contredit le risque de perte en capital ;
   celui des autres cryptos dérivait d'une note sans formule publiée), plus de score « débutant », plus de verdict
   « Plutôt adapté : X » par profil (correspondance profil → crypto = recommandation au sens de l'AMF). */

/**
 * Plateformes AUTORISÉES EN FRANCE (platforms.json + isAvailableFr) parmi la liste éditoriale whereToBuy.
 * KuCoin, Gate.io, « DEX uniquement », « (selon juridiction) » et la note « Aucune plateforme agréée MiCA… »
 * ne sont ni comptés ni affichés (lot légal du 08/10/2026).
 */
function venuesOf(c: AnyCrypto): string[] {
  return nomsAutorisesFr(c.whereToBuy);
}

/**
 * 4 différences clés calculées depuis les fields (pas de jugement éditorial).
 */
function buildKeyDifferences(a: AnyCrypto, b: AnyCrypto): string[] {
  const diffs: string[] = [];

  // 1. Année / antériorité
  const ageGap = Math.abs(a.yearCreated - b.yearCreated);
  if (ageGap > 0) {
    const elder = a.yearCreated < b.yearCreated ? a : b;
    diffs.push(
      `${elder.name} est plus ancien (${elder.yearCreated} vs ${
        elder === a ? b.yearCreated : a.yearCreated
      }) — un écart de ${ageGap} an${ageGap > 1 ? "s" : ""}.`,
    );
  } else {
    diffs.push(`Les deux projets ont été lancés la même année (${a.yearCreated}).`);
  }

  // 2. Catégorie
  if (a.category !== b.category) {
    diffs.push(
      `Catégories distinctes : ${a.name} relève de "${a.category}" tandis que ${b.name} se positionne sur "${b.category}".`,
    );
  } else {
    diffs.push(`Même catégorie d'usage (${a.category}) : concurrents directs sur le même créneau.`);
  }

  // 3. Consensus / type d'infra
  const cA = consensusOf(a);
  const cB = consensusOf(b);
  if (cA !== "—" && cB !== "—") {
    if (cA !== cB) {
      diffs.push(`Consensus différents : ${a.name} utilise ${cA}, ${b.name} utilise ${cB}.`);
    } else {
      diffs.push(`Consensus identique (${cA}) — les deux mécaniques de validation se ressemblent.`);
    }
  }

  // 4. Disponibilité plateformes (intersection)
  const common = venuesOf(a).filter((p) => venuesOf(b).includes(p));
  if (common.length > 0) {
    diffs.push(
      `Plateformes autorisées en France de notre liste qui proposent les deux : ${common.slice(0, 4).join(", ")}${common.length > 4 ? "…" : ""} (${common.length} au total).`,
    );
  } else {
    diffs.push(
      `Aucune plateforme autorisée en France de notre liste ne propose les deux, à notre connaissance.`,
    );
  }

  return diffs.slice(0, 4);
}

/**
 * Intro de synthèse — 100 % dérivée des données réelles des 2 cryptos
 * (aucune prose hallucinée). Unique par paire → ajoute du texte indexable
 * en tête de page (anti « thin content » : les pages partaient directement
 * sur le tableau). 2026-06-13.
 */
function buildIntro(a: AnyCrypto, b: AnyCrypto, commonCount: number): string {
  const gap = Math.abs(a.yearCreated - b.yearCreated);
  const elder = a.yearCreated <= b.yearCreated ? a : b;
  const sameCat = a.category === b.category;
  const parts: string[] = [];
  parts.push(
    `${a.name} (${a.symbol}), ${a.category.toLowerCase()} lancé en ${a.yearCreated}, face à ${b.name} (${b.symbol}), ${b.category.toLowerCase()} lancé en ${b.yearCreated}.`,
  );
  parts.push(
    sameCat
      ? `Deux projets du même créneau (${a.category.toLowerCase()}) : ce sont des concurrents directs.`
      : `Deux créneaux distincts : ils ne répondent pas au même usage.`,
  );
  if (gap > 0) {
    parts.push(`${elder.name} compte ${gap} an${gap > 1 ? "s" : ""} d'antériorité sur le marché.`);
  }
  parts.push(
    commonCount > 0
      ? `${commonCount} plateforme${commonCount > 1 ? "s" : ""} autorisée${commonCount > 1 ? "s" : ""} en France de notre liste propose${commonCount > 1 ? "nt" : ""} les deux.`
      : `Aucune plateforme autorisée en France de notre liste ne propose les deux, à notre connaissance.`,
  );
  return parts.join(" ");
}

/**
 * Cross-links pertinents (FIX 2026-06-13) : on ancre sur les VOISINS catalogue
 * de a ET b (ordre market-cap = proximité thématique) plutôt que sur la seule
 * tête de marché. Garantit qu'une paire longue traîne (rank 31-100) émet des
 * liens vers d'autres duels la contenant → maillage ascendant anti crawl-budget.
 * 100 % data-local, aucun fetch.
 */
function buildVsCrossLinks(a: AnyCrypto, b: AnyCrypto): { href: string; label: string }[] {
  const catalogue = getAllCryptos();
  const neighbours = (self: AnyCrypto): AnyCrypto[] => {
    const i = catalogue.findIndex((c) => c.id === self.id);
    if (i < 0) return [];
    return catalogue
      .slice(Math.max(0, i - 3), i + 4)
      .filter((c) => c.id !== a.id && c.id !== b.id)
      .slice(0, 6);
  };
  const selfPair = [a.id, b.id].sort().join("/");
  const seen = new Set<string>();
  const links: { href: string; label: string }[] = [];
  for (const { self, other } of [
    ...neighbours(a).map((o) => ({ self: a, other: o })),
    ...neighbours(b).map((o) => ({ self: b, other: o })),
  ]) {
    const [x, y] = [self.id, other.id].sort();
    const href = `/vs/${x}/${y}`;
    if (`${x}/${y}` === selfPair || seen.has(href)) continue;
    /* 04/10/2026 — on ne pousse que des duels pertinents (tête de marché ou top 40 des deux côtés) */
    if (!isMeaningfulPair(x, y)) continue;
    seen.add(href);
    links.push({ href, label: `${self.symbol} vs ${other.symbol}` });
  }
  /* longue traîne : au moins quelques duels contre les têtes de marché, toujours pertinents */
  if (links.length < 6) {
    for (const head of catalogue.slice(0, 10)) {
      for (const self of [a, b]) {
        if (head.id === a.id || head.id === b.id) continue;
        const [x, y] = [self.id, head.id].sort();
        const href = `/vs/${x}/${y}`;
        if (seen.has(href) || !isMeaningfulPair(x, y)) continue;
        seen.add(href);
        links.push({ href, label: `${self.symbol} vs ${head.symbol}` });
        if (links.length >= 12) break;
      }
      if (links.length >= 12) break;
    }
  }
  return links.slice(0, 12);
}

/**
 * BATCH 58 — Forces uniques de chaque crypto (3 points par crypto).
 * Genere depuis les data MDX (top10 ou hidden-gems).
 */
function buildStrengths(c: AnyCrypto): string[] {
  if (c.kind === "top10") {
    return c.strengths.slice(0, 3);
  }
  // Hidden gem : tagline + audits publics (lot légal du 08/10/2026 : plus de « score fiabilité », note sans formule publiée)
  const out: string[] = [];
  if (c.reliability.auditedBy && c.reliability.auditedBy.length > 0) {
    out.push(`Audits par ${c.reliability.auditedBy.slice(0, 2).join(" et ")}.`);
  }
  out.push(c.tagline);
  return out.slice(0, 3);
}

/**
 * 4 questions FAQ avec réponses 100 % dérivées des data des 2 cryptos.
 */
function buildFaq(a: AnyCrypto, b: AnyCrypto): { q: string; ans: string }[] {
  const common = venuesOf(a).filter((p) => venuesOf(b).includes(p));

  return [
    {
      q: `Quelle différence entre ${a.name} et ${b.name} ?`,
      ans: `${a.name} (${a.symbol}) : « ${a.tagline.replace(/\.*$/, "")} ». ${b.name} (${b.symbol}) : « ${b.tagline.replace(/\.*$/, "")} ». Ils ne répondent pas forcément au même usage : le tableau ci-dessus compare leurs caractéristiques, sans désigner de gagnant. Ces informations sont générales et ne tiennent pas compte de votre situation : elles ne constituent pas un conseil en investissement.`,
    },
    {
      q: `Où trouver ${a.name} et ${b.name} en France ?`,
      ans:
        common.length > 0
          ? `Plateformes autorisées en France de notre liste qui proposent les deux : ${common.join(", ")}. Liste éditoriale, non exhaustive ; vérifiez le statut de la plateforme avant d'ouvrir un compte.`
          : `Aucune plateforme autorisée en France de notre liste ne propose les deux, à notre connaissance. Pour ${a.name} : ${venuesOf(a).slice(0, 3).join(", ") || "aucune plateforme autorisée de notre liste"}. Pour ${b.name} : ${venuesOf(b).slice(0, 3).join(", ") || "aucune plateforme autorisée de notre liste"}.`,
    },
    {
      q: `Quels sont les risques de ${a.name} et ${b.name} ?`,
      ans: `Pour ${a.name} : ${
        a.kind === "top10"
          ? a.weaknesses.slice(0, 2).join(" ; ")
          : a.risks.slice(0, 2).join(" ; ")
      }. Pour ${b.name} : ${
        b.kind === "top10"
          ? b.weaknesses.slice(0, 2).join(" ; ")
          : b.risks.slice(0, 2).join(" ; ")
      }. Dans les deux cas, le cours peut baisser fortement : risque de perte en capital.`,
    },
    {
      q: `${a.name} et ${b.name} sont-ils conformes MiCA ?`,
      ans: `MiCA s'applique aux PRESTATAIRES (CASP) et non aux cryptos elles-mêmes. Depuis le 1er juillet 2026, seul un prestataire agréé MiCA peut servir les résidents français. Notre liste compte ${venuesOf(a).length} plateforme(s) autorisée(s) en France pour ${a.name} et ${venuesOf(b).length} pour ${b.name}. Vérifiez le statut d'une plateforme avec notre vérificateur MiCA avant de déposer des fonds.`,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function CryptoPairPage({ params }: Props) {
  // 1. Si non canonique mais valide en swap → redirect 301 vers la canonical.
  if (!isCanonicalPair(params.a, params.b)) {
    const canon = canonicalizePair(params.a, params.b);
    if (canon.swapped && isCanonicalPair(canon.a, canon.b)) {
      redirect(`/vs/${canon.a}/${canon.b}`);
    }
    notFound();
  }

  const pair = getPairCryptos(params.a, params.b);
  if (!pair) notFound();
  const { a, b } = pair;

  // 2. Données marché : cache par coin et par jour (fetchCoinDetailDaily),
  //    partagé par les 99 duels de chaque coin. PERF 2026-10-02 — avant :
  //    fetchCoinDetail ×2 + getPairCorrelation7d (qui refaisait ×2 en no-store)
  //    → rendus à froid de 6-8 s (fallback CoinGecko per-id en 429 + pauses de
  //    retry) et revalidation ISR effective de 60 s au lieu de 7 j.
  //    Lot légal du 08/10/2026 : « Corrélation 7j » retirée (7 jours = bruit, présenté comme un fait utile au portefeuille).
  const [detailA, detailB] = await Promise.all([
    fetchCoinDetailDaily(a.coingeckoId),
    fetchCoinDetailDaily(b.coingeckoId),
  ]);

  // 3. Decentralization scores (statiques, peuvent être null).
  const decentA = getDecentralizationScore(a.id);
  const decentB = getDecentralizationScore(b.id);

  // 4. Plateformes communes (intersection brute des labels whereToBuy).
  const commonPlatforms = venuesOf(a).filter((p) => venuesOf(b).includes(p));

  // 4bis. Paire de conversion (bas de funnel) : on ne lie vers /convertisseur que
  // si la paire existe RÉELLEMENT dans TOP_PAIRS — sinon lien mort (la route est
  // dynamicParams=false = 404 dur hors-liste). On respecte la direction prébuild.
  const _symA = a.symbol.toLowerCase();
  const _symB = b.symbol.toLowerCase();
  const convPair = TOP_PAIRS.find(
    (p) =>
      (p.from === _symA && p.to === _symB) ||
      (p.from === _symB && p.to === _symA),
  );

  // 5. Différences + FAQ (plus de verdict par profil : lot légal du 08/10/2026)
  const keyDiffs = buildKeyDifferences(a, b);
  const faq = buildFaq(a, b);
  const strengthsA = buildStrengths(a);
  const strengthsB = buildStrengths(b);

  // 6. Schemas
  const slug = `${a.id}/${b.id}`;
  const schemas = graphSchema([
    cryptoFinancialProductSchema({
      slug: a.id,
      name: a.name,
      symbol: a.symbol,
      description: a.tagline,
      category: a.category,
      yearCreated: a.yearCreated,
      sameAs: [`https://www.coingecko.com/en/coins/${a.coingeckoId}`],
    }),
    cryptoFinancialProductSchema({
      slug: b.id,
      name: b.name,
      symbol: b.symbol,
      description: b.tagline,
      category: b.category,
      yearCreated: b.yearCreated,
      sameAs: [`https://www.coingecko.com/en/coins/${b.coingeckoId}`],
    }),
    faqSchema(faq.map((f) => ({ question: f.q, answer: f.ans }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData data={schemas} id={`comparer-pair-${slug.replace("/", "-")}`} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs chemin={`/vs/${a.id}/${b.id}`} label={`${a.name} ou ${b.name}`} />

        <header className="mt-6">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-fg">
            Comparatif {a.name} <span className="gradient-text">vs</span> {b.name} en 2026
          </h1>
          <p className="mt-4 text-base text-fg/80 leading-relaxed max-w-[34em]">
            {buildIntro(a, b, commonPlatforms.length)}
          </p>
          <p className="mt-3 text-sm text-muted">
            {/* 08/10/2026 (lot Z2) : source réellement utilisée, plus de « CoinGecko » écrit en dur */}
            Tableau side-by-side
            {coursSourceTexte([{ sources: detailA?.sources }, { sources: detailB?.sources }])
              ? ` · ${coursSourceTexte([{ sources: detailA?.sources }, { sources: detailB?.sources }])}`
              : ""}{" "}
            · méthodologie publique Cryptoreflex
          </p>
        </header>

        {/* Tableau side-by-side */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-tight">Tableau comparatif</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-3 py-2">Critère</th>
                  <th className="px-3 py-2">
                    <Link href={`/cryptos/${a.id}`} className="text-fg hover:text-primary">
                      {a.name} ({a.symbol})
                    </Link>
                  </th>
                  <th className="px-3 py-2">
                    <Link href={`/cryptos/${b.id}`} className="text-fg hover:text-primary">
                      {b.name} ({b.symbol})
                    </Link>
                  </th>
                </tr>
              </thead>
              <tbody className="text-fg/85">
                <Row label="Market cap" a={fmtUsd(detailA?.marketCap)} b={fmtUsd(detailB?.marketCap)} />
                <Row label="Volume 24h" a={fmtUsd(detailA?.totalVolume)} b={fmtUsd(detailB?.totalVolume)} />
                <Row
                  label="Supply en circulation"
                  a={formatCompactNumber(detailA?.circulatingSupply)}
                  b={formatCompactNumber(detailB?.circulatingSupply)}
                />
                <Row label="Supply max" a={maxSupplyOf(a)} b={maxSupplyOf(b)} />
                <Row label="Année de création" a={String(a.yearCreated)} b={String(b.yearCreated)} />
                <Row label="Consensus" a={consensusOf(a)} b={consensusOf(b)} />
                <Row label="Temps de bloc" a={blockTimeOf(a)} b={blockTimeOf(b)} />
                <Row
                  label="Score décentralisation"
                  a={decentA ? `${fmtFr(decentA.score, 1)}/10` : "—"}
                  b={decentB ? `${fmtFr(decentB.score, 1)}/10` : "—"}
                />
                <Row
                  label="Plateformes autorisées en France (notre liste)"
                  a={String(venuesOf(a).length)}
                  b={String(venuesOf(b).length)}
                />
              </tbody>
            </table>
          </div>
          {(decentA || decentB) && (
            <p className="mt-3 text-xs text-muted">
              Score décentralisation : {decentA ? `${a.name} — ${formatDecentralizationVerdict(decentA.score)}` : ""}
              {decentA && decentB ? " · " : ""}
              {decentB ? `${b.name} — ${formatDecentralizationVerdict(decentB.score)}` : ""}
            </p>
          )}
        </section>

        {/* Différences clés */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Différences clés</h2>
          <ul className="mt-5 space-y-3">
            {keyDiffs.map((d, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-fg/85">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary-soft">
                  {idx + 1}
                </span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Plateformes communes */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            Plateformes autorisées en France qui proposent les deux
          </h2>
          {commonPlatforms.length > 0 ? (
            <>
              <p className="mt-3 text-sm text-muted">
                {commonPlatforms.length} plateforme{commonPlatforms.length > 1 ? "s" : ""} de notre liste
                {" "}
                {commonPlatforms.length > 1 ? "proposent" : "propose"} à la fois {a.symbol} et {b.symbol} (ordre
                alphabétique, liste non exhaustive) :
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {commonPlatforms.map((p) => (
                  <li
                    key={p}
                    className="inline-flex items-center rounded-full border border-border bg-elevated px-3 py-1 text-xs text-fg/85"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Aucune plateforme autorisée en France de notre liste ne propose les deux, à notre connaissance. Voir
              les fiches de chaque crypto.
            </p>
          )}
        </section>

        {/* Passer à l'achat / la conversion — irrigue les hubs bas-de-funnel
            (acheter, convertisseur) depuis le cluster /vs qui reçoit du trafic.
            Liens internes uniquement, tous garantis valides : /acheter/{id}/fr est
            prébuild pour toutes les cryptos, /convertisseur seulement si la paire
            existe dans TOP_PAIRS (sinon pas de lien → zéro 404). */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            Où les trouver en France
          </h2>
          <p className="mt-3 text-sm text-muted">
            Pour chaque crypto : les plateformes autorisées en France de notre liste, les étapes et ce qu&apos;il
            faut déclarer ensuite.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              href={`/acheter/${a.id}/fr`}
              className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-fg hover:border-primary/50 transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" aria-hidden="true" />
                Acheter {a.name} ({a.symbol}) en France
              </span>
              <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary" aria-hidden="true" />
            </Link>
            <Link
              href={`/acheter/${b.id}/fr`}
              className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-fg hover:border-primary/50 transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" aria-hidden="true" />
                Acheter {b.name} ({b.symbol}) en France
              </span>
              <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary" aria-hidden="true" />
            </Link>
            {convPair && (
              <Link
                href={`/convertisseur/${convPair.from}-${convPair.to}`}
                className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-fg hover:border-primary/50 transition-colors sm:col-span-2"
              >
                <span className="inline-flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-primary" aria-hidden="true" />
                  Convertir {convPair.from.toUpperCase()} en {convPair.to.toUpperCase()} (taux en temps réel)
                </span>
                <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary" aria-hidden="true" />
              </Link>
            )}
          </div>
        </section>

        {/* BATCH 58 — Forces uniques côte à côte (data MDX) */}
        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-accent-green/30 bg-accent-green/5 p-6">
            <h3 className="text-lg font-bold text-fg">
              {a.name} en bref
            </h3>
            <ul className="mt-4 space-y-2.5">
              {strengthsA.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-fg/85">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-accent-green" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-accent-cyan/30 bg-accent-cyan/5 p-6">
            <h3 className="text-lg font-bold text-fg">
              {b.name} en bref
            </h3>
            <ul className="mt-4 space-y-2.5">
              {strengthsB.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-fg/85">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-accent-cyan" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Cas d'usage côte-à-côte */}
        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <UseCaseCard crypto={a} />
          <UseCaseCard crypto={b} />
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Questions fréquentes</h2>
          <div className="mt-5 space-y-3">
            {faq.map((item) => (
              <details
                key={item.q}
                className="rounded-xl border border-border bg-surface px-5 py-4"
              >
                <summary className="cursor-pointer font-semibold text-fg">{item.q}</summary>
                <p className="mt-3 text-sm text-fg/80 leading-relaxed">{item.ans}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Cross-link : autres comparaisons pertinentes (FIX 2026-06-13).
            Avant : 8 paires construites depuis la tête de marché → une paire
            rank 31-100 ne recevait quasi aucun lien entrant. Désormais on
            ancre sur les VOISINS catalogue de a ET b → chaque page /vs/[a]/[b],
            même longue traîne, émet des liens vers des duels qui contiennent
            a ou b (maillage ascendant de la longue traîne, anti crawl-budget). */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Autres comparatifs</h2>
          <p className="mt-2 text-sm text-muted">
            Comparez {a.name} ou {b.name} à des cryptos proches :
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {buildVsCrossLinks(a, b).map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg/85 hover:border-primary/40 hover:text-primary-soft"
              >
                {label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-12">
          <AmfDisclaimer variant="educatif" />
        </div>

        {/* FIX 2026-06-13 — /vs était la SEULE route à trafic sans next-steps :
            le visiteur arrivait en cul-de-sac. On ajoute le maillage + les
            prochaines étapes comme sur les autres clusters. */}
        <div className="mt-12">
          <RelatedPagesNav
            currentPath={`/vs/${a.id}/${b.id}`}
            variant="default"
            limit={4}
          />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="comparator" />
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composants                                                            */
/* -------------------------------------------------------------------------- */

function Row({
  label,
  a,
  b,
  winner,
}: {
  label: string;
  a: string;
  b: string;
  winner?: "a" | "b" | null;
}) {
  return (
    <tr>
      <td className="px-3 py-2 text-xs uppercase tracking-wider text-muted bg-elevated/30 rounded-l-lg">
        {label}
      </td>
      <td
        className={`px-3 py-2 ${
          winner === "a"
            ? "bg-accent-green/10 font-semibold text-accent-green"
            : "bg-elevated/30"
        }`}
      >
        {a}
        {winner === "a" && <CheckCircle2 className="inline h-3.5 w-3.5 ml-1.5" />}
      </td>
      <td
        className={`px-3 py-2 rounded-r-lg ${
          winner === "b"
            ? "bg-accent-green/10 font-semibold text-accent-green"
            : "bg-elevated/30"
        }`}
      >
        {b}
        {winner === "b" && <CheckCircle2 className="inline h-3.5 w-3.5 ml-1.5" />}
      </td>
    </tr>
  );
}

function UseCaseCard({ crypto }: { crypto: AnyCrypto }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h3 className="text-lg font-bold text-fg flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        À quoi sert {crypto.name}
      </h3>
      <p className="mt-3 text-sm text-fg/85 leading-relaxed">{crypto.useCase}</p>
      <Link
        href={`/cryptos/${crypto.id}`}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft hover:text-primary"
      >
        Fiche complète {crypto.name}
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
