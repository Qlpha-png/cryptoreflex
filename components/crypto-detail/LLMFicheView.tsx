import { avecTypoSync } from "@/components/ui/Typo";
import Link from "next/link";
// FIX C cohérence (2026-05-09) — remplace les emojis 📊/💰/🗓️ par les icônes
// Lucide pour aligner les fiches LLM sur le design system du reste du site
// (les fiches statiques /cryptos/* utilisent déjà BarChart3/Coins/Calendar).
import { ExternalLink, Calendar, Bot } from "lucide-react";
import CoursFiche from "@/components/crypto-detail/CoursFiche";
import { COURS_AGE_MAX_H, etatCours, releveDuCours } from "@/lib/cours-fiche";
import { nettoyerContenuLlm } from "@/lib/fiche-llm-texte";
import { lienVivant } from "@/lib/liens-morts";

import type { CryptoFicheRow } from "@/lib/cryptos-db";
import { BRAND } from "@/lib/brand";
import { resolveCoingeckoId } from "@/lib/crypto-aliases";
import { linkableCryptoPath } from "@/lib/crypto-links";
import { corrigerAccentsProfond } from "@/lib/fr-accents";
import StructuredData from "@/components/StructuredData";
import Breadcrumbs from "@/components/Breadcrumbs";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import ReflexCardPromo from "@/components/crypto-detail/ReflexCardPromo";
import {
  articleSchema,
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
  if (n == null || !Number.isFinite(n)) return "—";
  const fr = (x: number, d: number) =>
    x.toLocaleString("fr-FR", { maximumFractionDigits: d });
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${fr(n / 1e9, 2)} Md $`;
  if (abs >= 1e6) return `${fr(n / 1e6, 1)} M $`;
  if (abs >= 1e3) return `${fr(n / 1e3, 0)} k $`;
  // Décimales adaptatives : un prix sub-cent ne s'affiche jamais « 0.00 $ ».
  const maxFrac = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 8;
  return `${fr(n, maxFrac)} $`;
}

/**
 * Prix d'une fiche (reprise Z3, M7) : jamais abrégé en « k $ » et 4 décimales sous 10 $ (1,0021 $ ne s'affiche plus
 * « 1 $ », 1 789,25 $ ne s'affiche plus « 2 k $ »).
 */
function formatPrix(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const maxFrac = abs >= 10 ? 2 : abs >= 0.01 ? 4 : 8;
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: maxFrac })} $`;
}

const SCORE_LABELS: Record<string, string> = {
  decentralization: "Décentralisation",
  complianceFrEu: "Conformité FR/UE",
  technicalMaturity: "Maturité technique",
  communityHealth: "Santé communautaire",
  overall: "Score global",
};

function LLMFicheViewBase({ fiche, knownIds }: { fiche: CryptoFicheRow; knownIds: ReadonlySet<string> }) {
  // texte généré par IA : accents manquants rétablis à l'affichage (lib/fr-accents.ts, audit du 05/10/2026)
  // 08/10/2026 (lot fraîcheur A2, L3 d) : les montants de marché du jour de la génération (prix, capitalisation, rang,
  // volume…) sont retirés du texte au rendu (lib/fiche-llm-texte.ts) ; les chiffres vivants sont dans <CoursFiche>.
  const llm = nettoyerContenuLlm(corrigerAccentsProfond((fiche.llm_content || {}) as LLMContent) as unknown as Record<string, unknown>) as LLMContent;
  // L3 a : cours masqué si le relevé du cours (price_updated_at, jamais updated_at seul) est trop ancien (lib/cours-fiche.ts)
  const cours = etatCours(releveDuCours(fiche), Date.now());
  const pageUrl = `${BRAND.url}/cryptos/${fiche.coingecko_id}`;
  // Lot Z3 : un lien sortant déclaré mort par le robot de nuit (lib/liens-morts.ts) est retiré jusqu'à guérison.
  const siteOfficiel = lienVivant(fiche.homepage_url);
  const whitepaper = lienVivant(fiche.whitepaper_url);
  const depotCode = (fiche.github_repos || []).map((r) => lienVivant(r)).find((r): r is string => !!r) ?? null;
  const compteX = fiche.twitter_handle ? lienVivant(`https://twitter.com/${fiche.twitter_handle}`) : null;

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
    ...(siteOfficiel ? [siteOfficiel] : []),
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
  ]);

  return (
    <article className="container mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <Breadcrumbs chemin={`/cryptos/${fiche.coingecko_id}`} label={fiche.name} className="mb-6" />

      {/* Hero */}
      <header className="mb-8">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-3xl sm:text-4xl font-bold">{fiche.name}</h1>
          <span className="text-xl text-muted-foreground">{fiche.symbol}</span>
        </div>
        {llm.tldr ? (
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{llm.tldr}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {/* Chiffres transmis au navigateur SEULEMENT si le relevé est récent : sinon ni le HTML ni les données de la
              page ne contiennent le prix, la capitalisation ou le rang. */}
          <CoursFiche
            releve={cours.releve}
            depuis={cours.depuis}
            ageMaxH={COURS_AGE_MAX_H}
            source={fiche.price_source ?? null}
            {...(cours.suivi
              ? {
                  prix: fiche.price_usd ? formatPrix(fiche.price_usd) : null,
                  capitalisation: fiche.market_cap_usd ? formatNumber(fiche.market_cap_usd) : null,
                  rang: fiche.market_cap_rank ?? null,
                }
              : {})}
          />
          {fiche.genesis_date ? (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4" aria-hidden="true" />
              Né en : <strong>{new Date(fiche.genesis_date).getFullYear()}</strong>
            </span>
          ) : null}
        </div>

        {/* Audit B (2026-05-31) — Transparence E-E-A-T : ces ~680 fiches sont
            générées automatiquement (sources publiques) et NON vérifiées une à
            une. On le signale clairement (à l'origine, 62 % des coingeckoId
            LLM étaient hallucinés) pour ne jamais tromper le lecteur. */}
        <p className="mt-5 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed text-amber-100/90">
          <Bot className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong>Fiche générée automatiquement</strong> à partir de sources publiques,
            non vérifiée éditorialement une à une. Des chiffres ou faits peuvent être inexacts :
            recoupez toujours avec les sources officielles (site du projet, CoinGecko) avant toute
            décision.
          </span>
        </p>
      </header>

      {/* Reflex Cards : bandeau compact en haut de fiche (demande Kev 02/10), masqué si le jeu est coupé ou sans carte */}
      <ReflexCardPromo coingeckoIds={[fiche.coingecko_id, resolveCoingeckoId(fiche.coingecko_id)]} className="mb-8" />

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
      {llm.metrics?.narrative || (llm.metrics?.keyFigures?.length ?? 0) > 0 ? (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Métriques clés</h2>
          {llm.metrics?.narrative ? (
            <p className="leading-relaxed whitespace-pre-line mb-4">{llm.metrics.narrative}</p>
          ) : null}
          {llm.metrics?.keyFigures && llm.metrics.keyFigures.length > 0 ? (
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
                className="rounded-xl border border-warning/30 bg-warning/5 p-4"
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
            {llm.competitors.map((cp, i) => {
              // Identifiants générés par IA souvent approximatifs : alias connus, puis lien SEULEMENT si la fiche est
              // publiée (lib/crypto-links.ts) ; sinon le nom seul. Audit 05/10/2026 : 214 liens menaient à une fiche
              // introuvable (200 + noindex).
              const href = linkableCryptoPath(cp.coingeckoId, knownIds);
              return (
                <li key={i} className="rounded-xl border bg-card p-4">
                  <div className="font-medium">
                    {href ? (
                      <Link
                        href={href}
                        className="hover:underline"
                      >
                        {cp.name}
                      </Link>
                    ) : (
                      <span>{cp.name}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{cp.differentiator}</p>
                </li>
              );
            })}
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
          {siteOfficiel ? (
            <li>
              <ExternalLink className="size-4 inline mr-1" />
              <a
                href={siteOfficiel}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="hover:underline"
              >
                Site officiel
              </a>
            </li>
          ) : null}
          {whitepaper ? (
            <li>
              <ExternalLink className="size-4 inline mr-1" />
              <a
                href={whitepaper}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="hover:underline"
              >
                Whitepaper
              </a>
            </li>
          ) : null}
          {(depotCode ? [depotCode] : []).map((repo, i) => (
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
          {compteX ? (
            <li>
              <ExternalLink className="size-4 inline mr-1" />
              <a
                href={compteX}
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

export const LLMFicheView = avecTypoSync(LLMFicheViewBase);
