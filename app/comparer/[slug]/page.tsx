/**
 * /comparer/[slug] — Programmatic SEO crypto-vs-crypto.
 *
 * Format slug : `bitcoin-vs-ethereum` (ordre alphabétique canonique).
 * Couvre 105 paires (top 15 × top 14 / 2).
 *
 * Différencié de :
 *   - /comparatif/[slug]      → plateformes (Coinbase vs Binance)
 *   - /cryptos/comparer?ids=  → dynamique custom (noindex)
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Trophy,
  Users,
  Shield,
} from "lucide-react";

import {
  getCryptoComparison,
  getAllCryptoComparisonSlugs,
  pickWinner,
} from "@/lib/crypto-comparisons";
import type { AnyCrypto } from "@/lib/cryptos";
import { BRAND } from "@/lib/brand";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  graphSchema,
} from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import AmfDisclaimer from "@/components/AmfDisclaimer";
// FIX SEO 2026-05-02 #7 (audit interne) — sortir 1300 pages programmatic de
// l'orphelinat. Ajout du maillage interne sur les 4 templates programmatic
// (comparer, acheter, convertisseur, staking) qui n'avaient ni
// RelatedPagesNav ni NextStepsGuide → link juice dispersé sur 70% du sitemap.
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";

export const revalidate = 3600;
export const dynamicParams = false;

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return getAllCryptoComparisonSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const data = getCryptoComparison(params.slug);
  if (!data) return {};
  const { a, b } = data;
  const title = `${a.name} (${a.symbol}) vs ${b.name} (${b.symbol}) — Comparatif crypto 2026`;
  const description = `${a.name} ou ${b.name} ? Comparatif détaillé : ancienneté, cas d'usage, écosystème, risques, et où acheter en France sur plateformes régulées MiCA. Méthodologie publique Cryptoreflex.`;
  return {
    title,
    description,
    alternates: { canonical: `${BRAND.url}/comparer/${params.slug}` },
    openGraph: {
      title,
      description,
      url: `${BRAND.url}/comparer/${params.slug}`,
      type: "article",
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers texte                                                             */
/* -------------------------------------------------------------------------- */

function buildIntro(a: AnyCrypto, b: AnyCrypto): string {
  const ageGap = Math.abs(a.yearCreated - b.yearCreated);
  const elder = a.yearCreated < b.yearCreated ? a : b;
  const younger = a.yearCreated < b.yearCreated ? b : a;
  return `Choisir entre ${a.name} (${a.symbol}) et ${b.name} (${b.symbol}) ? Ces deux cryptos couvrent des cas d'usage souvent différents : ${a.tagline.toLowerCase()} pour ${a.name}, et ${b.tagline.toLowerCase()} pour ${b.name}. ${elder.name} bénéficie de ${ageGap} an${ageGap > 1 ? "s" : ""} d'antériorité (${elder.yearCreated} vs ${younger.yearCreated}), mais ${younger.name} apporte des choix techniques plus récents. Ce comparatif analyse les deux sur des critères factuels — pas de prix targets ni de signal d'achat (Cryptoreflex n'est pas PSAN agréé).`;
}

function buildVerdict(a: AnyCrypto, b: AnyCrypto): string {
  const oldestWinner = pickWinner(a, b, "ancienneté");
  const beginnerWinner = pickWinner(a, b, "beginnerFriendly");
  const reliabilityWinner = pickWinner(a, b, "fiabilité");

  const parts: string[] = [];

  if (oldestWinner === a.id) {
    parts.push(`${a.name} est plus ancien (${a.yearCreated})`);
  } else {
    parts.push(`${b.name} est plus ancien (${b.yearCreated})`);
  }

  if (beginnerWinner) {
    const winner = beginnerWinner === a.id ? a : b;
    if (winner.kind === "top10") {
      parts.push(`${winner.name} est plus accessible aux débutants (${winner.beginnerFriendly}/5)`);
    }
  }

  if (reliabilityWinner) {
    const winner = reliabilityWinner === a.id ? a : b;
    if (winner.kind === "hidden-gem") {
      parts.push(`${winner.name} obtient un meilleur score de fiabilité Cryptoreflex (${winner.reliability.score}/10)`);
    }
  }

  return `${parts.join(" · ")}. Le bon choix dépend surtout de ton cas d'usage : ${a.useCase.split(",")[0].trim()} pour ${a.name}, ou ${b.useCase.split(",")[0].trim()} pour ${b.name}. Aucune des deux n'est "meilleure" dans l'absolu — la vraie question, c'est : à quoi vas-tu t'en servir ?`;
}

function buildFaq(a: AnyCrypto, b: AnyCrypto): { q: string; ans: string }[] {
  return [
    {
      q: `${a.name} ou ${b.name} : lequel est le meilleur en 2026 ?`,
      ans: `Aucune des deux n'est meilleure dans l'absolu — elles couvrent des cas d'usage différents. ${a.name} est positionné sur "${a.tagline.toLowerCase()}" tandis que ${b.name} cible "${b.tagline.toLowerCase()}". Le bon choix dépend de ton objectif : long terme, paiement, DeFi, NFT, etc.`,
    },
    {
      q: `Quelle est la différence principale entre ${a.symbol} et ${b.symbol} ?`,
      ans: `${a.name} : ${a.what.split(".")[0]}. ${b.name} : ${b.what.split(".")[0]}. Les deux peuvent cohabiter dans un portefeuille diversifié.`,
    },
    {
      q: `Où acheter ${a.name} et ${b.name} en France en 2026 ?`,
      ans: `Plateformes régulées MiCA en commun : ${a.whereToBuy.filter((p) => b.whereToBuy.includes(p)).join(", ") || "voir les fiches détaillées"}. Sinon ${a.name} : ${a.whereToBuy.slice(0, 3).join(", ")} ; ${b.name} : ${b.whereToBuy.slice(0, 3).join(", ")}.`,
    },
    {
      q: `Faut-il choisir l'un ou l'autre ou les deux ?`,
      ans: `La diversification est généralement préférée à la concentration. Si ton portefeuille crypto est < 5 lignes, garder ${a.name} ET ${b.name} peut faire sens si tes thèses d'investissement sont distinctes. Sizer raisonnablement (1-5 % du patrimoine financier total selon profil de risque).`,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function CryptoComparisonPage({ params }: Props) {
  const data = getCryptoComparison(params.slug);
  if (!data) notFound();
  const { a, b } = data;

  const intro = buildIntro(a, b);
  const verdict = buildVerdict(a, b);
  const faq = buildFaq(a, b);

  const schemas = graphSchema([
    articleSchema({
      slug: `comparer/${params.slug}`,
      title: `${a.name} vs ${b.name} — Comparatif crypto 2026`,
      description: intro,
      date: "2026-04-25",
      dateModified: "2026-04-25",
      category: "Comparatif",
      tags: [a.name, b.name, a.symbol, b.symbol, "comparatif"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Comparer", url: "/comparer" },
      { name: `${a.symbol} vs ${b.symbol}`, url: `/comparer/${params.slug}` },
    ]),
    faqSchema(faq.map((item) => ({ question: item.q, answer: item.ans }))),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData data={schemas} id={`comparer-${params.slug}`} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/cryptos" className="hover:text-fg">Cryptos</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">{a.symbol} vs {b.symbol}</span>
        </nav>

        <header className="mt-6">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-fg">
            {a.name} <span className="gradient-text">vs</span> {b.name}
          </h1>
          <p className="mt-3 text-base text-muted">
            Comparatif factuel · Pas de signal d&apos;achat · Méthodologie publique
          </p>
        </header>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <p className="text-base text-fg/85 leading-relaxed">{intro}</p>
        </div>

        {/* Tableau side-by-side */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Tableau comparatif</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-3 py-2">Critère</th>
                  <th className="px-3 py-2">
                    <Link href={`/cryptos/${a.id}`} className="text-fg hover:text-primary">
                      {a.name}
                    </Link>
                  </th>
                  <th className="px-3 py-2">
                    <Link href={`/cryptos/${b.id}`} className="text-fg hover:text-primary">
                      {b.name}
                    </Link>
                  </th>
                </tr>
              </thead>
              <tbody className="text-fg/85">
                <Row label="Symbole" a={a.symbol} b={b.symbol} />
                <Row label="Année de création" a={String(a.yearCreated)} b={String(b.yearCreated)} winner={pickWinner(a, b, "ancienneté") === a.id ? "a" : "b"} />
                <Row label="Catégorie" a={a.category} b={b.category} />
                <Row label="Tagline" a={a.tagline} b={b.tagline} />
                <Row
                  label="Type"
                  a={a.kind === "top10" ? `Top ${a.rank} mondial` : "Hidden Gem"}
                  b={b.kind === "top10" ? `Top ${b.rank} mondial` : "Hidden Gem"}
                />
                {a.kind === "top10" && b.kind === "top10" && (
                  <>
                    <Row
                      label="Beginner-friendly"
                      a={`${a.beginnerFriendly}/5`}
                      b={`${b.beginnerFriendly}/5`}
                      winner={pickWinner(a, b, "beginnerFriendly") === a.id ? "a" : pickWinner(a, b, "beginnerFriendly") === b.id ? "b" : null}
                    />
                    <Row label="Risque" a={a.riskLevel} b={b.riskLevel} />
                    <Row label="Consensus" a={a.consensus} b={b.consensus} />
                    <Row label="Block time" a={a.blockTime} b={b.blockTime} />
                    <Row label="Supply max" a={a.maxSupply} b={b.maxSupply} />
                  </>
                )}
                <Row
                  label="Disponibilité France"
                  a={a.whereToBuy.length + " plateformes"}
                  b={b.whereToBuy.length + " plateformes"}
                />
              </tbody>
            </table>
          </div>
        </section>

        {/* Cas d'usage */}
        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="text-lg font-bold text-fg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Quand choisir {a.name}
            </h3>
            <p className="mt-3 text-sm text-fg/85 leading-relaxed">
              {a.useCase}
            </p>
            <Link
              href={`/cryptos/${a.id}`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft hover:text-primary"
            >
              Voir la fiche complète {a.name}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="text-lg font-bold text-fg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Quand choisir {b.name}
            </h3>
            <p className="mt-3 text-sm text-fg/85 leading-relaxed">
              {b.useCase}
            </p>
            <Link
              href={`/cryptos/${b.id}`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft hover:text-primary"
            >
              Voir la fiche complète {b.name}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* Verdict éditorial */}
        <section className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-2xl font-bold text-fg flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Verdict Cryptoreflex
          </h2>
          <p className="mt-3 text-base text-fg/85 leading-relaxed">{verdict}</p>
        </section>

        {/* Où acheter */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Où acheter en France ?</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <PlatformsCard crypto={a} />
            <PlatformsCard crypto={b} />
          </div>
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
                <summary className="cursor-pointer font-semibold text-fg">
                  {item.q}
                </summary>
                <p className="mt-3 text-sm text-fg/80 leading-relaxed">{item.ans}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-12">
          <AmfDisclaimer variant="educatif" />
        </div>

        {/* FIX SEO 2026-05-02 #7 — RelatedPages contextuelles (cluster
            crypto-comparer) + NextStepsGuide pour ne plus terminer en
            cul-de-sac. Avant : 435 paires programmatic toutes orphelines. */}
        <div className="mt-12">
          <RelatedPagesNav
            currentPath={`/comparer/${data.slug}`}
            variant="default"
            limit={6}
          />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="comparator" />
        </div>
      </div>
    </article>
  );
}

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
      <td className={`px-3 py-2 ${winner === "a" ? "bg-accent-green/10 font-semibold text-accent-green" : "bg-elevated/30"}`}>
        {a}
        {winner === "a" && <CheckCircle2 className="inline h-3.5 w-3.5 ml-1.5" />}
      </td>
      <td className={`px-3 py-2 rounded-r-lg ${winner === "b" ? "bg-accent-green/10 font-semibold text-accent-green" : "bg-elevated/30"}`}>
        {b}
        {winner === "b" && <CheckCircle2 className="inline h-3.5 w-3.5 ml-1.5" />}
      </td>
    </tr>
  );
}

function PlatformsCard({ crypto }: { crypto: AnyCrypto }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="text-base font-bold text-fg">
        {crypto.name} ({crypto.symbol})
      </h3>
      <p className="mt-2 text-xs text-muted">
        {crypto.whereToBuy.length} plateformes régulées MiCA :
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {crypto.whereToBuy.slice(0, 6).map((p) => (
          <li
            key={p}
            className="inline-flex items-center rounded-full border border-border bg-elevated px-2 py-0.5 text-[11px] text-fg/85"
          >
            {p}
          </li>
        ))}
      </ul>
      <Link
        href={`/cryptos/${crypto.id}`}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-soft hover:text-primary"
      >
        Fiche complète {crypto.name}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
