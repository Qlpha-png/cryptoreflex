import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Flame, Info, ArrowRight } from "lucide-react";

import { fetchFearGreed } from "@/lib/coingecko";
import { BRAND } from "@/lib/brand";
import { faqSchema, graphSchema, type JsonLd } from "@/lib/schema";

import StructuredData from "@/components/StructuredData";
import FearGreedGauge from "@/components/FearGreedGauge";
import EmptyState from "@/components/ui/EmptyState";
import { withHreflang } from "@/lib/seo-alternates";
import { fitDescription, fitTitle } from "@/lib/seo-text";
import FearGreedSource, { FEAR_GREED_SOURCE_URL } from "@/components/FearGreedSource";
import Breadcrumbs from "@/components/Breadcrumbs";

/**
 * /marche/fear-greed — Page dédiée à l'index Fear & Greed Bitcoin.
 *
 * Server Component, ISR 1h (l'API alternative.me publie un point par jour).
 * Différenciation : affichage gauge SVG visuelle, pédagogie étendue, FAQ
 * structurée pour ranker sur "fear and greed bitcoin", "indice peur cupidité crypto".
 */

export const revalidate = 3600;

const PAGE_URL = `${BRAND.url}/marche/fear-greed`;

export const metadata: Metadata = {
  title: fitTitle("Fear & Greed Index Bitcoin — Indice peur/cupidité crypto en direct"),
  description: fitDescription(
    "L'indice Fear & Greed Bitcoin mesure le sentiment du marché crypto sur une échelle de 0 (peur extrême) à 100 (cupidité extrême). Mise à jour quotidienne, gauge visuelle et explications.",
  ),
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    title: "Fear & Greed Index Bitcoin — Sentiment crypto en direct",
    description:
      "L'indicateur de sentiment du marché crypto le plus suivi : score 0-100, classification, mise à jour quotidienne.",
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fear & Greed Index Bitcoin",
    description:
      "Indice de peur et de cupidité du marché crypto, mis à jour quotidiennement.",
  },
  keywords: [
    "fear and greed bitcoin",
    "fear and greed index crypto",
    "indice peur cupidité crypto",
    "sentiment marché crypto",
    "indicateur crypto",
  ],
};

const FAQ_ITEMS = [
  {
    q: "Qu'est-ce que le Fear & Greed Index Bitcoin ?",
    a: "Le Fear & Greed Index est un indicateur composite qui mesure le sentiment du marché crypto sur une échelle de 0 à 100. 0 signifie une peur extrême (les investisseurs vendent) et 100 une cupidité extrême (FOMO d'achat). L'indicateur est calculé par alternative.me à partir de 6 sources : volatilité (25 %), momentum/volume (25 %), réseaux sociaux (15 %), dominance Bitcoin (10 %), tendances Google (10 %) et sondages (15 %, en pause selon alternative.me, page lue le 10/10/2026).",
  },
  {
    q: "Comment utiliser l'indice Fear & Greed dans ma stratégie ?",
    a: "L'indice décrit le sentiment du marché ; il ne donne ni moment d'achat ni moment de vente. Il peut rester en peur extrême plusieurs semaines, ou en cupidité pendant toute une hausse.",
  },
  {
    q: "Le Fear & Greed est-il fiable pour prendre des décisions ?",
    a: "C'est un indicateur de sentiment, pas un signal d'achat ou de vente. Il fonctionne bien en complément d'autres analyses (cours, fondamentaux, on-chain) mais ne doit jamais être utilisé seul. Considérez-le comme un thermomètre du marché, pas comme une boule de cristal.",
  },
  {
    q: "À quelle fréquence l'indice est-il mis à jour ?",
    a: "alternative.me publie une valeur par jour. La date de la valeur affichée est indiquée sous la jauge.",
  },
  {
    q: "Quelle est la différence avec le Fear & Greed des actions ?",
    a: "L'indice Fear & Greed crypto est calqué sur celui de CNN Money pour les actions, mais les sources et pondérations sont différentes. Le marché crypto étant 24/7 et très volatile, l'indice crypto réagit beaucoup plus vite. Une chute de 10 % en une heure sur Bitcoin peut faire passer l'indice de 65 à 30 en quelques heures, là où l'indice actions évolue par sessions journalières.",
  },
];

export default async function FearGreedPage() {
  const fg = await fetchFearGreed();

  const webPageSchema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${PAGE_URL}#webpage`,
    name: "Fear & Greed Index Bitcoin — Indice de sentiment du marché crypto",
    description:
      "Page dédiée à l'indice Fear & Greed Bitcoin : score 0-100, classification, gauge visuelle, pédagogie complète.",
    url: PAGE_URL,
    inLanguage: "fr-FR",
    isPartOf: { "@id": `${BRAND.url}/#website` },
    about: {
      "@type": "Thing",
      name: "Fear and Greed Index",
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${BRAND.url}/og-image.png`,
    },
    datePublished: "2026-04-25",
    // 08/10/2026 (lot fraîcheur A) : date du relevé de l'indice (alternative.me), jamais l'heure du rendu ; omise sans relevé
    ...(fg?.timestamp ? { dateModified: fg.timestamp } : {}),
  };

  const schemas = graphSchema([
    webPageSchema,
    faqSchema(FAQ_ITEMS.map((f) => ({ question: f.q, answer: f.a }))),
  ]);

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={schemas} id="fear-greed-page" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Breadcrumbs chemin="/marche/fear-greed" />

        {/* Header */}
        <header className="mt-6 mb-10">
          <span className="badge-info">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            Sentiment marché en direct
          </span>
          <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Fear &amp; Greed Index Bitcoin{" "}
            {fg && (
              <span className="gradient-text">
                — actuellement {fg.value}/100
              </span>
            )}
          </h1>
          <p className="mt-3 text-base text-muted max-w-2xl">
            De 0 (peur extrême) à 100 (cupidité extrême), publié chaque jour par{" "}
            <a href={FEAR_GREED_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-fg">
              alternative.me
            </a>
            . Un thermomètre, pas un signal d'achat.
          </p>
        </header>

        {/* Gauge */}
        {!fg ? (
          <EmptyState
            icon={<Activity className="h-6 w-6" aria-hidden="true" />}
            title="Indice indisponible"
            description="Notre fournisseur de sentiment (alternative.me) est temporairement injoignable. Réessayez dans quelques minutes."
            cta={{ label: "Réessayer", href: "/marche/fear-greed" }}
            secondaryCta={{ label: "Voir la heatmap", href: "/marche/heatmap" }}
          />
        ) : (
          <section className="glass rounded-3xl p-6 sm:p-10" aria-label="Jauge Fear & Greed">
            <FearGreedGauge value={fg.value} classification={fg.classification} showSource={false} />
            <p className="mt-4 text-center text-xs text-muted">
              Valeur du{" "}
              <time dateTime={fg.timestamp}>
                {new Date(fg.timestamp).toLocaleDateString("fr-FR", {
                  timeZone: "Europe/Paris",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>{" "}
              · <FearGreedSource source={fg.source} />
            </p>
          </section>
        )}

        {/* Légende des zones */}
        <section className="mt-10 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* lot Z4 : les 5 classes publiées par alternative.me, sans seuils chiffrés (alternative.me n'en publie aucun) */}
          <Zone color="#dc2626" border="#dc262655" label="Peur extrême" hint="Sentiment très négatif." />
          <Zone color="rgb(var(--c-warning))" border="rgb(var(--c-warning) / 0.3333333)" label="Peur" hint="Sentiment négatif." />
          <Zone color="#eab308" border="#eab30855" label="Neutre" hint="Sentiment équilibré." />
          <Zone color="rgb(var(--c-success) / 0.6)" border="rgb(var(--c-success) / 0.2)" label="Cupidité" hint="Sentiment positif." />
          <Zone color="rgb(var(--c-success))" border="rgb(var(--c-success) / 0.3333333)" label="Cupidité extrême" hint="Sentiment euphorique." />
        </section>

        {/* Section éducative — H2 1 */}
        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Qu'est-ce que le Fear &amp; Greed Index ?
          </h2>
          <p className="mt-4 text-base text-fg/85 leading-relaxed">
            Le <strong>Fear &amp; Greed Index</strong> (indice peur et cupidité)
            est un score composite qui résume en un seul nombre le sentiment
            général du marché crypto. Calculé chaque jour par{" "}
            <a
              href="https://alternative.me/crypto/fear-and-greed-index/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-fg"
            >
              alternative.me
            </a>
            , il combine six sources pondérées :
          </p>
          <ul className="mt-4 space-y-2 text-sm text-fg/85 list-disc pl-5 marker:text-primary">
            <li>
              <strong>Volatilité (25 %)</strong> — comparaison de la volatilité
              actuelle vs moyenne 30/90 jours. Volatilité haute = peur.
            </li>
            <li>
              <strong>Momentum / volume (25 %)</strong> — volume d'achat actuel
              vs moyenne. Volume élevé sur des hausses = cupidité.
            </li>
            <li>
              <strong>Réseaux sociaux (15 %)</strong> — analyse de l'activité
              Twitter (mentions, hashtags, vélocité).
            </li>
            <li>
              <strong>Dominance Bitcoin (10 %)</strong> — quand les altcoins
              chutent et que les capitaux refluent vers BTC, c'est de la peur.
            </li>
            <li>
              <strong>Tendances Google (10 %)</strong> — recherches sur "Bitcoin
              price manipulation" = peur, "Bitcoin price prediction" = cupidité.
            </li>
            <li>
              <strong>Sondages (15 %)</strong> — en pause selon alternative.me
              (page lue le 10/10/2026).
            </li>
          </ul>
        </section>

        {/* Section éducative — H2 2 */}
        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Comment utiliser l'indice Fear &amp; Greed ?
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* reprise Z4 : plus aucun seuil d'achat ou de vente (alternative.me n'en publie aucun ; ce serait un conseil) */}
            <div className="rounded-2xl border border-accent-green/30 bg-accent-green/5 p-5">
              <h3 className="text-lg font-bold text-accent-green">
                Un thermomètre du sentiment
              </h3>
              <p className="mt-2 text-sm text-fg/85 leading-relaxed">
                L&apos;indice décrit le sentiment du marché ; il ne donne ni
                moment d&apos;achat ni moment de vente.
              </p>
            </div>
            <div className="rounded-2xl border border-warning/30 bg-warning/5 p-5">
              <h3 className="text-lg font-bold text-primary-soft">
                Limite : pas un signal magique
              </h3>
              <p className="mt-2 text-sm text-fg/85 leading-relaxed">
                L'indice peut rester en peur extrême pendant des semaines en
                bear market, et en cupidité pendant tout un bull run. Ne pas
                l'utiliser seul. À combiner avec analyse fondamentale,
                techniques, on-chain.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h3 className="text-lg font-bold text-fg">
                Et l&apos;investissement programmé ?
              </h3>
              <p className="mt-2 text-sm text-fg/85 leading-relaxed">
                Un investissement programmé (DCA) fixe le montant et la date à
                l&apos;avance, quel que soit le sentiment du jour. Voir notre{" "}
                <Link href="/outils/simulateur-dca" className="underline hover:text-fg">
                  simulateur DCA
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* Section éducative — H2 3 (placeholder historique V2) */}
        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Historique récent
          </h2>
          <div className="mt-4 rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm text-fg/85 leading-relaxed">
                  L&apos;historique complet est publié sur{" "}
                  <a
                    href="https://alternative.me/crypto/fear-and-greed-index/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-fg"
                  >
                    alternative.me
                  </a>
                  .
                </p>
                <p className="mt-3 text-xs text-muted">
                  Le score actuel est{" "}
                  <strong>{fg ? `${fg.value}/100` : "indisponible"}</strong>
                  {fg && ` (${fg.classification})`}.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Questions fréquentes
          </h2>
          <div className="mt-5 space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-surface px-5 py-4 open:bg-elevated"
              >
                <summary className="cursor-pointer list-none font-semibold text-fg flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-muted group-open:rotate-180 transition-transform shrink-0">
                    {"▾"}
                  </span>
                </summary>
                <p className="mt-3 text-sm text-fg/80 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Cross-link */}
        <aside className="mt-12 glass rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-fg">
              Croisez le sentiment et la heatmap
            </h2>
            <p className="mt-1 text-sm text-fg/70">
              Visualisez les variations 24 h du top 100 crypto pour voir si le
              marché est rouge, vert ou mitigé.
            </p>
          </div>
          <Link href="/marche/heatmap" className="btn-primary shrink-0">
            Voir la heatmap top 100
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </aside>

        {/* Mentions */}
        <p className="mt-8 text-xs text-muted leading-relaxed">
          Indice :{" "}
          <a href={FEAR_GREED_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-fg">
            alternative.me
          </a>
          . Cette page
          est purement informative et ne constitue pas un conseil en
          investissement. Investir dans les cryptomonnaies comporte un risque
          de perte en capital. Voir notre{" "}
          <Link href="/methodologie" className="underline hover:text-fg">
            méthodologie
          </Link>
          .
        </p>
      </div>
    </article>
  );
}

function Zone({
  color,
  border,
  label,
  hint,
}: {
  color: string;
  /** Bordure explicite (jamais color + "55", qui casse avec une variable). */
  border: string;
  label: string;
  hint: string;
}) {
  return (
    <div
      className="rounded-xl border bg-surface p-4"
      style={{ borderColor: border }}
    >
      <div className="h-1.5 w-8 rounded-full" style={{ background: color }} aria-hidden="true" />
      <div className="mt-1 text-sm font-bold text-fg">{label}</div>
      <div className="mt-1 text-xs text-muted">{hint}</div>
    </div>
  );
}


