import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { CryptoFicheRow } from "@/lib/cryptos-db";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import {
  articleSchema,
  breadcrumbSchema,
  cryptoFinancialProductSchema,
  graphSchema,
} from "@/lib/schema";

/**
 * LLMFicheView — render minimaliste mais complet d'une fiche T3 LLM-generated
 * stockée en DB Supabase (`cryptos.llm_content`).
 *
 * Phase 1 scaling : utilisé par `app/cryptos/[slug]/page.tsx` en fallback
 * quand le slug n'est pas dans top-cryptos.json + hidden-gems.json (= 100
 * fiches éditoriales legacy). Sert ~680 fiches scaling rank 50-790.
 *
 * Distinct du layout legacy (1100 lignes de polish UX). Si on veut polish
 * ces fiches plus tard, étendre ce component (ajout charts, on-chain, etc.).
 */

interface LLMContent {
  tldr?: string;
  thesis?: string;
  howItWorks?: string;
  tokenomics?: string;
  metrics?: {
    narrative?: string;
    keyFigures?: Array<{ label: string; value: string }>;
  };
  scores?: {
    decentralization?: { score: number; rationale: string };
    complianceFrEu?: { score: number; rationale: string };
    technicalMaturity?: { score: number; rationale: string };
    communityHealth?: { score: number; rationale: string };
    overall?: { score: number; rationale: string };
  };
  competitors?: Array<{ coingeckoId: string; name: string; differentiator: string }>;
  moats?: Array<{ type: string; description: string }>;
  risks?: Array<{ category: string; severity: string; description: string }>;
  frEuStatus?: string;
  furtherReading?: Array<{ type: string; title: string; url_or_slug: string }>;
  recentNews?: string;
  disclaimer?: string;
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Md $`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M $`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} k $`;
  return `${n.toFixed(2)} $`;
}

const SCORE_LABELS: Record<string, string> = {
  decentralization: "Décentralisation",
  complianceFrEu: "Conformité FR/UE",
  technicalMaturity: "Maturité technique",
  communityHealth: "Santé communautaire",
  overall: "Score global",
};

export function LLMFicheView({ fiche }: { fiche: CryptoFicheRow }) {
  const llm = (fiche.llm_content || {}) as LLMContent;
  const pageUrl = `${BRAND.url}/cryptos/${fiche.coingecko_id}`;

  // BUG G fix (2026-05-09) — homogénéise le JSON-LD avec les fiches
  // éditoriales /cryptos/[slug] (Bitcoin & co.) qui exposent
  // Article + FinancialProduct + Breadcrumb. Avant : seulement
  // Organization + WebSite (layout) + Breadcrumb → Google ne pouvait pas
  // surfacer de rich snippet "cryptoactif" sur les ~680 fiches LLM.
  const description =
    llm.tldr?.slice(0, 200) ||
    `Analyse Cryptoreflex de ${fiche.name} (${fiche.symbol}) : tokenomics, scores, risques, statut FR/UE.`;
  const yearCreated = fiche.genesis_date
    ? new Date(fiche.genesis_date).getFullYear()
    : undefined;
  const externalSameAs: string[] = [
    `https://www.coingecko.com/en/coins/${fiche.coingecko_id}`,
    ...(fiche.homepage_url ? [fiche.homepage_url] : []),
  ];
  const schemas = graphSchema([
    articleSchema({
      slug: `cryptos/${fiche.coingecko_id}`,
      title: `${fiche.name} (${fiche.symbol}) — fiche complète Cryptoreflex`,
      description,
      date: fiche.published_at ?? fiche.last_refreshed_at,
      dateModified: fiche.last_refreshed_at,
      category: fiche.categories?.[0] ?? "Crypto",
      tags: [fiche.name, fiche.symbol, "crypto", ...(fiche.categories ?? [])],
      cover: `/cryptos/${fiche.coingecko_id}/opengraph-image`,
    }),
    cryptoFinancialProductSchema({
      slug: fiche.coingecko_id,
      name: fiche.name,
      symbol: fiche.symbol,
      description,
      category: fiche.categories?.[0] ?? "Cryptocurrency",
      yearCreated,
      sameAs: externalSameAs,
    }),
    breadcrumbSchema([
      { name: "Accueil", url: BRAND.url },
      { name: "Cryptos", url: `${BRAND.url}/cryptos` },
      { name: fiche.name, url: pageUrl },
    ]),
  ]);

  return (
    <article className="container mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">
          Accueil
        </Link>
        {" › "}
        <Link href="/cryptos" className="hover:underline">
          Cryptos
        </Link>
        {" › "}
        <span>{fiche.name}</span>
      </nav>

      {/* Hero */}
      <header className="mb-8">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-3xl sm:text-4xl font-bold">{fiche.name}</h1>
          <span className="text-xl text-muted-foreground">{fiche.symbol}</span>
          {fiche.market_cap_rank ? (
            <span className="rounded-full border bg-card px-2 py-0.5 text-xs">
              Rank {fiche.market_cap_rank}
            </span>
          ) : null}
        </div>
        {llm.tldr ? (
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{llm.tldr}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {fiche.market_cap_usd ? (
            <span>
              📊 Market cap : <strong>{formatNumber(fiche.market_cap_usd)}</strong>
            </span>
          ) : null}
          {fiche.price_usd ? (
            <span>
              💰 Prix : <strong>{formatNumber(fiche.price_usd)}</strong>
            </span>
          ) : null}
          {fiche.genesis_date ? (
            <span>
              🗓️ Né en : <strong>{new Date(fiche.genesis_date).getFullYear()}</strong>
            </span>
          ) : null}
        </div>
      </header>

      {/* Thesis */}
      {llm.thesis ? (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">L&apos;idée en une thèse</h2>
          <p className="leading-relaxed whitespace-pre-line">{llm.thesis}</p>
        </section>
      ) : null}

      {/* How it works */}
      {llm.howItWorks ? (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Comment ça marche</h2>
          <p className="leading-relaxed whitespace-pre-line">{llm.howItWorks}</p>
        </section>
      ) : null}

      {/* Tokenomics */}
      {llm.tokenomics ? (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Tokenomics</h2>
          <p className="leading-relaxed whitespace-pre-line">{llm.tokenomics}</p>
        </section>
      ) : null}

      {/* Metrics */}
      {llm.metrics?.narrative ? (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Métriques clés</h2>
          <p className="leading-relaxed whitespace-pre-line mb-4">{llm.metrics.narrative}</p>
          {llm.metrics.keyFigures && llm.metrics.keyFigures.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {llm.metrics.keyFigures.map((kf, i) => (
                <div key={i} className="rounded-xl border bg-card p-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {kf.label}
                  </div>
                  <div className="mt-1 text-lg font-semibold">{kf.value}</div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Scores Cryptoreflex */}
      {llm.scores ? (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Scores Cryptoreflex</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(llm.scores).map(([key, val]) => {
              if (!val || typeof val.score !== "number") return null;
              return (
                <div key={key} className="rounded-xl border bg-card p-4">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-medium">
                      {SCORE_LABELS[key] || key}
                    </span>
                    <span className="text-lg font-bold">{val.score}/100</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {val.rationale}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Risks */}
      {llm.risks && llm.risks.length > 0 ? (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Risques à connaître</h2>
          <ul className="space-y-3">
            {llm.risks.map((r, i) => (
              <li
                key={i}
                className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-semibold">{r.category}</span>
                  <span className="text-xs uppercase tracking-wider">{r.severity}</span>
                </div>
                <p className="text-sm leading-snug">{r.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Compétiteurs */}
      {llm.competitors && llm.competitors.length > 0 ? (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Concurrents directs</h2>
          <ul className="space-y-2">
            {llm.competitors.map((cp, i) => (
              <li key={i} className="rounded-xl border bg-card p-4">
                <div className="font-medium">
                  {cp.coingeckoId ? (
                    <Link
                      href={`/cryptos/${cp.coingeckoId}`}
                      className="hover:underline"
                    >
                      {cp.name}
                    </Link>
                  ) : (
                    cp.name
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{cp.differentiator}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Statut FR/UE */}
      {llm.frEuStatus ? (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Statut FR/UE &amp; fiscalité</h2>
          <p className="leading-relaxed whitespace-pre-line">{llm.frEuStatus}</p>
        </section>
      ) : null}

      {/* Recent news */}
      {llm.recentNews ? (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Actualité récente</h2>
          <p className="leading-relaxed whitespace-pre-line">{llm.recentNews}</p>
        </section>
      ) : null}

      {/* Liens utiles */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Liens utiles</h2>
        <ul className="space-y-2 text-sm">
          {fiche.homepage_url ? (
            <li>
              <ExternalLink className="size-4 inline mr-1" />
              <a
                href={fiche.homepage_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="hover:underline"
              >
                Site officiel
              </a>
            </li>
          ) : null}
          {fiche.whitepaper_url ? (
            <li>
              <ExternalLink className="size-4 inline mr-1" />
              <a
                href={fiche.whitepaper_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="hover:underline"
              >
                Whitepaper
              </a>
            </li>
          ) : null}
          {(fiche.github_repos || []).slice(0, 1).map((repo, i) => (
            <li key={i}>
              <ExternalLink className="size-4 inline mr-1" />
              <a
                href={repo}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="hover:underline"
              >
                Code GitHub
              </a>
            </li>
          ))}
          {fiche.twitter_handle ? (
            <li>
              <ExternalLink className="size-4 inline mr-1" />
              <a
                href={`https://twitter.com/${fiche.twitter_handle}`}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="hover:underline"
              >
                @{fiche.twitter_handle}
              </a>
            </li>
          ) : null}
        </ul>
      </section>

      {/* Disclaimer */}
      {llm.disclaimer ? (
        <aside className="mt-12 rounded-xl border bg-muted/20 p-4 text-xs text-muted-foreground leading-relaxed">
          <strong className="block mb-1">Avertissement</strong>
          {llm.disclaimer}
        </aside>
      ) : null}

      {/* AMF disclaimer (cohérent avec les autres pages) */}
      <div className="mt-6">
        <AmfDisclaimer variant="speculation" />
      </div>

      {/* Structured data — Article + FinancialProduct + Breadcrumb (BUG G fix) */}
      <StructuredData data={schemas} id={`crypto-llm-${fiche.coingecko_id}`} />
    </article>
  );
}
