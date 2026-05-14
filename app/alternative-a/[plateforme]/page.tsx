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
import { withHreflang } from "@/lib/seo-alternates";

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
/**
 * BUG FIX 2026-05-09 — `dynamicParams=true` autorisait n'importe quel slug
 * (`/alternative-a/bitcoin`, `/alternative-a/n-importe-quoi`) à rendre la
 * page générique au lieu d'une vraie 404. On force `false` : seuls les
 * slugs de la whitelist `generateStaticParams()` sont valides, le reste
 * remonte à `notFound()` proprement (HTTP 404 + boundary).
 */
export const dynamicParams = false;

/**
 * Whitelist des plateformes éligibles à `/alternative-a/[plateforme]`.
 *
 * On filtre `getAllPlatforms()` :
 *  - On garde tous les exchanges/brokers (catégorie ≠ "wallet").
 *  - On exclut explicitement les hardware wallets : "alternative à Ledger"
 *    n'a pas de sens dans cette taxonomie (le user cherche un exchange).
 *
 * Conséquence : `bitcoin` (et tout slug crypto/non-plateforme) → 404 propre.
 */
export function generateStaticParams() {
  return getAllPlatforms()
    .filter((p) => p.category !== "wallet")
    .map((p) => ({ plateforme: p.id }));
}

/**
 * Override metadata + alternatives count par plateforme.
 *
 * Audit GSC 2026-05-14 : `/alternative-a/crypto-com` et `/alternative-a/binance`
 * apparaissent en page 1 SERP (positions 7.1 et 6.5) avec 33-40 impressions
 * sur 28 jours mais **0 clic**. CTR à 0 % → snippet (title + description)
 * insuffisamment incitatif pour générer des clics.
 *
 * Patch : title + description spécifiques pour ces deux plateformes très
 * recherchées + augmentation du nombre d'alternatives affichées (cohérence
 * content/snippet pour éviter pénalité Google "title doesn't match content").
 *
 * Pour les autres plateformes, le pattern générique "5 alternatives" reste.
 * Wording validé ChatGPT 2026-05-14 :
 *   - comparatif/pédagogique (pas recommandation personnalisée)
 *   - pas de "meilleure plateforme pour vous"
 *   - pas de promesse de gain
 *   - pas de conseil financier
 */
const METADATA_OVERRIDES: Record<
  string,
  { title: string; description: string; altCount: number }
> = {
  "crypto-com": {
    title: "Alternatives à Crypto.com en France (2026) : 12 plateformes comparées",
    description:
      "Frais, sécurité, MiCA, support FR : comparez 12 alternatives à Crypto.com en France avec une méthode transparente et pédagogique.",
    altCount: 12,
  },
  binance: {
    title: "Alternatives à Binance en France (2026) : 10 plateformes à comparer",
    description:
      "Comparez 10 alternatives à Binance en France : frais, sécurité, conformité MiCA, support client et limites à connaître avant de choisir une plateforme.",
    altCount: 10,
  },
};

const DEFAULT_ALT_COUNT = 5;

export function generateMetadata({ params }: Props): Metadata {
  const target = getPlatformById(params.plateforme);
  if (!target || target.category === "wallet") return {};
  const override = METADATA_OVERRIDES[target.id];
  const title =
    override?.title ??
    `${DEFAULT_ALT_COUNT} alternatives à ${target.name} en 2026 — comparatif crypto FR`;
  const description =
    override?.description ??
    `Tu cherches à remplacer ${target.name} ? Voici ${DEFAULT_ALT_COUNT} plateformes crypto régulées MiCA/PSAN équivalentes ou meilleures sur frais, sécurité, support FR.`;
  return {
    title,
    description,
    alternates: withHreflang(`${BRAND.url}/alternative-a/${target.id}`),
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
  // Cohérence avec generateStaticParams : on refuse aussi les wallets ici
  // (defense in depth — au cas où dynamicParams serait remis à true).
  if (!target || target.category === "wallet") notFound();

  // FIX SEO 2026-05-14 — count alternatives dynamique pour matcher le
  // snippet annoncé (crypto-com=12, binance=10, autres=5). Évite pénalité
  // Google "title doesn't match content".
  const altCount = METADATA_OVERRIDES[target.id]?.altCount ?? DEFAULT_ALT_COUNT;
  const alternatives = findAlternatives(target, altCount);

  const schemas = graphSchema([
    articleSchema({
      slug: `alternative-a/${target.id}`,
      title: `${altCount} alternatives à ${target.name} en 2026`,
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
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/comparatif" className="hover:text-fg">Comparatif</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Alternative à {target.name}</span>
        </nav>

        <header className="mt-6">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            {altCount} alternatives à{" "}
            <span className="gradient-text">{target.name}</span>{" "}
            en 2026
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/80 leading-relaxed">
            Vous utilisez {target.name} mais souhaitez comparer avec d&apos;autres
            plateformes crypto régulées en France ? Voici {altCount} alternatives
            classées par notre scoring transparent (frais, sécurité, conformité
            MiCA, support FR). Comparatif informationnel, sans recommandation
            personnalisée.
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
