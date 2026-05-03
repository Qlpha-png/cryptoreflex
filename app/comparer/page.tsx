import type { Metadata } from "next";
import Link from "next/link";
import {
  getAllCryptoComparisons,
  COMPARABLE_CRYPTO_IDS,
} from "@/lib/crypto-comparisons";
import { getCryptoBySlug } from "@/lib/cryptos";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import ComparerHubClient from "@/components/ComparerHubClient";

// BATCH 59 — extension hub /comparer pour refleter 4950 duels (vs 105 avant).
// Chiffres calcules dynamiquement depuis getAllCryptoComparisons() pour eviter
// le drift (cf. P0 #5 audit BATCH 57).
const TOTAL_DUELS = (() => {
  const n = COMPARABLE_CRYPTO_IDS.length;
  return (n * (n - 1)) / 2;
})();

export const metadata: Metadata = {
  title: `Comparer 2 cryptos — ${TOTAL_DUELS} duels analyses (BTC vs ETH, SOL vs ADA, etc.)`,
  description: `${TOTAL_DUELS} comparatifs crypto-vs-crypto entre 100 cryptos analysees (top 10 + 90 hidden gems). Verdict 3 profils, plateformes communes, FAQ contextuelle, methodologie publique Cryptoreflex.`,
  alternates: withHreflang(`${BRAND.url}/comparer`),
  robots: { index: true, follow: true },
};

export default function ComparerHubPage() {
  const all = getAllCryptoComparisons();

  // Group par crypto + serialize les data minimales pour le client.
  const groupedData = COMPARABLE_CRYPTO_IDS.map((id) => {
    const c = getCryptoBySlug(id);
    if (!c) return null;
    const matches = all
      .filter((cmp) => cmp.a === id || cmp.b === id)
      .map((cmp) => ({ slug: cmp.slug, a: cmp.a, b: cmp.b }));
    return { crypto: c, matches };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  // Lookup pour le client (eviter de re-importer getCryptoBySlug cote client).
  const cryptoLookup: Record<string, { id: string; name: string; symbol: string }> = {};
  for (const id of COMPARABLE_CRYPTO_IDS) {
    const c = getCryptoBySlug(id);
    if (c) cryptoLookup[id] = { id: c.id, name: c.name, symbol: c.symbol };
  }

  return (
    <article className="py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Comparer</span>
        </nav>

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Comparer <span className="gradient-text">2 cryptos</span> face à face
          </h1>
          <p className="mt-3 text-base text-muted">
            <strong className="text-fg">{all.length} duels</strong> entre les 100 cryptos analysees
            (10 top + 90 hidden gems). Tableau side-by-side : ancienneté, cas d&apos;usage, type,
            disponibilité MiCA, FAQ contextuelle, verdict par profil. Méthodologie publique Cryptoreflex.
          </p>
        </header>

        <p className="mt-6 text-sm text-muted">
          Tu veux comparer 3 ou 4 cryptos en même temps avec le prix live ? Utilise notre{" "}
          <Link
            href="/cryptos/comparer"
            className="text-primary-soft underline hover:text-primary"
          >
            comparateur dynamique
          </Link>
          .
        </p>

        {/* BATCH 59#3 — barre de recherche client + grid filtrable.
            User : "quand il y a beaucoup de choix mets une barre de recherche". */}
        <ComparerHubClient groupedData={groupedData} cryptoLookup={cryptoLookup} />
      </div>
    </article>
  );
}
