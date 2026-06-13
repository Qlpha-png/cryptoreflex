import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, MapPin } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { breadcrumbSchema, graphSchema } from "@/lib/schema";
import StructuredData from "@/components/StructuredData";
import { withHreflang } from "@/lib/seo-alternates";
import { getAllCryptos } from "@/lib/cryptos";
import { COUNTRIES, COUNTRY_CODES } from "@/lib/programmatic-pages";
import AmfDisclaimer from "@/components/AmfDisclaimer";

/**
 * /acheter — HUB INDEX (créé 2026-06-13, audit maillage SEO).
 *
 * Le cluster /acheter/[crypto]/[pays] = 600 pages (100 cryptos × 6 pays)
 * n'avait AUCUN hub : pages découvrables seulement via le sitemap →
 * crawl/indexation faibles. Ce hub maille par pays (régulateur + fiscalité)
 * les top cryptos vers chaque guide d'achat → Google découvre le cluster.
 *
 * Compliance MiCA/AMF : wording 100 % ÉDUCATIF (« où acheter de façon
 * régulée », jamais « achète »). Pas de signal d'achat. Disclaimer présent.
 * 100 % statique (aucun fetch) → zéro coût build / quota.
 */

const PAGE_TITLE =
  "Où acheter une crypto en 2026 : guides par pays (France, Belgique, Suisse…)";
const PAGE_DESCRIPTION =
  "Comparez où et comment acheter chaque cryptomonnaie sur une plateforme régulée selon votre pays : France (AMF/PSAN), Belgique, Suisse (FINMA), Luxembourg, Monaco, Québec. Fiscalité et régulateur expliqués, sans jargon.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: withHreflang(`${BRAND.url}/acheter`),
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${BRAND.url}/acheter`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export const revalidate = 86400;

export default function AcheterHub() {
  // Top cryptos maillées par pays (les plus recherchées « acheter X »).
  const cryptos = getAllCryptos().slice(0, 24);
  const countries = COUNTRY_CODES.map((code) => COUNTRIES[code]);

  // FIX 2026-06-13 — ItemList du hub (comme /comparatif et /cryptos). Pointe
  // sur les fiches /cryptos/[id] (entités stables), pas les 600 /acheter/*.
  const cryptoItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${BRAND.url}/acheter#itemlist`,
    name: "Cryptomonnaies analysées par Cryptoreflex",
    description:
      "Cryptomonnaies pour lesquelles Cryptoreflex détaille où acheter sur une plateforme régulée et comment déclarer, selon votre pays.",
    numberOfItems: cryptos.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: cryptos.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${BRAND.url}/cryptos/${c.id}`,
      name: c.name,
    })),
  };

  const schema = graphSchema([
    cryptoItemList,
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Acheter une crypto", url: "/acheter" },
    ]),
  ]);

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="acheter-hub" data={schema} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <header className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[10px] font-mono font-bold text-primary uppercase tracking-wider mb-4">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            Plateformes régulées · {countries.length} pays
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-fg leading-tight">
            Où acheter une{" "}
            <span className="gradient-text">crypto</span> selon votre pays
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/75 max-w-2xl mx-auto leading-relaxed">
            Pour chaque cryptomonnaie, le détail des plateformes régulées, du
            régulateur compétent et de la fiscalité applicable — France,
            Belgique, Suisse, Luxembourg, Monaco et Québec. Information
            éducative, jamais un conseil d&apos;investissement.
          </p>
        </header>

        {/* Une section par pays : régulateur + cryptos maillées */}
        {countries.map((country) => (
          <section
            key={country.code}
            className="mt-10 first:mt-0"
            aria-labelledby={`pays-${country.code}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
              <h2
                id={`pays-${country.code}`}
                className="text-xl sm:text-2xl font-bold text-fg flex items-center gap-2"
              >
                <MapPin className="h-5 w-5 text-primary-soft" aria-hidden="true" />
                Acheter une crypto en {country.name}
              </h2>
              <span className="text-xs text-muted">
                Régulateur : {country.regulator} · {country.currency}
              </span>
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {cryptos.map((c) => (
                <li key={`${country.code}-${c.id}`}>
                  <Link
                    href={`/acheter/${c.id}/${country.code}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg/85 hover:border-primary/40 hover:text-primary-soft transition-colors"
                    aria-label={`Comment acheter ${c.name} en ${country.name}`}
                  >
                    {c.name}
                    <span className="text-muted font-normal">{c.symbol}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* Cross-link catalogue complet */}
        <section className="mt-16 rounded-2xl border border-border bg-surface/40 p-6 text-center">
          <h2 className="text-lg font-bold text-fg mb-3">
            Une autre crypto en tête ?
          </h2>
          <p className="text-sm text-muted mb-4 max-w-xl mx-auto">
            Nos 100 fiches détaillent, pour chaque cryptomonnaie, où l&apos;acheter
            sur une plateforme régulée et comment la déclarer.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/cryptos" className="btn-primary text-sm">
              Voir les 100 cryptos
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/comparatif" className="btn-ghost text-sm">
              Comparer les plateformes
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <div className="mt-12">
          <AmfDisclaimer variant="educatif" />
        </div>
      </div>
    </article>
  );
}
