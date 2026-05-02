import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, TrendingUp, Calendar } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { breadcrumbSchema, graphSchema } from "@/lib/schema";
import StructuredData from "@/components/StructuredData";

/**
 * /historique-prix — HUB INDEX (BATCH 44b — création post-audit maillage SEO).
 *
 * Avant : 240 URLs `/historique-prix/[crypto]/[annee]` orphelines (sitemap-only,
 * aucun lien navigationnel humain). Crawl Google passait sans transmettre
 * de PageRank entre la home et ces 240 pages.
 *
 * Après : page hub qui liste les 30 cryptos suivies × 8 années (2018-2025) =
 * 240 entrées navigables. Chaque crypto pointe vers son année la plus récente
 * + raccourcis vers chaque année. Le crawler/utilisateur peut atteindre
 * n'importe quelle URL en 2 clics depuis la home (Footer "Apprendre" →
 * /historique-prix → /historique-prix/{crypto}/{year}).
 *
 * SEO : title + description optimisés long-tail "historique prix crypto",
 * BreadcrumbList schema, ItemList implicite via les liens H3.
 */

const YEARS = ["2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018"] as const;

const CRYPTOS_HIST: Array<{ slug: string; name: string; symbol: string; tagline: string }> = [
  { slug: "bitcoin", name: "Bitcoin", symbol: "BTC", tagline: "L'actif crypto historique, réserve de valeur numérique" },
  { slug: "ethereum", name: "Ethereum", symbol: "ETH", tagline: "Smart contracts, DeFi, NFT — n°2 mondial" },
  { slug: "binancecoin", name: "BNB", symbol: "BNB", tagline: "Token de l'écosystème Binance + BNB Chain" },
  { slug: "ripple", name: "XRP", symbol: "XRP", tagline: "Paiements transfrontaliers, partenariats banques" },
  { slug: "solana", name: "Solana", symbol: "SOL", tagline: "L1 ultra-rapide, écosystème DeFi et NFT" },
  { slug: "cardano", name: "Cardano", symbol: "ADA", tagline: "PoS académique, gouvernance décentralisée" },
  { slug: "dogecoin", name: "Dogecoin", symbol: "DOGE", tagline: "Le memecoin originel, paiements P2P" },
  { slug: "tron", name: "TRON", symbol: "TRX", tagline: "Blockchain content + USDT majoritairement émis ici" },
  { slug: "avalanche-2", name: "Avalanche", symbol: "AVAX", tagline: "L1 sub-second finality, subnets enterprise" },
  { slug: "chainlink", name: "Chainlink", symbol: "LINK", tagline: "Oracles décentralisés, RWA tokenization" },
  { slug: "polkadot", name: "Polkadot", symbol: "DOT", tagline: "Multi-chain interoperability, parachains" },
  { slug: "matic-network", name: "Polygon", symbol: "MATIC", tagline: "Layer 2 Ethereum, zkEVM" },
  { slug: "litecoin", name: "Litecoin", symbol: "LTC", tagline: "Argent digital, transactions rapides BTC-like" },
  { slug: "shiba-inu", name: "Shiba Inu", symbol: "SHIB", tagline: "Memecoin avec écosystème Shibarium L2" },
  { slug: "uniswap", name: "Uniswap", symbol: "UNI", tagline: "DEX leader, AMM automatisé sur Ethereum" },
  { slug: "near", name: "NEAR Protocol", symbol: "NEAR", tagline: "Sharding nativif, AI on-chain" },
  { slug: "internet-computer", name: "Internet Computer", symbol: "ICP", tagline: "Web hébergé en blockchain (DFINITY)" },
  { slug: "cosmos", name: "Cosmos", symbol: "ATOM", tagline: "Internet of blockchains, IBC interopérabilité" },
  { slug: "stellar", name: "Stellar", symbol: "XLM", tagline: "Paiements transfrontaliers low-cost, banques émergentes" },
  { slug: "bitcoin-cash", name: "Bitcoin Cash", symbol: "BCH", tagline: "Hard fork Bitcoin 2017, blocs plus larges" },
  { slug: "filecoin", name: "Filecoin", symbol: "FIL", tagline: "Stockage décentralisé IPFS-incentivé" },
  { slug: "aptos", name: "Aptos", symbol: "APT", tagline: "L1 Move-based ex-Meta Diem" },
  { slug: "monero", name: "Monero", symbol: "XMR", tagline: "Cryptomonnaie privacy par défaut, ring signatures" },
  { slug: "the-open-network", name: "Toncoin", symbol: "TON", tagline: "Blockchain Telegram, mass-market wallet" },
  { slug: "tezos", name: "Tezos", symbol: "XTZ", tagline: "On-chain governance, NFT artistique français" },
  { slug: "algorand", name: "Algorand", symbol: "ALGO", tagline: "Pure PoS, finality 4s, RWA institutional" },
  { slug: "hedera-hashgraph", name: "Hedera", symbol: "HBAR", tagline: "Hashgraph DAG, governance Council Fortune 500" },
  { slug: "ethereum-classic", name: "Ethereum Classic", symbol: "ETC", tagline: "Fork ETH original PoW, immuabilité maximale" },
  { slug: "aave", name: "Aave", symbol: "AAVE", tagline: "Money market DeFi leader, V3 multi-chain" },
  { slug: "maker", name: "MakerDAO", symbol: "MKR", tagline: "Émetteur DAI, gouvernance protocole RWA" },
];

const PAGE_TITLE = "Historique prix crypto par année (2018-2025) — Cryptoreflex";
const PAGE_DESCRIPTION =
  "Évolution annuelle des 30 principales cryptomonnaies : Bitcoin, Ethereum, Solana, BNB et plus. Prix d'ouverture, ATH, ATL, performance % par année.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: `${BRAND.url}/historique-prix` },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${BRAND.url}/historique-prix`,
    type: "website",
  },
};

export const revalidate = 86400;

export default function HistoriquePrixHub() {
  const schema = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Historique prix crypto", url: "/historique-prix" },
    ]),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="historique-prix-hub" data={schema} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <header className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[10px] font-mono font-bold text-primary uppercase tracking-wider mb-4">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            240 pages historiques
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-fg leading-tight">
            Historique des prix crypto{" "}
            <span className="gradient-text">par année</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/75 max-w-2xl mx-auto leading-relaxed">
            30 cryptomonnaies analysées × 8 années (2018-2025).
            Prix d&apos;ouverture, ATH, ATL, performance % et événements marquants.
          </p>
        </header>

        {/* Liste des cryptos */}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CRYPTOS_HIST.map((c) => (
            <li key={c.slug}>
              <article className="group rounded-2xl border border-border bg-elevated/40 p-5 hover:border-primary/40 hover:bg-elevated transition-colors h-full flex flex-col">
                <header className="flex items-baseline justify-between gap-2 mb-2">
                  <h2 className="text-base font-bold text-fg">
                    {c.name}{" "}
                    <span className="text-xs font-mono text-muted">
                      {c.symbol}
                    </span>
                  </h2>
                  <TrendingUp className="h-4 w-4 text-primary-soft shrink-0" aria-hidden="true" />
                </header>
                <p className="text-xs text-muted leading-relaxed mb-4 flex-1">
                  {c.tagline}
                </p>
                {/* Lien principal vers année récente */}
                <Link
                  href={`/historique-prix/${c.slug}/2025`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:text-primary mb-3 group-hover:gap-2 transition-all"
                  aria-label={`Voir l'historique de prix ${c.name} en 2025`}
                >
                  Historique 2025
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                {/* Liens années secondaires */}
                <ul className="flex flex-wrap gap-1.5">
                  {YEARS.slice(1).map((year) => (
                    <li key={year}>
                      <Link
                        href={`/historique-prix/${c.slug}/${year}`}
                        className="inline-block rounded-md border border-border bg-background/60 px-2 py-0.5 text-[11px] font-mono text-fg/75 hover:border-primary/50 hover:text-primary transition-colors"
                        aria-label={`Historique ${c.name} ${year}`}
                      >
                        {year}
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ul>

        {/* Cross-links vers les autres hubs */}
        <section className="mt-16 rounded-2xl border border-border bg-surface/40 p-6 text-center">
          <h2 className="text-lg font-bold text-fg mb-3">
            Tu cherches autre chose ?
          </h2>
          <p className="text-sm text-muted mb-4 max-w-xl mx-auto">
            Cryptoreflex couvre aussi les fiches détaillées par crypto, les
            comparatifs côte à côte, et les outils d&apos;analyse.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/cryptos" className="btn-ghost text-sm">
              Les 100 fiches crypto
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/comparer" className="btn-ghost text-sm">
              Comparer 2 cryptos
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/outils/simulateur-dca" className="btn-ghost text-sm">
              Simuler un DCA
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
