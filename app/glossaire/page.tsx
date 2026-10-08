import { avecTypoSync } from "@/components/ui/Typo";
import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import {
  GLOSSARY_TERMS,
  GLOSSARY_CATEGORIES,
  groupByLetter,
} from "@/lib/glossary";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import { fitDescription } from "@/lib/seo-text";
import Breadcrumbs from "@/components/Breadcrumbs";

const PAGE_DESCRIPTION =
  "Plus de 250 termes crypto expliqués simplement, sans jargon : blockchain, DeFi, wallets, fiscalité française, NFT, Layer 2 et plus. Référence pour comprendre la crypto en français.";

export const metadata: Metadata = {
  title: "Glossaire crypto — 250+ termes expliqués simplement",
  description: fitDescription(PAGE_DESCRIPTION),
  alternates: withHreflang("/glossaire"),
  openGraph: {
    title: `Glossaire crypto | ${BRAND.name}`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: `${BRAND.url}/glossaire`,
  },
  twitter: {
    card: "summary_large_image",
    title: `Glossaire crypto | ${BRAND.name}`,
    description: PAGE_DESCRIPTION,
  },
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function GlossaryIndexPage() {
  const grouped = groupByLetter(GLOSSARY_TERMS);
  const presentLetters = ALPHABET.filter((l) => grouped[l]?.length);
  const hasNumeric = !!grouped["#"]?.length;

  // JSON-LD : DefinedTermSet pour SEO
  const termSetSchema = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Glossaire crypto Cryptoreflex",
    description: PAGE_DESCRIPTION,
    url: `${BRAND.url}/glossaire`,
    inLanguage: "fr-FR",
    hasDefinedTerm: GLOSSARY_TERMS.map((t) => ({
      "@type": "DefinedTerm",
      "@id": `${BRAND.url}/glossaire/${t.id}`,
      name: t.term,
      description: t.shortDefinition,
      url: `${BRAND.url}/glossaire/${t.id}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(termSetSchema) }}
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs chemin="/glossaire" className="mb-6" />
          {/* Header */}
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-soft">
              <BookOpen className="h-3.5 w-3.5" />
              Glossaire
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
              Glossaire <span className="gradient-text">crypto</span>
            </h1>
            <p className="mt-3 text-lg text-fg-max/70">
              {GLOSSARY_TERMS.length} termes expliqués simplement, sans jargon. De{" "}
              <Link
                href="/glossaire/blockchain"
                className="text-primary-soft hover:text-primary underline-offset-2 hover:underline"
              >
                blockchain
              </Link>{" "}
              à{" "}
              <Link
                href="/glossaire/yield-farming"
                className="text-primary-soft hover:text-primary underline-offset-2 hover:underline"
              >
                yield farming
              </Link>{" "}
              en passant par{" "}
              <Link
                href="/glossaire/psan"
                className="text-primary-soft hover:text-primary underline-offset-2 hover:underline"
              >
                PSAN
              </Link>{" "}
              et{" "}
              <Link
                href="/glossaire/mica"
                className="text-primary-soft hover:text-primary underline-offset-2 hover:underline"
              >
                MiCA
              </Link>
              .
            </p>
          </div>

          {/* Catégories */}
          <div className="mt-8 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {GLOSSARY_CATEGORIES.map((cat) => {
              const count = GLOSSARY_TERMS.filter((t) => t.category === cat).length;
              return (
                <span
                  key={cat}
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-elevated/60 px-3 py-1 text-xs text-fg-max/80"
                >
                  {cat}
                  <span className="text-muted">({count})</span>
                </span>
              );
            })}
          </div>

          {/* Navigation alphabétique */}
          <nav
            aria-label="Navigation alphabétique"
            className="mt-8 cr-colle z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-background/85 backdrop-blur-xl border-y border-border sm:border-0 sm:rounded-xl sm:bg-elevated/50 sm:px-4"
          >
            <ul className="flex flex-wrap gap-1.5">
              {ALPHABET.map((letter) => {
                const has = grouped[letter]?.length;
                return (
                  <li key={letter}>
                    {has ? (
                      <a
                        href={`#${letter.toLowerCase()}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-elevated text-sm font-semibold text-fg-max hover:border-primary hover:text-primary-soft transition-colors"
                      >
                        {letter}
                      </a>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/40 text-sm font-semibold text-fg-4 cursor-not-allowed"
                      >
                        {letter}
                      </span>
                    )}
                  </li>
                );
              })}
              {hasNumeric && (
                <li>
                  <a
                    href="#letter-num"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-elevated text-sm font-semibold text-fg-max hover:border-primary hover:text-primary-soft transition-colors"
                  >
                    #
                  </a>
                </li>
              )}
            </ul>
          </nav>

          {/* Sections par lettre */}
          <div className="mt-10 space-y-12">
            {hasNumeric && (
              <LetterSection letter="#" anchorId="letter-num" terms={grouped["#"]!} />
            )}
            {presentLetters.map((letter) => (
              <LetterSection
                key={letter}
                letter={letter}
                anchorId={letter.toLowerCase()}
                terms={grouped[letter]!}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function LetterSectionBase({
  letter,
  anchorId,
  terms,
}: {
  letter: string;
  anchorId: string;
  terms: ReturnType<typeof groupByLetter>[string];
}) {
  return (
    <section id={anchorId} className="scroll-mt-32">
      <div className="flex items-baseline gap-3 border-b border-border pb-3 mb-5">
        <h2 className="text-3xl font-extrabold gradient-text">{letter}</h2>
        <span className="text-sm text-muted">
          {terms.length} terme{terms.length > 1 ? "s" : ""}
        </span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {terms.map((t) => (
          <li key={t.id}>
            <Link
              href={`/glossaire/${t.id}`}
              className="group block h-full rounded-xl border border-border bg-elevated/40 p-4 hover:border-primary/60 hover:bg-elevated/70 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-fg-max group-hover:text-primary-soft">
                  {t.term}
                </h3>
                <ArrowRight className="h-4 w-4 text-muted shrink-0 mt-1 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="mt-1.5 text-xs text-muted">{t.category}</p>
              <p className="mt-2 text-sm text-fg-max/70 line-clamp-2">
                {t.shortDefinition}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const LetterSection = avecTypoSync(LetterSectionBase);

export default avecTypoSync(GlossaryIndexPage);
