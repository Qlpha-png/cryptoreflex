import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Star, Trophy, ShieldCheck } from "lucide-react";

import { getAllPlatforms, getPlatformById, type Platform } from "@/lib/platforms";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import {
  articleSchema,
  breadcrumbSchema,
  graphSchema,
} from "@/lib/schema";
import RelatedPagesNav from "@/components/RelatedPagesNav";
import NextStepsGuide from "@/components/NextStepsGuide";
import Tldr from "@/components/ui/Tldr";
import AmfDisclaimer from "@/components/AmfDisclaimer";

/**
 * /alternative-a/[plateforme] — Programmatic SEO intent transactionnel pur.
 *
 * Audit expert SEO programmatic 2026-05-02 : 70 plateformes ~70 URLs avec
 * intent commercial très haut ("alternative à Binance", "alternative à
 * Coinbase"). Conversion affiliation forte car le user CHERCHE à migrer.
 *
 * Algo : pour chaque plateforme, on liste les 5 plus proches en :
 * - Régulation (MiCA / PSAN même tier)
 * - Catégorie (exchange / broker)
 * - Score global proche
 * - Frais comparables
 *
 * Phase actuelle : génération statique pour les 34 plateformes existantes.
 */

interface Props {
  params: { plateforme: string };
}

export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams() {
  return getAllPlatforms().map((p) => ({ plateforme: p.id }));
}

export function generateMetadata({ params }: Props): Metadata {
  const target = getPlatformById(params.plateforme);
  if (!target) return {};
  const title = `5 alternatives à ${target.name} en 2026 — comparatif crypto FR`;
  const description = `Tu cherches à remplacer ${target.name} ? Voici 5 plateformes crypto régulées MiCA/PSAN équivalentes ou meilleures sur frais, sécurité, support FR.`;
  return {
    title,
    description,
    alternates: { canonical: `${BRAND.url}/alternative-a/${target.id}` },
    openGraph: {
      title,
      description,
      url: `${BRAND.url}/alternative-a/${target.id}`,
      type: "article",
    },
  };
}

/**
 * Algo de scoring "proximité" : on veut les 5 plateformes les plus
 * comparables au target (même catégorie, régulation similaire, score
 * proche). Exclut le target lui-même.
 */
function findAlternatives(target: Platform, limit = 5): Platform[] {
  const all = getAllPlatforms().filter((p) => p.id !== target.id);
  const scored = all.map((p) => {
    let score = 0;
    if (p.category === target.category) score += 10;
    if (p.mica?.micaCompliant === target.mica?.micaCompliant) score += 5;
    // Bonus proximité scoring global (proche = mieux)
    const scoreDiff = Math.abs((p.scoring?.global ?? 0) - (target.scoring?.global ?? 0));
    score += Math.max(0, 10 - scoreDiff * 5);
    // Bonus régulation MiCA explicite
    if (p.mica?.status?.includes("MiCA") && target.mica?.status?.includes("MiCA")) {
      score += 3;
    }
    return { p, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

export default function AlternativePage({ params }: Props) {
  const target = getPlatformById(params.plateforme);
  if (!target) notFound();

  const alternatives = findAlternatives(target, 5);

  const schemas = graphSchema([
    articleSchema({
      slug: `alternative-a/${target.id}`,
      title: `5 alternatives à ${target.name} en 2026`,
      description: `Comparatif des plateformes crypto FR équivalentes ou meilleures que ${target.name}.`,
      date: "2026-05-02",
      dateModified: "2026-05-02",
      category: "Comparatif",
      tags: [target.name, "alternative", "comparatif", "MiCA"],
    }),
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Alternatives", url: "/alternative-a" },
      { name: target.name, url: `/alternative-a/${target.id}` },
    ]),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="alternative-a" data={schemas} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/comparatif" className="hover:text-fg">Comparatif</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Alternative à {target.name}</span>
        </nav>

        <header className="mt-6">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            5 alternatives à{" "}
            <span className="gradient-text">{target.name}</span>{" "}
            en 2026
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/80 leading-relaxed">
            Tu utilises {target.name} mais tu veux comparer avec d&apos;autres
            plateformes crypto régulées en France ? Voici 5 alternatives
            crédibles classées par notre scoring (frais, sécurité, MiCA, support FR).
          </p>
        </header>

        <div className="mt-8">
          <Tldr
            headline={`Top 5 alternatives à ${target.name} : plateformes équivalentes ou meilleures sur les critères clés.`}
            bullets={[
              { emoji: "🏆", text: `Notre #1 alternative : ${alternatives[0]?.name ?? "—"}` },
              { emoji: "⚖️", text: "Toutes régulées MiCA ou PSAN AMF" },
              { emoji: "🇫🇷", text: "Sélection adaptée au public français" },
              { emoji: "💸", text: "Comparaison frais, sécurité, score global Cryptoreflex" },
            ]}
            readingTime="4 min"
            level="Tous niveaux"
          />
        </div>

        {/* Cards des 5 alternatives */}
        <section className="mt-12 space-y-5">
          {alternatives.map((alt, i) => (
            <article
              key={alt.id}
              className="hover-lift rounded-2xl border border-border bg-surface p-6"
            >
              <header className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <h2 className="text-xl font-bold">{alt.name}</h2>
                    <p className="text-xs text-muted mt-0.5">{alt.tagline}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1 text-sm font-bold text-fg">
                    <Star className="h-3.5 w-3.5 text-primary fill-primary" aria-hidden />
                    {alt.scoring?.global?.toFixed(1) ?? "—"}/5
                  </div>
                  {alt.mica?.micaCompliant && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                      <ShieldCheck className="h-2.5 w-2.5" aria-hidden /> MiCA
                    </div>
                  )}
                </div>
              </header>

              {alt.strengths && alt.strengths.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-wider text-success font-bold">
                    Points forts
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-sm text-fg/85">
                    {alt.strengths.slice(0, 3).map((s, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="text-success" aria-hidden>•</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/avis/${alt.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-fg hover:border-primary/40"
                >
                  Voir l&apos;avis détaillé
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
                <Link
                  href={`/comparer/${[target.id, alt.id].sort().join("-vs-")}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-fg hover:border-primary/40"
                >
                  Comparer avec {target.name}
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </div>
            </article>
          ))}
        </section>

        {/* Section "pourquoi changer" */}
        <section className="mt-12 rounded-2xl border border-border bg-elevated/40 p-6">
          <h2 className="text-xl font-bold">
            Pourquoi changer de plateforme ?
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-fg/85 leading-relaxed">
            <li>• <strong>Frais trop élevés</strong> : si tu trades plus de 1000 €/mois, comparer les makers/takers fait économiser 50-200 €/an.</li>
            <li>• <strong>Conformité MiCA</strong> : certaines plateformes vont voir leur statut évoluer en juillet 2026 (Phase 2). Anticipe.</li>
            <li>• <strong>Catalogue limité</strong> : si tu cherches une crypto spécifique non listée chez {target.name}, il faut élargir.</li>
            <li>• <strong>Support FR</strong> : si {target.name} n&apos;a pas de support en français, c&apos;est un facteur de friction réel.</li>
            <li>• <strong>Diversification du risque plateforme</strong> : ne mets pas tous tes œufs dans le même exchange (cf. FTX 2022).</li>
          </ul>
        </section>

        {/* Disclaimer */}
        <div className="mt-10">
          <AmfDisclaimer variant="comparatif" />
        </div>

        {/* Maillage */}
        <div className="mt-12">
          <RelatedPagesNav
            currentPath={`/alternative-a/${target.id}`}
            variant="default"
            limit={4}
          />
        </div>
        <div className="mt-12">
          <NextStepsGuide context="comparator" />
        </div>
      </div>
    </article>
  );
}
