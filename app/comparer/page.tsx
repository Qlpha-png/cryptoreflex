import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import {
  getAllCryptoComparisons,
  COMPARABLE_CRYPTO_IDS,
} from "@/lib/crypto-comparisons";
import { getCryptoBySlug } from "@/lib/cryptos";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Comparer 2 cryptos — 105 duels analysés (Bitcoin vs Ethereum, Solana vs Cardano…)",
  description:
    "105 comparatifs crypto-vs-crypto entre les top 15 (BTC, ETH, BNB, XRP, SOL, ADA, DOGE, TRX, AVAX, LINK, DOT, ATOM, MATIC, LTC, NEAR). Tableau side-by-side, cas d'usage, où acheter en France.",
  alternates: { canonical: `${BRAND.url}/comparer` },
  robots: { index: true, follow: true },
};

export default function ComparerHubPage() {
  const all = getAllCryptoComparisons();
  // Group par première crypto (a) pour lisibilité
  const grouped = COMPARABLE_CRYPTO_IDS.map((id) => {
    const c = getCryptoBySlug(id);
    if (!c) return null;
    const matches = all.filter((cmp) => cmp.a === id || cmp.b === id);
    return { crypto: c, matches };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <article className="py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Comparer</span>
        </nav>

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Comparer <span className="gradient-text">2 cryptos</span> face à face
          </h1>
          <p className="mt-3 text-base text-muted">
            <strong className="text-fg">{all.length} duels</strong> entre les 15 cryptos les plus
            recherchées en France. Tableau side-by-side : ancienneté, cas d&apos;usage, type,
            disponibilité MiCA, FAQ. Pas de prix targets — méthodologie publique Cryptoreflex.
          </p>
        </header>

        <p className="mt-6 text-sm text-muted">
          Tu veux comparer 3 ou 4 cryptos en même temps avec le prix live ? Utilise notre{" "}
          <Link href="/cryptos/comparer" className="text-primary-soft underline hover:text-primary">
            comparateur dynamique
          </Link>
          .
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {grouped.map(({ crypto, matches }) => (
            <div key={crypto.id} className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-base font-bold text-fg flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                {crypto.name} ({crypto.symbol})
              </h2>
              <p className="mt-1 text-xs text-muted">
                {matches.length} comparatifs
              </p>
              <ul className="mt-3 space-y-1.5">
                {matches.slice(0, 5).map((m) => {
                  const otherId = m.a === crypto.id ? m.b : m.a;
                  const other = getCryptoBySlug(otherId);
                  if (!other) return null;
                  return (
                    <li key={m.slug}>
                      <Link
                        href={`/comparer/${m.slug}`}
                        className="inline-flex items-center gap-1 text-xs text-primary-soft hover:text-primary"
                      >
                        vs {other.name}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </li>
                  );
                })}
                {matches.length > 5 && (
                  <li className="text-[11px] text-muted">
                    + {matches.length - 5} autres…
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
