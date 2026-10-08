import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Swords, Sparkles } from "lucide-react";
import { BRAND, STATS, fmtCount } from "@/lib/brand";
import { graphSchema } from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import { getCryptoPairs } from "@/lib/programmatic-pages";
import { getAllCryptos } from "@/lib/cryptos";
import { withHreflang } from "@/lib/seo-alternates";
import { fitTitle } from "@/lib/seo-text";
import Breadcrumbs from "@/components/Breadcrumbs";

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
const PAGE_TITLE = `Duels crypto-vs-crypto : ${fmtCount(STATS.vsPairs)} paires comparées (BTC vs ETH, etc.)`;
const PAGE_DESCRIPTION =
  `Bitcoin vs Ethereum, Solana vs Cardano, BNB vs XRP… Comparez 2 cryptos côte à côte (prix, market cap, supply, roadmap, fiscalité FR). ${fmtCount(STATS.vsPairs)} duels possibles.`;

export const metadata: Metadata = {
  title: fitTitle(PAGE_TITLE),
  description: PAGE_DESCRIPTION,
  alternates: withHreflang(`${BRAND.url}/vs`),
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${BRAND.url}/vs`,
    type: "website",
    images: [{ url: `${BRAND.url}/og-image.png`, width: 1200, height: 630, alt: "Cryptoreflex" }],
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

// Top paires "stars" : couples crypto les plus recherchés FR.
// Identifiants = ceux du catalogue (xrp, bnb, avalanche, near-protocol, polygon…) et ordre canonique a < b,
// sinon le lien mène à une page absente (test : tests/vs-featured-pairs.test.ts).
const FEATURED_PAIRS: Array<{ a: string; b: string; aLabel: string; bLabel: string }> = [
  { a: "bitcoin", b: "ethereum", aLabel: "Bitcoin", bLabel: "Ethereum" },
  { a: "ethereum", b: "solana", aLabel: "Ethereum", bLabel: "Solana" },
  { a: "bitcoin", b: "solana", aLabel: "Bitcoin", bLabel: "Solana" },
  { a: "bnb", b: "ethereum", aLabel: "BNB", bLabel: "Ethereum" },
  { a: "cardano", b: "solana", aLabel: "Cardano", bLabel: "Solana" },
  { a: "stellar", b: "xrp", aLabel: "Stellar", bLabel: "XRP" },
  { a: "tether", b: "usd-coin", aLabel: "USDT", bLabel: "USDC" },
  { a: "cosmos", b: "polkadot", aLabel: "Cosmos", bLabel: "Polkadot" },
  { a: "avalanche", b: "solana", aLabel: "Avalanche", bLabel: "Solana" },
  { a: "arbitrum", b: "polygon", aLabel: "Arbitrum", bLabel: "Polygon" },
  { a: "bitcoin-cash", b: "litecoin", aLabel: "Bitcoin Cash", bLabel: "Litecoin" },
  { a: "chainlink", b: "the-graph", aLabel: "Chainlink", bLabel: "The Graph" },
  { a: "aave", b: "uniswap", aLabel: "Aave", bLabel: "Uniswap" },
  { a: "dogecoin", b: "shiba-inu", aLabel: "Dogecoin", bLabel: "Shiba Inu" },
  { a: "monero", b: "zcash", aLabel: "Monero", bLabel: "Zcash" },
  { a: "bnb", b: "tron", aLabel: "BNB", bLabel: "TRON" },
  { a: "internet-computer", b: "near-protocol", aLabel: "Internet Computer", bLabel: "NEAR" },
  { a: "algorand", b: "tezos", aLabel: "Algorand", bLabel: "Tezos" },
  { a: "arweave", b: "filecoin", aLabel: "Arweave", bLabel: "Filecoin" },
  { a: "aptos", b: "sui", aLabel: "Aptos", bLabel: "Sui" },
];

// MAILLAGE SEO 2026-06-13 — hub dense par crypto. Avant : seules 20 paires
// "stars" étaient liées depuis ce hub → ~4930 pages /vs/[a]/[b] quasi
// orphelines (découvrables seulement via 8 cross-links par page) donc peu
// crawlées/indexées. Ici : top 45 cryptos × ~15 adversaires = ~640 liens
// internes canoniques → Google découvre tout le cluster comparateur.
// 100 % statique (aucun fetch), donc zéro coût build / quota.
function buildCryptoMesh() {
  const catalogue = getAllCryptos();
  const hubCryptos = catalogue.slice(0, 45); // têtes de gondole (market cap) — élargi 28→45 pour pousser le maillage dense plus loin dans la longue traîne
  const opponents = catalogue.slice(0, 16); // adversaires les plus cherchés
  return hubCryptos.map((c) => ({
    id: c.id,
    name: c.name,
    symbol: c.symbol,
    duels: opponents
      .filter((o) => o.id !== c.id)
      .map((o) => {
        const [x, y] = [c.id, o.id].sort(); // URL canonique a<b
        return { href: `/vs/${x}/${y}`, label: o.symbol, name: o.name };
      }),
  }));
}

export default function VsHub() {
  const totalPairs = getCryptoPairs().length;
  const mesh = buildCryptoMesh();

  // FIX 2026-06-13 — ItemList des duels phares (comme /comparatif et /cryptos).
  // Le hub du plus gros cluster de trafic n'avait que BreadcrumbList.
  const featuredItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Duels crypto les plus consultés",
    description:
      "Comparatifs crypto vs crypto les plus recherchés (prix, market cap, supply, plateformes FR).",
    numberOfItems: FEATURED_PAIRS.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: FEATURED_PAIRS.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${BRAND.url}/vs/${p.a}/${p.b}`,
      name: `${p.aLabel} vs ${p.bLabel}`,
    })),
  };

  const schema = graphSchema([
    featuredItemList,
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="vs-hub" data={schema} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs chemin="/vs" className="mb-8" />
        {/* Hero */}
        <header className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-mono font-bold text-primary uppercase tracking-wider mb-4">
            <Swords className="h-3 w-3" aria-hidden="true" />
            {fmtCount(totalPairs)} duels possibles
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-fg leading-tight">
            Duels{" "}
            <span className="gradient-text">crypto vs crypto</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/75 max-w-2xl mx-auto leading-relaxed">
            Comparez 2 cryptos côte à côte : prix, market cap, supply, roadmap,
            fiscalité FR. {fmtCount(totalPairs)} combinaisons possibles parmi nos{" "}
            {STATS.cryptosCurated} fiches éditoriales.
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

        {/* MAILLAGE DENSE — tous les duels, groupés par crypto (découverte
            crawl du cluster comparateur complet). */}
        <section className="mt-16" aria-labelledby="all-duels">
          <h2 id="all-duels" className="text-xl sm:text-2xl font-bold text-fg mb-2 flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary-soft" aria-hidden="true" />
            Tous les duels, crypto par crypto
          </h2>
          <p className="text-sm text-muted mb-6 max-w-2xl">
            Choisissez une crypto, puis son adversaire. Chaque duel compare prix,
            market cap, supply, sécurité et plateformes FR côte à côte.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mesh.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <Link
                  href={`/cryptos/${c.id}`}
                  className="text-sm font-bold text-fg hover:text-primary-soft"
                >
                  {c.name}{" "}
                  <span className="text-muted font-normal">({c.symbol})</span>
                </Link>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {c.duels.map((d) => (
                    <li key={d.href}>
                      <Link
                        href={d.href}
                        className="inline-flex items-center rounded-md border border-border/70 bg-elevated/40 px-2 py-0.5 text-xs font-medium text-fg/75 hover:border-primary/40 hover:text-primary-soft transition-colors"
                        aria-label={`Comparer ${c.name} contre ${d.name}`}
                      >
                        vs {d.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Cross-link vers comparer alternatif */}
        <section className="mt-16 rounded-2xl border border-border bg-surface/40 p-6 text-center">
          <h2 className="text-lg font-bold text-fg mb-3">
            Vous voulez un autre duel ?
          </h2>
          <p className="text-sm text-muted mb-4 max-w-xl mx-auto">
            Notre page /comparer propose un sélecteur libre pour les{" "}
            {fmtCount(totalPairs - FEATURED_PAIRS.length)} autres combinaisons,
            ou composez votre propre comparaison multi-crypto.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/comparer" className="btn-primary text-sm">
              Sélecteur libre /comparer
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/cryptos" className="btn-ghost text-sm">
              Voir les {STATS.cryptos} fiches crypto
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
