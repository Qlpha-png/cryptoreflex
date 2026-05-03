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
 * tout est généré depuis getAllCryptos(), getDecentralizationScore(),
 * fetchCoinDetail() (CoinGecko) et getPairCorrelation7d().
 */

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Trophy,
} from "lucide-react";

import {
  TOP_30_CRYPTO_IDS,
  getCryptoPairs,
  isCanonicalPair,
  canonicalizePair,
  getPairCryptos,
} from "@/lib/programmatic-pages";
import {
  getDecentralizationScore,
  formatDecentralizationVerdict,
} from "@/lib/decentralization-scores";
import {
  getPairCorrelation7d,
  describeCorrelation,
} from "@/lib/correlation";
import { fetchCoinDetail, formatCompactNumber } from "@/lib/coingecko";
import type { AnyCrypto } from "@/lib/cryptos";
import { BRAND } from "@/lib/brand";
import {
  breadcrumbSchema,
  cryptoFinancialProductSchema,
  faqSchema,
  graphSchema,
} from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import AmfDisclaimer from "@/components/AmfDisclaimer";

// BATCH 58 (2026-05-03) — Extension TOP 30 -> TOP 100 (4950 paires).
// Strategy : pre-build top 15 cryptos = 105 paires (les plus search FR), les
// 4845 autres SSR a la demande (ISR cache 24h). Vercel Hobby timeout 45min
// supporte sans probleme : 105 paires × 6s = 10.5min de build, large marge.
// Crawler Google tape progressivement les 4845 autres a son rythme.
export const revalidate = 86400; // 1 jour ISR
export const dynamicParams = true;

interface Props {
  params: { a: string; b: string };
}

/* -------------------------------------------------------------------------- */
/*  generateStaticParams — TOP 8 cryptos × 7 / 2 = 28 paires pre-build       */
/*  Les autres 407 paires sont SSR à la demande (ISR cache 24h ensuite).      */
/* -------------------------------------------------------------------------- */

// BATCH 58 — TOP 15 pre-build (= 105 paires) au build time. Couvre les paires
// les plus recherchees en FR (BTC vs ETH, BTC vs SOL, ETH vs SOL, etc.).
// Les 4845 autres paires sont SSR au 1er hit + cachees 24h ISR.
// IDs internes (slug) cf. data/top-cryptos.json + data/hidden-gems.json.
const PRE_BUILD_TOP = [
  "bitcoin",
  "ethereum",
  "xrp",
  "bnb",
  "solana",
  "dogecoin",
  "cardano",
  "tron",
  "avalanche",
  "chainlink",
  "near-protocol",
  "celestia",
  "the-graph",
  "render",
  "arbitrum",
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

  const title = `${a.name} vs ${b.name} : comparatif crypto complet 2026 — ${BRAND.name}`;
  const description = `${a.name} (${a.symbol}) et ${b.name} (${b.symbol}) en face-à-face : market cap, supply, sécurité, plateformes FR. ${a.tagline} face à ${b.tagline.toLowerCase()}.`;

  return {
    title,
    description,
    alternates: { canonical: `${BRAND.url}/vs/${params.a}/${params.b}` },
    openGraph: {
      title,
      description,
      url: `${BRAND.url}/vs/${params.a}/${params.b}`,
      type: "article",
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers texte (data-driven, jamais halluciné)                              */
/* -------------------------------------------------------------------------- */

function fmtUsd(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Md $`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M $`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} k $`;
  return `${n.toFixed(2)} $`;
}

function consensusOf(c: AnyCrypto): string {
  return c.kind === "top10" ? c.consensus : "—";
}

function maxSupplyOf(c: AnyCrypto): string {
  return c.kind === "top10" ? c.maxSupply : c.marketCapRange;
}

function riskOf(c: AnyCrypto): string {
  if (c.kind === "top10") return c.riskLevel;
  // Hidden gems : on dérive un niveau qualitatif depuis le score de fiabilité.
  const s = c.reliability.score;
  if (s >= 8.5) return "Modéré";
  if (s >= 7) return "Élevé";
  return "Très élevé";
}

function beginnerScore(c: AnyCrypto): string {
  return c.kind === "top10" ? `${c.beginnerFriendly}/5` : "—";
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
  const common = a.whereToBuy.filter((p) => b.whereToBuy.includes(p));
  if (common.length > 0) {
    diffs.push(
      `Plateformes communes pour acheter en France : ${common.slice(0, 4).join(", ")}${common.length > 4 ? "…" : ""} (${common.length} au total).`,
    );
  } else {
    diffs.push(
      `Aucune plateforme commune au catalogue : il faudra deux comptes distincts pour détenir les deux.`,
    );
  }

  return diffs.slice(0, 4);
}

/**
 * BATCH 58 — Verdict editorial unique par paire, base sur les attributs
 * concrets des 2 cryptos. Pas de prose generique, 100% data-driven.
 *
 * Logique :
 *  - Compare l'anciennete (anti-fragility = age sur le marche)
 *  - Compare le risque (qui pour quel profil)
 *  - Compare la categorie (concurrents / complementaires)
 *  - Genere une recommandation explicite "Pour X, Y est preferable car..."
 */
function buildVerdict(a: AnyCrypto, b: AnyCrypto): {
  conclusion: string;
  beginnerChoice: { winner: AnyCrypto; reason: string };
  experimentedChoice: { winner: AnyCrypto; reason: string };
  longTermChoice: { winner: AnyCrypto; reason: string };
} {
  const sameCategory = a.category === b.category;
  const ageGap = Math.abs(a.yearCreated - b.yearCreated);
  const elder = a.yearCreated < b.yearCreated ? a : b;
  const younger = a.yearCreated < b.yearCreated ? b : a;
  const riskA = riskOf(a);
  const riskB = riskOf(b);

  // 1. Conclusion
  let conclusion: string;
  if (sameCategory) {
    conclusion = `${a.name} et ${b.name} sont des concurrents directs sur le créneau "${a.category}". L'arbitrage se fait sur 3 axes : maturité (${elder.name} a ${ageGap} an${ageGap > 1 ? "s" : ""} d'avance), niveau de risque (${riskA} pour ${a.name}, ${riskB} pour ${b.name}) et disponibilité plateformes en France (${a.whereToBuy.length} vs ${b.whereToBuy.length}).`;
  } else {
    conclusion = `${a.name} et ${b.name} sont sur des créneaux différents : ${a.name} cible "${a.category}" tandis que ${b.name} se positionne sur "${b.category}". Ce ne sont pas des concurrents directs — ils peuvent coexister dans un portefeuille diversifié si les use cases t'intéressent les deux.`;
  }

  // 2. Choix débutant : le moins risqué + le plus ancien
  const riskOrder: Record<string, number> = {
    "Très faible": 0, "Faible": 1, "Modéré": 2, "Élevé": 3, "Très élevé": 4,
  };
  const safer = (riskOrder[riskA] ?? 4) <= (riskOrder[riskB] ?? 4) ? a : b;
  const beginnerScoreA = a.kind === "top10" ? a.beginnerFriendly : 0;
  const beginnerScoreB = b.kind === "top10" ? b.beginnerFriendly : 0;
  const beginnerWinner = beginnerScoreA > beginnerScoreB ? a : beginnerScoreB > beginnerScoreA ? b : safer;
  const beginnerReason =
    beginnerWinner === safer
      ? `Niveau de risque ${riskOf(beginnerWinner)} (vs ${riskOf(beginnerWinner === a ? b : a)} pour l'autre). Plus accessible quand on débute.`
      : `Score beginner-friendly ${beginnerWinner.kind === "top10" ? `${beginnerWinner.beginnerFriendly}/5` : "n/a"} et ${beginnerWinner.whereToBuy.length} plateformes FR.`;

  // 3. Choix expérimenté : volatilité + use case sophistiqué
  const riskier = (riskOrder[riskA] ?? 0) >= (riskOrder[riskB] ?? 0) ? a : b;
  const expReason = `Risque ${riskOf(riskier)} = volatilité supérieure mais potentiel de gains/pertes asymétrique. Cas d'usage "${riskier.tagline.toLowerCase()}" demande de comprendre la thèse avant d'investir.`;

  // 4. Long terme : ancienneté = anti-fragilité (Lindy effect)
  const longTermReason = `${elder.name} a ${elder.yearCreated} ans d'historique vs ${younger.yearCreated} pour ${younger.name}. Effet Lindy : plus une crypto survit, plus son espérance de survie future augmente. ${riskOf(elder)} de risque actuel.`;

  return {
    conclusion,
    beginnerChoice: { winner: beginnerWinner, reason: beginnerReason },
    experimentedChoice: { winner: riskier, reason: expReason },
    longTermChoice: { winner: elder, reason: longTermReason },
  };
}

/**
 * BATCH 58 — Forces uniques de chaque crypto (3 points par crypto).
 * Genere depuis les data MDX (top10 ou hidden-gems).
 */
function buildStrengths(c: AnyCrypto): string[] {
  if (c.kind === "top10") {
    return c.strengths.slice(0, 3);
  }
  // Hidden gem : derive depuis tagline + reliability + use case
  const out: string[] = [];
  if (c.reliability.score >= 8) {
    out.push(`Score fiabilité ${c.reliability.score.toFixed(1)}/10 (équipe identifiée + audits).`);
  } else if (c.reliability.score >= 7) {
    out.push(`Score fiabilité correct ${c.reliability.score.toFixed(1)}/10 — ${c.reliability.yearsActive} années d'activité.`);
  }
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
  const common = a.whereToBuy.filter((p) => b.whereToBuy.includes(p));

  return [
    {
      q: `Faut-il choisir ${a.name} ou ${b.name} en 2026 ?`,
      ans: `Aucune des deux n'est meilleure dans l'absolu : ${a.name} (${a.symbol}) cible "${a.tagline.toLowerCase()}" ; ${b.name} (${b.symbol}) cible "${b.tagline.toLowerCase()}". Le bon arbitrage dépend de ton objectif (long terme, paiement, DeFi, NFT…) et de ta tolérance au risque (${riskOf(a)} pour ${a.name}, ${riskOf(b)} pour ${b.name}). Cryptoreflex publie sa méthodologie : aucun signal d'achat n'est donné — c'est à toi de trancher avec ces éléments factuels.`,
    },
    {
      q: `Quelle plateforme pour acheter ${a.name} et ${b.name} en France ?`,
      ans:
        common.length > 0
          ? `Plateformes régulées MiCA disponibles pour les deux : ${common.join(", ")}. Choisir une seule plateforme commune simplifie la fiscalité (un seul export Cerfa 2086) et le suivi de portefeuille.`
          : `Aucune plateforme MiCA ne propose simultanément ${a.symbol} et ${b.symbol} dans notre base. Pour ${a.name} : ${a.whereToBuy.slice(0, 3).join(", ")}. Pour ${b.name} : ${b.whereToBuy.slice(0, 3).join(", ")}.`,
    },
    {
      q: `Quels sont les risques majeurs de ${a.name} et ${b.name} ?`,
      ans: `Pour ${a.name} (niveau de risque ${riskOf(a)}) : ${
        a.kind === "top10"
          ? a.weaknesses.slice(0, 2).join(" ; ")
          : a.risks.slice(0, 2).join(" ; ")
      }. Pour ${b.name} (niveau de risque ${riskOf(b)}) : ${
        b.kind === "top10"
          ? b.weaknesses.slice(0, 2).join(" ; ")
          : b.risks.slice(0, 2).join(" ; ")
      }. Volatilité élevée et risque de perte en capital pour les deux — sizer raisonnablement.`,
    },
    {
      q: `${a.name} et ${b.name} sont-ils conformes MiCA ?`,
      ans: `MiCA s'applique aux PRESTATAIRES (CASP/PSAN) et non aux cryptos elles-mêmes. ${a.name} et ${b.name} sont disponibles sur des plateformes agréées MiCA en France (${a.whereToBuy.length} plateformes pour ${a.name}, ${b.whereToBuy.length} pour ${b.name}). Vérifiez le statut MiCA via notre /outils/verificateur-mica avant de déposer des fonds.`,
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

  // 2. Live data CoinGecko (cached 5min via fetchCoinDetail) + corrélation 1h.
  const [detailA, detailB, correlation] = await Promise.all([
    fetchCoinDetail(a.coingeckoId),
    fetchCoinDetail(b.coingeckoId),
    getPairCorrelation7d(a.coingeckoId, b.coingeckoId),
  ]);

  // 3. Decentralization scores (statiques, peuvent être null).
  const decentA = getDecentralizationScore(a.id);
  const decentB = getDecentralizationScore(b.id);

  // 4. Plateformes communes (intersection brute des labels whereToBuy).
  const commonPlatforms = a.whereToBuy.filter((p) => b.whereToBuy.includes(p));

  // 5. Différences + FAQ + verdict editorial unique
  const keyDiffs = buildKeyDifferences(a, b);
  const faq = buildFaq(a, b);
  const verdict = buildVerdict(a, b);
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
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Comparer", url: "/comparer" },
      { name: `${a.symbol} vs ${b.symbol}`, url: `/vs/${a.id}/${b.id}` },
    ]),
    faqSchema(faq.map((f) => ({ question: f.q, answer: f.ans }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData data={schemas} id={`comparer-pair-${slug.replace("/", "-")}`} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <Link href="/comparer" className="hover:text-fg">
            Comparer
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">
            {a.symbol} vs {b.symbol}
          </span>
        </nav>

        <header className="mt-6">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-fg">
            Comparatif {a.name} <span className="gradient-text">vs</span> {b.name} en 2026
          </h1>
          <p className="mt-3 text-base text-muted">
            Tableau side-by-side · données CoinGecko + méthodologie publique Cryptoreflex
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
                <Row
                  label="Année de création"
                  a={String(a.yearCreated)}
                  b={String(b.yearCreated)}
                  winner={a.yearCreated < b.yearCreated ? "a" : a.yearCreated > b.yearCreated ? "b" : null}
                />
                <Row label="Consensus" a={consensusOf(a)} b={consensusOf(b)} />
                <Row label="Niveau de risque" a={riskOf(a)} b={riskOf(b)} />
                <Row label="Beginner-friendly" a={beginnerScore(a)} b={beginnerScore(b)} />
                <Row
                  label="Score décentralisation"
                  a={decentA ? `${decentA.score.toFixed(1)}/10` : "—"}
                  b={decentB ? `${decentB.score.toFixed(1)}/10` : "—"}
                  winner={
                    decentA && decentB
                      ? decentA.score > decentB.score
                        ? "a"
                        : decentB.score > decentA.score
                          ? "b"
                          : null
                      : null
                  }
                />
                <Row
                  label="Disponibilité France"
                  a={`${a.whereToBuy.length} plateformes`}
                  b={`${b.whereToBuy.length} plateformes`}
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
            Plateformes communes pour acheter
          </h2>
          {commonPlatforms.length > 0 ? (
            <>
              <p className="mt-3 text-sm text-muted">
                {commonPlatforms.length} plateforme{commonPlatforms.length > 1 ? "s" : ""} listent à la fois
                {" "}
                {a.symbol} et {b.symbol} dans notre base éditoriale :
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
              Aucune plateforme commune dans notre base. Voir les fiches détaillées pour la liste complète.
            </p>
          )}
        </section>

        {/* BATCH 58 — Verdict editorial unique par paire (data-driven) */}
        <section className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-2xl font-bold text-fg flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            {a.name} ou {b.name} : sur quoi investir ?
          </h2>
          <p className="mt-3 text-base text-fg/85 leading-relaxed">
            {verdict.conclusion}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-primary-soft">
                Profil débutant
              </div>
              <div className="mt-1 text-lg font-bold text-fg">
                → {verdict.beginnerChoice.winner.name}
              </div>
              <p className="mt-2 text-xs text-fg/75 leading-relaxed">
                {verdict.beginnerChoice.reason}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-primary-soft">
                Profil expérimenté
              </div>
              <div className="mt-1 text-lg font-bold text-fg">
                → {verdict.experimentedChoice.winner.name}
              </div>
              <p className="mt-2 text-xs text-fg/75 leading-relaxed">
                {verdict.experimentedChoice.reason}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-primary-soft">
                Long terme (5-10 ans)
              </div>
              <div className="mt-1 text-lg font-bold text-fg">
                → {verdict.longTermChoice.winner.name}
              </div>
              <p className="mt-2 text-xs text-fg/75 leading-relaxed">
                {verdict.longTermChoice.reason}
              </p>
            </div>
          </div>
          <p className="mt-5 text-xs text-fg/60 leading-relaxed">
            ⚠️ Ces recommandations sont DÉRIVÉES des données factuelles (risque, ancienneté,
            disponibilité). Ce n'est PAS un conseil en investissement individualisé. Voir notre{" "}
            <Link href="/methodologie" className="underline font-semibold hover:text-primary-soft">
              méthodologie complète
            </Link>.
          </p>
        </section>

        {/* BATCH 58 — Forces uniques côte à côte (data MDX) */}
        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-accent-green/30 bg-accent-green/5 p-6">
            <h3 className="text-lg font-bold text-fg">
              Pourquoi choisir {a.name} ?
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
              Pourquoi choisir {b.name} ?
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

        {/* Corrélation 90j (en pratique : 7j sparkline horaire CoinGecko) */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Corrélation 7j</h2>
          <p className="mt-2 text-sm text-muted">
            Coefficient de Pearson calculé sur les sparklines horaires CoinGecko des 7
            derniers jours (168 points). Une corrélation forte signifie que les deux
            cryptos bougent ensemble — utile pour évaluer la diversification réelle
            d'un portefeuille.
          </p>
          <div className="mt-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
            {correlation !== null ? (
              <>
                <div className="text-3xl font-extrabold text-fg">
                  {correlation.toFixed(2)}
                </div>
                <div className="mt-1 text-sm text-fg/80">{describeCorrelation(correlation)}</div>
                <div className="mt-3 text-xs text-muted">
                  Échelle : -1 (mouvements opposés) → 0 (indépendantes) → +1 (mouvements
                  synchronisés). Cache 1h, source CoinGecko.
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">
                Donnée non disponible (sparkline incomplète ou API CoinGecko en rate-limit).
                Réessayez dans quelques minutes.
              </p>
            )}
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

        {/* Cross-link : autres comparaisons depuis l'une des deux cryptos */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Autres comparatifs</h2>
          <p className="mt-2 text-sm text-muted">
            Compare {a.name} ou {b.name} avec d'autres top 30 :
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {TOP_30_CRYPTO_IDS.filter((id) => id !== a.id && id !== b.id)
              .slice(0, 8)
              .map((other) => {
                // Construit l'URL canonique a/b avec other.
                const [x, y] = [a.id, other].sort();
                return (
                  <Link
                    key={`a-${other}`}
                    href={`/vs/${x}/${y}`}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg/85 hover:border-primary/40 hover:text-primary-soft"
                  >
                    {a.symbol} vs {other.toUpperCase()}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                );
              })}
          </div>
        </section>

        <div className="mt-12">
          <AmfDisclaimer variant="educatif" />
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
        Quand choisir {crypto.name}
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
