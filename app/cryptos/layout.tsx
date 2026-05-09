import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";

/**
 * /cryptos layout — fournit la metadata SEO pour le hub /cryptos.
 *
 * BATCH 60#2 (2026-05-04) — Audit iter 2 a revele que /cryptos avait :
 * - canonical pointant vers / (pas /cryptos)
 * - 5 hreflang pointant vers / (pas /cryptos)
 *
 * Cause : app/cryptos/page.tsx est "use client" -> ne peut pas exporter
 * metadata. Sans layout.tsx ici, la page herite du layout root qui a
 * canonical = BRAND.url. Resultat : Google deduplique /cryptos avec /
 * et evince /cryptos de l'index. Impact SEO direct sur le hub principal
 * des 100 fiches cryptos.
 *
 * Fix : layout.tsx server component avec metadata correcte. Les routes
 * enfants (/cryptos/[slug], /cryptos/comparer) ont deja leur propre
 * generateMetadata qui override celle-ci.
 */

const PAGE_URL = `${BRAND.url}/cryptos`;
const PAGE_TITLE = "780 cryptos analysees : top 10, 90 hidden gems + 680 fiches LLM 2026";
const PAGE_DESCRIPTION =
  "Toutes les fiches crypto Cryptoreflex : 100 fiches editoriales premium (top 10 + 90 hidden gems DePIN, RWA, Layer 2, gaming) + 680 fiches LLM exploratoires. Filtres categorie + recherche live + comparateur side-by-side.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    locale: "fr_FR",
    siteName: BRAND.name,
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
  keywords: [
    "780 cryptos",
    "100 fiches crypto",
    "fiches crypto FR",
    "top 10 crypto 2026",
    "hidden gems crypto",
    "comparatif crypto",
    "crypto MiCA",
    "Bitcoin",
    "Ethereum",
    "Solana",
    "Cardano",
  ],
  robots: { index: true, follow: true },
};

export default function CryptosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
