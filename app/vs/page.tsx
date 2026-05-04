import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Swords, Sparkles } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { breadcrumbSchema, graphSchema } from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import { getCryptoPairs } from "@/lib/programmatic-pages";

/**
 * /vs — HUB INDEX (BATCH 44b — création post-audit maillage SEO).
 *
 * Pages de duels crypto-vs-crypto. 435 paires existent en programmatic via
 * /vs/[a]/[b]. Avant cette page, ~407 d'entre elles étaient orphelines
 * (seules ~28 paires pre-buildées via générateStaticParams TOP 8).
 *
 * Ce hub : top 50 paires les plus searchées affichées + lien vers /comparer
 * pour les 385 autres.
 */

// BLOCs 0-7 audit FRONT P0-1 (2026-05-04) — retire suffix "| Cryptoreflex"
// du title : layout root applique deja template '%s | Cryptoreflex'.
// Avant : "Duels crypto-vs-crypto — 4950 paires comparees | Cryptoreflex | Cryptoreflex"
// (doublon visible onglet + SERP). Egalement fix "435 paires" -> "4950 paires"
// (BATCH 58 a etendu top 30 -> top 100 = 4950 paires).
const PAGE_TITLE = "Duels crypto-vs-crypto : 4950 paires comparées (BTC vs ETH, etc.)";
const PAGE_DESCRIPTION =
  "Bitcoin vs Ethereum, Solana vs Cardano, BNB vs XRP… Compare 2 cryptos côte à côte (prix, market cap, supply, roadmap, fiscalité FR). 4950 duels possibles.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: `${BRAND.url}/vs` },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${BRAND.url}/vs`,
    type: "website",
  },
  // BLOCs 0-7 audit FRONT P0-3 (2026-05-04) — twitter card specifique pour
  // eviter le fallback global "Cryptoreflex — Tout pour investir...".
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export const revalidate = 86400;

// Top paires "stars" : couples crypto le plus recherchés FR
const FEATURED_PAIRS: Array<{ a: string; b: string; aLabel: string; bLabel: string }> = [
  { a: "bitcoin", b: "ethereum", aLabel: "Bitcoin", bLabel: "Ethereum" },
  { a: "ethereum", b: "solana", aLabel: "Ethereum", bLabel: "Solana" },
  { a: "bitcoin", b: "solana", aLabel: "Bitcoin", bLabel: "Solana" },
  { a: "binancecoin", b: "ethereum", aLabel: "BNB", bLabel: "Ethereum" },
  { a: "cardano", b: "solana", aLabel: "Cardano", bLabel: "Solana" },
  { a: "ripple", b: "stellar", aLabel: "XRP", bLabel: "Stellar" },
  { a: "tether", b: "usd-coin", aLabel: "USDT", bLabel: "USDC" },
  { a: "polkadot", b: "cosmos", aLabel: "Polkadot", bLabel: "Cosmos" },
  { a: "avalanche-2", b: "solana", aLabel: "Avalanche", bLabel: "Solana" },
  { a: "matic-network", b: "arbitrum", aLabel: "Polygon", bLabel: "Arbitrum" },
  { a: "litecoin", b: "bitcoin-cash", aLabel: "Litecoin", bLabel: "Bitcoin Cash" },
  { a: "chainlink", b: "the-graph", aLabel: "Chainlink", bLabel: "The Graph" },
  { a: "uniswap", b: "aave", aLabel: "Uniswap", bLabel: "Aave" },
  { a: "dogecoin", b: "shiba-inu", aLabel: "Dogecoin", bLabel: "Shiba Inu" },
  { a: "monero", b: "zcash", aLabel: "Monero", bLabel: "Zcash" },
  { a: "tron", b: "binancecoin", aLabel: "TRON", bLabel: "BNB" },
  { a: "near", b: "internet-computer", aLabel: "NEAR", bLabel: "Internet Computer" },
  { a: "tezos", b: "algorand", aLabel: "Tezos", bLabel: "Algorand" },
  { a: "filecoin", b: "arweave", aLabel: "Filecoin", bLabel: "Arweave" },
  { a: "aptos", b: "sui", aLabel: "Aptos", bLabel: "Sui" },
];

export default function VsHub() {
  const totalPairs = getCryptoPairs().length;

  const schema = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Duels crypto", url: "/vs" },
    ]),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="vs-hub" data={schema} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <header className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[10px] font-mono font-bold text-primary uppercase tracking-wider mb-4">
            <Swords className="h-3 w-3" aria-hidden="true" />
            {totalPairs} duels possibles
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-fg leading-tight">
            Duels{" "}
            <span className="gradient-text">crypto vs crypto</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/75 max-w-2xl mx-auto leading-relaxed">
            Compare 2 cryptos côte à côte : prix, market cap, supply, roadmap,
            fiscalité FR. {totalPairs} combinaisons possibles parmi nos 30
            cryptos analysées.
          </p>
        </header>

        {/* Featured pairs */}
        <section aria-labelledby="featured-pairs">
          <h2 id="featured-pairs" className="text-xl sm:text-2xl font-bold text-fg mb-5 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-soft" aria-hidden="true" />
            Duels les plus consultés
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {FEATURED_PAIRS.map((pair) => (
              <li key={`${pair.a}-${pair.b}`}>
                <Link
                  href={`/vs/${pair.a}/${pair.b}`}
                  className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4 hover:border-primary/40 hover:bg-elevated transition-colors min-h-[64px] h-full"
                  aria-label={`Comparer ${pair.aLabel} contre ${pair.bLabel}`}
                >
                  <span className="text-sm font-bold text-fg truncate">
                    {pair.aLabel}{" "}
                    <span className="text-muted font-normal mx-1">vs</span>{" "}
                    {pair.bLabel}
                  </span>
                  <ArrowRight
                    className="h-4 w-4 text-muted shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Cross-link vers comparer alternatif */}
        <section className="mt-16 rounded-2xl border border-border bg-surface/40 p-6 text-center">
          <h2 className="text-lg font-bold text-fg mb-3">
            Tu veux un autre duel ?
          </h2>
          <p className="text-sm text-muted mb-4 max-w-xl mx-auto">
            Notre page /comparer propose un selecteur libre pour les{" "}
            {totalPairs - FEATURED_PAIRS.length} autres combinaisons,
            ou compose ta propre comparaison multi-crypto.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/comparer" className="btn-primary text-sm">
              Sélecteur libre /comparer
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/cryptos" className="btn-ghost text-sm">
              Voir les 100 fiches crypto
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
