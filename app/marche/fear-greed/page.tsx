import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Flame, Info, ArrowRight } from "lucide-react";

import { fetchFearGreed } from "@/lib/coingecko";
import { BRAND } from "@/lib/brand";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";

import StructuredData from "@/components/StructuredData";
import FearGreedGauge from "@/components/FearGreedGauge";
import EmptyState from "@/components/ui/EmptyState";

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
  title: "Fear & Greed Index Bitcoin — Indice peur/cupidité crypto en direct",
  description:
    "L'indice Fear & Greed Bitcoin mesure le sentiment du marché crypto sur une échelle de 0 (peur extrême) à 100 (cupidité extrême). Mise à jour quotidienne, gauge visuelle et explications.",
  alternates: { canonical: PAGE_URL },
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
    a: "Le Fear & Greed Index est un indicateur composite qui mesure le sentiment du marché crypto sur une échelle de 0 à 100. 0 signifie une peur extrême (les investisseurs vendent) et 100 une cupidité extrême (FOMO d'achat). L'indicateur est calculé par alternative.me à partir de 6 sources : volatilité (25 %), momentum/volume (25 %), réseaux sociaux (15 %), dominance Bitcoin (10 %), tendances Google (10 %) et sondages (15 %).",
  },
  {
    q: "Comment utiliser l'indice Fear & Greed dans ma stratégie ?",
    a: "L'usage classique vient de Warren Buffett : 'Soyez craintif quand les autres sont avides, et avide quand les autres sont craintifs.' Concrètement, beaucoup d'investisseurs long terme accumulent quand l'indice est sous 25 (peur extrême) et prennent des bénéfices quand il dépasse 75 (cupidité). Ce n'est PAS un signal de timing parfait — l'indice peut rester en peur extrême plusieurs semaines pendant un bear market, ou en cupidité pendant tout un bull run.",
  },
  {
    q: "Le Fear & Greed est-il fiable pour prendre des décisions ?",
    a: "C'est un indicateur de sentiment, pas un signal d'achat ou de vente. Il fonctionne bien en complément d'autres analyses (cours, fondamentaux, on-chain) mais ne doit jamais être utilisé seul. Plusieurs études académiques ont montré une corrélation modérée avec les rendements futurs sur Bitcoin, mais avec des faux signaux fréquents. Considérez-le comme un thermomètre du marché, pas comme une boule de cristal.",
  },
  {
    q: "À quelle fréquence l'indice est-il mis à jour ?",
    a: "L'API publie un nouveau score chaque jour, généralement vers minuit UTC. Cette page Cryptoreflex met en cache la donnée pendant 1 heure côté serveur (ISR Next.js) pour économiser les appels API. Si vous voyez un score qui semble bloqué pendant plusieurs heures, c'est normal — alternative.me publie une seule valeur par jour.",
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
    dateModified: new Date().toISOString().slice(0, 10),
  };

  const schemas = graphSchema([
    webPageSchema,
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Marché", url: "/marche/heatmap" },
      { name: "Fear & Greed", url: "/marche/fear-greed" },
    ]),
    faqSchema(FAQ_ITEMS.map((f) => ({ question: f.q, answer: f.a }))),
  ]);

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={schemas} id="fear-greed-page" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-fg">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <Link href="/marche/heatmap" className="hover:text-fg">
            Marché
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Fear &amp; Greed</span>
        </nav>

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
            L'indicateur de référence pour mesurer le sentiment du marché crypto.
            De 0 (peur extrême) à 100 (cupidité extrême), réactualisé chaque jour
            par alternative.me. Un thermomètre, pas un signal d'achat.
          </p>
        </header>

        {/* Gauge */}
        {!fg ? (
          <EmptyState
            icon={<Activity className="h-6 w-6" aria-hidden="true" />}
            title="Indice indisponible"
            description="Notre fournisseur de sentiment (alternative.me) est temporairement injoignable. Réessaie dans quelques minutes."
            cta={{ label: "Réessayer", href: "/marche/fear-greed" }}
            secondaryCta={{ label: "Voir la heatmap", href: "/marche/heatmap" }}
          />
        ) : (
          <section className="glass rounded-3xl p-6 sm:p-10" aria-label="Jauge Fear & Greed">
            <FearGreedGauge value={fg.value} classification={fg.classification} />
            <p className="mt-4 text-center text-xs text-muted">
              Dernière mise à jour :{" "}
              <time dateTime={fg.timestamp}>
                {new Date(fg.timestamp).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </time>{" "}
              · Source : alternative.me · Cache serveur 1 h
            </p>
          </section>
        )}

        {/* Légende des zones */}
        <section className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Zone color="#dc2626" range="0 – 24" label="Peur extrême" hint="Marché paniqué, opportunités d'accumulation pour les long terme." />
          <Zone color="#f59e0b" range="25 – 49" label="Peur" hint="Sentiment baissier dominant, prudence." />
          <Zone color="#eab308" range="50 – 74" label="Neutre / Cupidité" hint="Marché équilibré qui penche vers l'optimisme." />
          <Zone color="#22c55e" range="75 – 100" label="Cupidité extrême" hint="Euphorie, FOMO. Souvent un sommet local approche." />
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
              <strong>Sondages (15 %)</strong> — sondages hebdomadaires auprès
              de la communauté crypto.
            </li>
          </ul>
        </section>

        {/* Section éducative — H2 2 */}
        <section className="mt-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Comment utiliser l'indice Fear &amp; Greed ?
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-accent-green/30 bg-accent-green/5 p-5">
              <h3 className="text-lg font-bold text-accent-green">
                Stratégie contrarienne
              </h3>
              <p className="mt-2 text-sm text-fg/85 leading-relaxed">
                "Soyez craintif quand les autres sont avides, avide quand les
                autres sont craintifs" — Warren Buffett. Beaucoup d'investisseurs
                accumulent en DCA quand l'indice est sous 25 et allègent
                progressivement quand il dépasse 75.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
              <h3 className="text-lg font-bold text-amber-300">
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
                Couplé au DCA
              </h3>
              <p className="mt-2 text-sm text-fg/85 leading-relaxed">
                Un usage simple : moduler la taille de tes achats DCA mensuels.
                Doubler la mise quand l'indice est sous 30, ne rien acheter
                quand il dépasse 80. Voir notre{" "}
                <Link href="/outils/simulateur-dca" className="underline hover:text-fg">
                  simulateur DCA
                </Link>
                .
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h3 className="text-lg font-bold text-fg">
                Comme indicateur de risque
              </h3>
              <p className="mt-2 text-sm text-fg/85 leading-relaxed">
                Quand l'indice dépasse 80 plusieurs jours d'affilée, c'est un
                bon moment pour vérifier sa hygiène : sortie partielle, prise
                de profit, sécurisation hardware wallet.
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
                  Un graphique d'historique sur 30, 90 et 365 jours sera
                  disponible prochainement (V2). En attendant, vous pouvez
                  consulter l'historique complet directement sur{" "}
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
                  {fg && ` (${fg.classification})`}, ce qui correspond à la
                  catégorie&nbsp;
                  {fg ? <strong>{zoneLabelFor(fg.value)}</strong> : "—"}.
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
              Combine le sentiment et la heatmap
            </h2>
            <p className="mt-1 text-sm text-fg/70">
              Visualise les variations 24h du top 100 crypto pour voir si le
              marché est rouge, vert, ou mitigé.
            </p>
          </div>
          <Link href="/marche/heatmap" className="btn-primary shrink-0">
            Voir la heatmap top 100
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </aside>

        {/* Mentions */}
        <p className="mt-8 text-[11px] text-muted leading-relaxed">
          Données fournies par alternative.me (cache serveur 1 h). Cette page
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
  range,
  label,
  hint,
}: {
  color: string;
  range: string;
  label: string;
  hint: string;
}) {
  return (
    <div
      className="rounded-xl border bg-surface p-4"
      style={{ borderColor: color + "55" }}
    >
      <div
        className="text-[11px] font-mono uppercase tracking-wider"
        style={{ color }}
      >
        {range}
      </div>
      <div className="mt-1 text-sm font-bold text-fg">{label}</div>
      <div className="mt-1 text-xs text-muted">{hint}</div>
    </div>
  );
}

function zoneLabelFor(v: number): string {
  if (v <= 24) return "Peur extrême";
  if (v <= 49) return "Peur";
  if (v <= 74) return "Neutre / Cupidité";
  return "Cupidité extrême";
}
