import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { BookOpen, Search, ArrowLeft, Mail } from "lucide-react";

import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import { generateWebApplicationSchema } from "@/lib/schema-tools";
import {
  GLOSSARY,
  GLOSSARY_FLAT_CATEGORIES,
  buildFlatDefinedTermSetSchema,
} from "@/lib/glossary";
import { BRAND } from "@/lib/brand";
import RelatedPagesNav from "@/components/RelatedPagesNav";

/* -------------------------------------------------------------------------- */
/*  ISR — revalidate every 24 h                                                */
/* -------------------------------------------------------------------------- */
export const revalidate = 86400;

/* -------------------------------------------------------------------------- */
/*  Lazy-load Client Component (search + filtres)                              */
/* -------------------------------------------------------------------------- */
const GlossaryClient = dynamic(() => import("@/components/Glossary"), {
  loading: () => (
    <div
      className="h-[400px] animate-pulse rounded-2xl bg-elevated/40"
      aria-label="Chargement du glossaire"
    />
  ),
  ssr: false,
});

/* -------------------------------------------------------------------------- */
/*  SEO meta                                                                   */
/* -------------------------------------------------------------------------- */
const PAGE_TITLE = "Glossaire crypto français — 200+ termes définis (2026)";
const PAGE_DESCRIPTION =
  "Plus de 200 termes crypto français définis simplement : Bitcoin, DeFi, MiCA, halving, staking, Layer 2, NFT, wallets... Glossaire complet, gratuit, mis à jour en 2026.";
const PAGE_PATH = "/outils/glossaire-crypto";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: PAGE_PATH,
    languages: { "fr-FR": PAGE_URL },
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

/* -------------------------------------------------------------------------- */
/*  Index alphabétique pour la nav A-Z                                         */
/* -------------------------------------------------------------------------- */
function buildAlphabetIndex() {
  const letters = new Set<string>();
  for (const t of GLOSSARY) {
    const first = t.term
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .charAt(0)
      .toUpperCase();
    if (/[A-Z]/.test(first)) letters.add(first);
    else letters.add("#");
  }
  return Array.from(letters).sort();
}

export default function GlossaireCryptoPage() {
  const alphabetIndex = buildAlphabetIndex();

  /* ------------------------------------------------------------------ */
  /*  JSON-LD                                                            */
  /* ------------------------------------------------------------------ */
  const schemas: JsonLd[] = [
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Glossaire crypto", url: PAGE_PATH },
    ]),
    generateWebApplicationSchema({
      slug: "glossaire-crypto",
      name: "Glossaire crypto français Cryptoreflex",
      description: PAGE_DESCRIPTION,
      featureList: [
        `${GLOSSARY.length}+ termes crypto définis en français`,
        "Recherche instantanée + filtres par catégorie",
        "Index alphabétique A-Z",
        "Couvre Bitcoin, DeFi, MiCA, halving, staking, NFT, Layer 2",
        "Liens d'ancre partageables (URL fragment)",
        "Mise à jour 2026",
      ],
      keywords: [
        "glossaire crypto",
        "définition Bitcoin",
        "définition DeFi",
        "vocabulaire crypto",
        "MiCA définition",
      ],
    }),
    buildFlatDefinedTermSetSchema(BRAND.url),
  ];

  return (
    <>
      <StructuredData data={graphSchema(schemas)} />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Fil d'Ariane" className="mb-6">
            <Link
              href="/outils"
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour aux outils
            </Link>
          </nav>

          {/* Hero */}
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-soft">
              <BookOpen className="h-3.5 w-3.5" />
              {GLOSSARY.length}+ termes — 100 % gratuit
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-fg">
              <span className="gradient-text">Glossaire crypto</span> français
            </h1>
            <p className="mt-4 text-lg text-muted leading-relaxed">
              Plus de {GLOSSARY.length} termes crypto définis en français clair :
              trading, DeFi, sécurité, régulation MiCA, NFT, Layer 2, tokenomics,
              wallets, mining et stablecoins. Cherchez, filtrez par catégorie,
              partagez les ancres avec vos amis.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {GLOSSARY_FLAT_CATEGORIES.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center text-[11px] font-semibold rounded-full bg-elevated text-muted border border-border px-2.5 py-1"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Index alphabétique A-Z */}
          <nav
            aria-label="Index alphabétique"
            className="mt-10 flex flex-wrap gap-1.5 rounded-2xl border border-border bg-surface p-3"
          >
            {alphabetIndex.map((letter) => {
              // Anchor vers le premier terme commençant par cette lettre.
              const firstMatch = GLOSSARY.find((t) => {
                const f = t.term
                  .normalize("NFD")
                  .replace(/\p{Diacritic}/gu, "")
                  .charAt(0)
                  .toUpperCase();
                return letter === "#" ? !/[A-Z]/.test(f) : f === letter;
              });
              if (!firstMatch) return null;
              return (
                <a
                  key={letter}
                  href={`#term-${firstMatch.slug}`}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-xs font-semibold text-muted hover:bg-primary/15 hover:text-primary-soft transition"
                  aria-label={`Aller à la lettre ${letter}`}
                >
                  {letter}
                </a>
              );
            })}
          </nav>

          {/* Outil interactif (Client) */}
          <div className="mt-8">
            <GlossaryClient />
          </div>

          {/* Disclaimer YMYL */}
          <div className="mt-12 rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
            <p>
              <strong className="text-fg">Avertissement :</strong> ce glossaire
              est à but pédagogique uniquement et ne constitue pas un conseil
              en investissement. Les définitions sont régulièrement mises à
              jour mais l'écosystème crypto évolue très vite — vérifiez
              toujours les sources primaires (whitepapers, sites officiels,
              régulateurs comme l'AMF) avant d'agir.
            </p>
          </div>

          {/* CTA contact */}
          <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
            <Search className="mx-auto h-6 w-6 text-primary-soft" />
            <h2 className="mt-3 text-lg font-bold text-fg">
              Vu un terme manquant ?
            </h2>
            <p className="mt-2 text-sm text-muted max-w-xl mx-auto">
              Le vocabulaire crypto évolue chaque semaine. Si un terme est
              absent ou si une définition mérite une mise à jour, faites-nous
              signe — nous publions chaque ajout sous 48 h.
            </p>
            <Link
              href="/contact"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary-soft border border-primary/40 px-4 py-2 text-sm font-semibold transition"
            >
              <Mail className="h-4 w-4" />
              Contactez-nous
            </Link>
          </div>

          {/* Maillage interne — graphe sémantique cross-clusters */}
          <RelatedPagesNav
            currentPath="/outils/glossaire-crypto"
            limit={4}
            variant="default"
          />
        </div>
      </section>
    </>
  );
}
