import type { Metadata } from "next";
import Link from "next/link";
import {
  Fish,
  ArrowRight,
  ExternalLink,
  Building2,
  Wallet,
  Layers,
  HelpCircle,
} from "lucide-react";

import {
  fetchRecentWhales,
  SUPPORTED_WHALE_SYMBOLS,
  type WhaleTransaction,
} from "@/lib/whale-watcher";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
} from "@/lib/schema";

/**
 * /marche/whales — Hub Whale Watcher unifie (BLOC 6, 2026-05-04).
 *
 * User feedback : "ameliorations possibles dans chaque categorie" - Marche.
 * Le composant WhaleWatcher existe deja sur les fiches crypto individuelles
 * (BTC, ETH...) mais reste isole. Une page hub /marche/whales qui agrege
 * les transactions on-chain massives sur les 8 cryptos supportees fournit :
 *  - Vision globale du marche en un endroit
 *  - SEO sur "whale tracker FR", "grosses transactions crypto"
 *  - Contexte editorial (signal accumulation/distribution)
 *
 * Pattern : Server Component, fetch parallele les whales sur les 8 symboles
 * supportees par Whale Alert API. Cache 5 min via unstable_cache (deja
 * applique dans fetchRecentWhales).
 *
 * Source : Whale Alert API (>= 1M$ par defaut). Si l'API est indisponible
 * (clef absent / rate-limit), la page rend sans tx et affiche un message.
 */

export const revalidate = 300;

const PAGE_PATH = "/marche/whales";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const TITLE = "Whale Watcher : grosses transactions crypto en direct";
const DESCRIPTION =
  "Suivi en direct des transactions on-chain massives (>= 1 M$) sur 8 cryptos majeures : Bitcoin, Ethereum, USDT, USDC, Solana, BNB, XRP, TRX. Source Whale Alert, cache 5 min.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    // BLOCs 0-7 audit FRONT P0-2 (2026-05-04) — fallback sur OG image global.
    images: [{ url: `${BRAND.url}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${BRAND.url}/opengraph-image`],
  },
  keywords: [
    "whale watcher",
    "whale alert FR",
    "grosses transactions crypto",
    "tracker whale bitcoin",
    "transactions on-chain massives",
    "exchange flow crypto",
  ],
  robots: { index: true, follow: true },
};

interface WhaleWithSymbol extends WhaleTransaction {
  symbol: string;
}

async function fetchAllWhales(): Promise<WhaleWithSymbol[]> {
  const results = await Promise.all(
    SUPPORTED_WHALE_SYMBOLS.map(async (sym) => {
      const txs = await fetchRecentWhales(sym, 1_000_000);
      return txs.map((t) => ({ ...t, symbol: sym }));
    }),
  );
  // Flatten + sort par valeur USD descendant + cap a 30.
  const flat = results.flat();
  return flat.sort((a, b) => b.amountUSD - a.amountUSD).slice(0, 30);
}

export default async function WhalesHubPage() {
  const whales = await fetchAllWhales();
  const totalVolume = whales.reduce((acc, t) => acc + t.amountUSD, 0);
  const exchangeOutflows = whales.filter(
    (t) => t.fromType === "exchange" && t.toType !== "exchange",
  ).length;
  const exchangeInflows = whales.filter(
    (t) => t.toType === "exchange" && t.fromType !== "exchange",
  ).length;

  const schemas = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Marche", url: "/marche" },
      { name: "Whales", url: PAGE_PATH },
    ]),
    faqSchema([
      {
        question: "C'est quoi une 'whale' en crypto ?",
        answer:
          "Une whale (baleine) est un wallet ou une entite qui detient suffisamment de cryptos pour potentiellement influencer le marche. Pas de seuil universel : on parle souvent de >100 BTC pour Bitcoin, > 1000 ETH pour Ethereum. Whale Alert detecte les TRANSACTIONS >= 1 M$ (peu importe la taille du wallet emetteur). Utilite : observer les mouvements peut donner des indices sur des accumulations ou distributions a grande echelle.",
      },
      {
        question: "Pourquoi un transfert exchange -> wallet est important ?",
        answer:
          "Un OUTFLOW (exchange -> wallet personnel) signale en general une intention de HOLD long terme : le whale retire ses cryptos du trading actif vers du cold storage. Historiquement correle avec une hausse de prix (moins d'offre liquide). A l'inverse, un INFLOW (wallet -> exchange) signale une intention de VENTE potentielle : le whale prepare ses cryptos pour la liquidation. Ces signaux ne sont pas predictifs, mais agreges sur 100+ transactions ils donnent une lecture du sentiment.",
      },
      {
        question: "Comment interpreter les transferts entre exchanges ?",
        answer:
          "Les transferts exchange -> exchange sont moins informatifs car ils peuvent correspondre a : (1) arbitrage de prix entre plateformes, (2) consolidation d'un fond institutionnel, (3) fuite de capital regulatoire (ex: Binance -> Coinbase apres une annonce SEC). On les ignore en general dans l'analyse de sentiment retail, mais ils peuvent reveler des deplacements institutionnels importants.",
      },
      {
        question: "Pourquoi seulement 8 cryptos suivies ?",
        answer: `Whale Alert API (notre source) ne supporte officiellement qu'un sous-ensemble de blockchains : ${SUPPORTED_WHALE_SYMBOLS.join(", ")}. Les small caps n'ont pas assez de volume pour que le seuil "whale" >= 1 M$ soit pertinent (un seul wallet pourrait etre 30% du market cap). Pour les hidden gems, le concept "whale" perd son sens.`,
      },
      {
        question: "Ces donnees sont-elles fiables ?",
        answer:
          "Les transactions on-chain sont 100% verifiables (chaque hash peut etre verifie sur l'explorer correspondant : Etherscan, mempool.space, Solscan, etc.). Les classifications 'exchange/wallet/defi' sont issues de bases proprietaires Whale Alert (peuvent etre incomplete sur les nouveaux contrats). Cache cote serveur 5 min : les transactions affichees ont jusqu'a 5 minutes de retard mais c'est suffisant pour l'analyse macro.",
      },
    ]),
  ]);

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={schemas} id="whales-hub" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/marche" className="hover:text-fg">Marche</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Whales</span>
        </nav>

        {/* Header */}
        <header className="mt-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <Fish className="h-3.5 w-3.5" />
            Whale Watcher
          </div>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
            <span className="gradient-text">Top 30 transactions whales</span>
            <br />
            sur les 8 cryptos majeures
          </h1>
          <p className="mt-3 text-base text-muted">
            Transactions on-chain &ge; 1 M$ aggregees en temps reel. Cache 5 min.
            Source <strong className="text-fg">Whale Alert API</strong>.
            Hash explorer click-through pour verification.
          </p>
        </header>

        {/* Stats hero */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Volume cumule"
            value={fmtCompactUsd(totalVolume)}
            sub={`${whales.length} transactions`}
            tone="primary"
          />
          <Stat
            label="Outflows exchanges"
            value={String(exchangeOutflows)}
            sub="signal HOLD long terme"
            tone="green"
          />
          <Stat
            label="Inflows exchanges"
            value={String(exchangeInflows)}
            sub="signal VENTE potentielle"
            tone="amber"
          />
        </div>

        {/* List or empty state */}
        {whales.length === 0 ? (
          <section className="mt-10 rounded-2xl border border-border bg-surface p-8 text-center">
            <p className="text-fg/70">
              Aucune transaction whale recente disponible. L&apos;API Whale
              Alert est peut-etre rate-limitee — reessaie dans quelques
              minutes.
            </p>
          </section>
        ) : (
          <ul className="mt-10 space-y-3">
            {whales.map((tx, i) => (
              <WhaleRow key={`${tx.id}-${i}`} tx={tx} index={i} />
            ))}
          </ul>
        )}

        {/* Methodologie */}
        <section className="mt-12 rounded-2xl border border-border bg-elevated/30 p-6">
          <h2 className="text-lg font-bold text-fg">Comment lire ces donnees</h2>
          <ul className="mt-3 space-y-2 text-sm text-fg/85">
            <li>
              <strong className="text-fg">Exchange &rarr; Wallet</strong> :
              outflow, generalement signal d&apos;accumulation longue duree.
            </li>
            <li>
              <strong className="text-fg">Wallet &rarr; Exchange</strong> :
              inflow, intention potentielle de vente (a confirmer dans les
              jours qui suivent).
            </li>
            <li>
              <strong className="text-fg">Exchange &rarr; Exchange</strong> :
              arbitrage ou deplacement institutionnel, peu informatif sur
              le sentiment retail.
            </li>
            <li>
              <strong className="text-fg">Hash transparent</strong> : clique
              pour verifier sur l&apos;explorer officiel (mempool.space,
              etherscan, solscan, etc.).
            </li>
          </ul>
        </section>

        {/* CTA */}
        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <Link
            href="/marche/heatmap"
            className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Aussi sur Marche
            </div>
            <div className="mt-2 text-sm font-bold text-fg">Heatmap top 100</div>
            <div className="mt-1 text-[11px] text-muted">Variations 24h en couleur</div>
          </Link>
          <Link
            href="/marche/fear-greed"
            className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Aussi sur Marche
            </div>
            <div className="mt-2 text-sm font-bold text-fg">Fear &amp; Greed Index</div>
            <div className="mt-1 text-[11px] text-muted">Sentiment du marche</div>
          </Link>
          <Link
            href="/marche/gainers-losers"
            className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Aussi sur Marche
            </div>
            <div className="mt-2 text-sm font-bold text-fg">Top gainers / losers</div>
            <div className="mt-1 text-[11px] text-muted">Mouvements 24h</div>
          </Link>
        </section>

        <p className="mt-10 text-[11px] text-muted leading-relaxed">
          Donnees Whale Alert. Cette page ne constitue pas un conseil en
          investissement : la presence de transactions whales n&apos;a aucune
          valeur predictive sur l&apos;evolution future du prix. Voir notre{" "}
          <Link href="/methodologie" className="underline hover:text-fg">
            methodologie publique
          </Link>
          .
        </p>
      </div>
    </article>
  );
}

function WhaleRow({ tx, index }: { tx: WhaleWithSymbol; index: number }) {
  const explorer = buildExplorerUrl(tx.blockchain, tx.hash);
  return (
    <li
      className="rounded-xl border border-border bg-surface p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 font-mono text-[11px] font-bold text-primary-soft shrink-0">
          {index + 1}
        </span>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-base font-bold text-fg tabular-nums">
              {formatCryptoAmount(tx.amountCrypto)} {tx.symbol}
            </span>
            <span className="font-mono text-sm font-semibold text-primary tabular-nums">
              {fmtCompactUsd(tx.amountUSD)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px] text-muted">
            <OwnerChip type={tx.fromType} label={ownerLabel(tx.fromType, tx.fromName)} />
            <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
            <OwnerChip type={tx.toType} label={ownerLabel(tx.toType, tx.toName)} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
        <span className="text-[11px] text-muted whitespace-nowrap">
          {fmtRelative(tx.timestamp)}
        </span>
        {explorer && (
          <a
            href={explorer}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated/60 px-2 py-1 text-[11px] font-mono text-muted hover:text-primary hover:border-primary/40 transition-colors"
          >
            {tx.hash.slice(0, 6)}…
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers (purs, sans dep)                                                  */
/* -------------------------------------------------------------------------- */

function fmtCompactUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}Md$`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M$`;
  return `${(n / 1e3).toFixed(0)}k$`;
}

function formatCryptoAmount(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 10_000) {
    return new Intl.NumberFormat("fr-FR", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
}

function fmtRelative(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "à l'instant";
  const diffMin = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  return `il y a ${Math.round(diffH / 24)} j`;
}

function buildExplorerUrl(blockchain: string, hash: string): string | null {
  if (!hash) return null;
  const c = blockchain.toLowerCase();
  if (c === "bitcoin") return `https://mempool.space/tx/${hash}`;
  if (c === "ethereum") return `https://etherscan.io/tx/${hash}`;
  if (c === "solana") return `https://solscan.io/tx/${hash}`;
  if (c === "ripple") return `https://xrpscan.com/tx/${hash}`;
  if (c === "binancechain" || c === "binance-chain")
    return `https://explorer.bnbchain.org/tx/${hash}`;
  if (c === "binance-smart-chain" || c === "bsc")
    return `https://bscscan.com/tx/${hash}`;
  if (c === "tron") return `https://tronscan.org/#/transaction/${hash}`;
  return null;
}

function ownerLabel(
  type: "exchange" | "wallet" | "unknown" | "defi",
  name?: string,
): string {
  if (name && name.trim())
    return name.charAt(0).toUpperCase() + name.slice(1);
  if (type === "exchange") return "Exchange";
  if (type === "defi") return "DeFi";
  if (type === "wallet") return "Wallet";
  return "Inconnu";
}

function OwnerChip({
  type,
  label,
}: {
  type: "exchange" | "wallet" | "unknown" | "defi";
  label: string;
}) {
  const Icon =
    type === "exchange"
      ? Building2
      : type === "defi"
        ? Layers
        : type === "wallet"
          ? Wallet
          : HelpCircle;
  const cls =
    type === "exchange"
      ? "text-primary border-primary/30 bg-primary/5"
      : type === "defi"
        ? "text-accent-green border-accent-green/30 bg-accent-green/5"
        : type === "wallet"
          ? "text-fg/80 border-border bg-surface"
          : "text-muted border-border bg-surface";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${cls}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate max-w-[100px]">{label}</span>
    </span>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "green" | "primary" | "amber";
}) {
  const styles = {
    green: "border-accent-green/30 bg-accent-green/5 text-accent-green",
    primary: "border-primary/30 bg-primary/5 text-primary-soft",
    amber: "border-amber-400/30 bg-amber-400/5 text-amber-300",
  };
  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold text-fg">{value}</div>
      <div className="mt-0.5 text-xs text-fg/70">{sub}</div>
    </div>
  );
}
