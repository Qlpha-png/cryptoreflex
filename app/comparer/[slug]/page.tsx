/**
 * /comparer/[slug] — REDIRECT 301 vers /vs/[a]/[b] (BATCH 59 consolidation SEO).
 *
 * Avant (BATCH 1-58) : page complete avec contenu unique, 105 paires top 15.
 * Maintenant (BATCH 59) : redirect 301 vers /vs/[a]/[b] qui a le contenu enrichi
 * (verdict 3 profils debutant/experimente/long terme, forces uniques, plateformes
 * communes intersection, correlation 7j live, FAQ contextuelle).
 *
 * Pourquoi le redirect plutot que le keep ? Eviter duplicate content entre
 * 2 URLs avec le meme intent (BTC vs ETH). Google penalise ou choisit
 * arbitrairement la version a indexer. Le 301 consolide les signaux SEO
 * (PageRank, backlinks externes) sur /vs/.
 *
 * Format slug : `${a}-vs-${b}` ordonne lexicographiquement.
 * URL canonique cible : /vs/${a}/${b} avec a < b.
 *
 * Pre-build : top 15 cryptos = 105 paires (= les memes que /vs/ pre-build).
 * Le visiteur sur ces URLs hit immediatement le 301. Les 4845 autres paires :
 * ISR 1h, mais le redirect est si leger que le SSR est negligeable.
 */

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getCryptoComparison,
  getAllCryptoComparisonSlugs,
} from "@/lib/crypto-comparisons";
import { BRAND } from "@/lib/brand";

export const revalidate = 3600;
export const dynamicParams = true;

interface Props {
  params: { slug: string };
}

// Top 15 IDs canoniques. Pre-build pour les paires les plus searchees FR.
// Les 4845 autres paires sont SSR au 1er hit (= juste le redirect 301).
const PRE_BUILD_TOP_IDS = [
  "bitcoin", "ethereum", "bnb", "xrp", "solana", "cardano", "dogecoin",
  "tron", "avalanche", "chainlink", "polkadot", "cosmos", "polygon",
  "litecoin", "near-protocol",
];

export function generateStaticParams() {
  return getAllCryptoComparisonSlugs()
    .filter((slug) => {
      const m = /^([a-z0-9-]+)-vs-([a-z0-9-]+)$/.exec(slug);
      if (!m) return false;
      return PRE_BUILD_TOP_IDS.includes(m[1]) && PRE_BUILD_TOP_IDS.includes(m[2]);
    })
    .map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const data = getCryptoComparison(params.slug);
  if (!data) return { robots: { index: false, follow: false } };
  const { a, b } = data;
  const [vsA, vsB] = [a.id, b.id].sort();
  // Canonical pointe directement sur l'URL cible /vs/[a]/[b] pour signaler
  // a Google que c'est l'URL preferee (au cas ou un crawler ignore le 301).
  return {
    robots: { index: false, follow: true },
    alternates: { canonical: `${BRAND.url}/vs/${vsA}/${vsB}` },
  };
}

export default function CryptoComparerLegacyRedirectPage({ params }: Props) {
  const data = getCryptoComparison(params.slug);
  if (!data) notFound();
  const { a, b } = data;
  const [vsA, vsB] = [a.id, b.id].sort();
  redirect(`/vs/${vsA}/${vsB}`);
}
