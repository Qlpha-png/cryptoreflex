import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, ArrowRight, BookOpen } from "lucide-react";

import data from "@/data/faq-crypto.json";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
} from "@/lib/schema";

/**
 * /faq-crypto — Hub FAQ XL crypto FR (BLOC 5, 2026-05-04).
 *
 * User feedback : "ameliorations possibles dans chaque categorie" - Apprendre.
 * Mot-cle long-tail enorme : "FAQ crypto FR", "questions crypto debutant",
 * "comment declarer crypto impots", etc. JSON-LD FAQ riche = eligible aux
 * Featured Snippets Google + People Also Ask.
 *
 * Pattern : Server Component pur. Liste 6 categories x ~3 questions = ~20
 * Q&A curated editorialement (debutant, fiscalite, securite, regulation,
 * trading, DeFi). Donnees dans data/faq-crypto.json -> facile d'etendre.
 *
 * SEO : indexable, hreflang multi-region, JSON-LD FAQ schema (le plus
 * puissant pour le ranking long-tail Google).
 */

interface Category {
  id: string;
  title: string;
  intro: string;
}

interface QnA {
  id: string;
  category: string;
  question: string;
  answer: string;
}

interface FaqFile {
  _meta: { lastUpdated: string; source: string; schemaVersion: string };
  categories: Category[];
  questions: QnA[];
}

const FILE = data as FaqFile;
const CATEGORIES = FILE.categories;
const QUESTIONS = FILE.questions;

export const revalidate = 86400;

const PAGE_PATH = "/faq-crypto";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const TITLE = `FAQ crypto FR : ${QUESTIONS.length} questions claires (debutant, fiscalite, securite)`;
const DESCRIPTION = `${QUESTIONS.length} questions / reponses sur les cryptos en France : comment debuter, fiscalite PFU 30%, MiCA juillet 2026, securite seed phrase, DeFi, staking. Reponses honnetes, sources officielles, mises a jour 2026.`;

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
    "FAQ crypto",
    "questions crypto debutant",
    "comment acheter bitcoin france",
    "fiscalite crypto 2026",
    "MiCA juillet 2026",
    "seed phrase securite",
    "DCA crypto",
    "staking sur",
  ],
  robots: { index: true, follow: true },
};

export default function FaqCryptoPage() {
  // Group questions by category
  const byCategory = new Map<string, QnA[]>();
  for (const q of QUESTIONS) {
    const arr = byCategory.get(q.category) ?? [];
    arr.push(q);
    byCategory.set(q.category, arr);
  }

  // JSON-LD : on prend les TOP questions (max 30) pour le FAQPage schema
  const topQuestions = QUESTIONS.slice(0, 30).map((q) => ({
    question: q.question,
    answer: q.answer,
  }));

  const schemas = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "FAQ crypto", url: PAGE_PATH },
    ]),
    faqSchema(topQuestions),
  ]);

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={schemas} id="faq-crypto" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">FAQ crypto</span>
        </nav>

        {/* Header */}
        <header className="mt-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <HelpCircle className="h-3.5 w-3.5" />
            FAQ crypto FR
          </div>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
            <span className="gradient-text">{QUESTIONS.length} questions</span>
            <br />
            que tout investisseur crypto FR doit connaitre
          </h1>
          <p className="mt-3 text-base text-muted">
            <strong className="text-fg">{CATEGORIES.length} categories</strong>{" "}
            (debuter, fiscalite, securite, regulation, trading, DeFi). Reponses
            honnetes, sources officielles (BOFiP, AMF, ESMA), mises a jour 2026.
          </p>
        </header>

        {/* Table of contents */}
        <nav
          aria-label="Categories FAQ"
          className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {CATEGORIES.map((cat) => {
            const count = byCategory.get(cat.id)?.length ?? 0;
            return (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className="group rounded-xl border border-border bg-surface p-4 hover:border-primary/40 transition-colors"
              >
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  {count} question{count > 1 ? "s" : ""}
                </div>
                <div className="mt-1 text-sm font-bold text-fg group-hover:text-primary-glow transition-colors">
                  {cat.title}
                </div>
                <div className="mt-1 text-[11px] text-muted line-clamp-2">
                  {cat.intro}
                </div>
              </a>
            );
          })}
        </nav>

        {/* Sections */}
        {CATEGORIES.map((cat) => {
          const questions = byCategory.get(cat.id) ?? [];
          if (questions.length === 0) return null;
          return (
            <section
              key={cat.id}
              id={cat.id}
              className="mt-12 scroll-mt-24"
            >
              <header className="border-b border-border pb-3">
                <h2 className="text-xl sm:text-2xl font-bold text-fg">
                  {cat.title}
                </h2>
                <p className="mt-1 text-sm text-muted">{cat.intro}</p>
              </header>

              <div className="mt-4 space-y-3">
                {questions.map((q) => (
                  <details
                    key={q.id}
                    className="group rounded-xl border border-border bg-surface p-4 sm:p-5 [&[open]]:border-primary/40 [&[open]]:bg-elevated/30"
                  >
                    <summary className="flex items-start gap-3 cursor-pointer list-none">
                      <span className="text-[11px] font-mono font-bold text-primary-soft mt-0.5">
                        Q.
                      </span>
                      <h3 className="flex-1 text-sm sm:text-base font-bold text-fg">
                        {q.question}
                      </h3>
                      <ArrowRight
                        className="h-4 w-4 text-muted shrink-0 mt-1 transition-transform group-open:rotate-90"
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="mt-3 pl-6 text-sm text-fg/85 leading-relaxed">
                      {q.answer}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          );
        })}

        {/* CTA cross-link */}
        <section className="mt-16 grid gap-3 sm:grid-cols-2">
          <Link
            href="/blog"
            className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-2">
              <BookOpen className="h-3 w-3" />
              Plus loin
            </div>
            <div className="mt-2 text-base font-bold text-fg">
              Blog &amp; guides crypto
            </div>
            <div className="mt-1 text-xs text-muted">
              100+ articles approfondis (8-15 min de lecture)
            </div>
          </Link>
          <Link
            href="/glossaire"
            className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-2">
              <BookOpen className="h-3 w-3" />
              Definitions
            </div>
            <div className="mt-2 text-base font-bold text-fg">
              Glossaire 250+ termes
            </div>
            <div className="mt-1 text-xs text-muted">
              DeFi, fiscalite, on-chain, technique
            </div>
          </Link>
        </section>

        <p className="mt-12 text-[11px] text-muted leading-relaxed">
          FAQ mise a jour le {FILE._meta.lastUpdated}. Sources : BOFiP-Impots,
          AMF, ESMA, et notre experience editoriale Cryptoreflex. Cette page
          n&apos;est pas un conseil en investissement personnalise, mais une
          ressource educative. Voir notre{" "}
          <Link href="/methodologie" className="underline hover:text-fg">
            methodologie publique
          </Link>{" "}
          et{" "}
          <Link href="/transparence" className="underline hover:text-fg">
            page transparence
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
