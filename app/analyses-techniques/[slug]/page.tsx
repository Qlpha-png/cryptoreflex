import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import Breadcrumbs from "@/components/Breadcrumbs";
import AnalyseVivante from "@/components/analyses/AnalyseVivante";
import { withHreflang } from "@/lib/seo-alternates";
import { fitDescription, fitTitle } from "@/lib/seo-text";
import { TA_SLUGS, descriptionAnalyse, getAnalyse, h1Analyse, nomAvecSymbole, premierCalcul, titreAnalyse } from "@/lib/analyses-techniques";

/**
 * /analyses-techniques/<crypto> — page VIVANTE (lot L2 du regroupement, 08/10/2026) : 5 adresses fixes (bitcoin,
 * ethereum, solana, xrp, cardano), mises à jour chaque jour par le robot (data/analyses-techniques/<slug>.json).
 * Les 368 anciennes adresses datées « AAAA-MM-JJ-<sym>-analyse-technique » répondent 301 vers ces pages (middleware.ts,
 * règle R1, sans lecture de données).
 *
 * SSG pur, SANS revalidate (FIX SEO 2026-06-11, gardé) : avec `revalidate`, Next 14 rend la not-found co-localisée en
 * HTTP 200 (soft-404) même avec dynamicParams=false ; sans revalidate, un slug inconnu répond un vrai 404 (règle R2).
 * Le robot pousse ses données chaque matin : le déploiement qui suit reconstruit les 5 pages.
 */
export const dynamicParams = false;

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return TA_SLUGS.map((slug) => ({ slug }));
}

// Reprise L2 (08/10/2026) : PriceChart RETIRÉ de ces pages (cours « live » d'une autre source que Kraken, courbe rouge
// à la baisse, bloc vide quand l'API ne répond pas). La courbe des 30 clôtures Kraken est rendue côté serveur.

export function generateMetadata({ params }: Props): Metadata {
  const a = getAnalyse(params.slug);
  if (!a) return { robots: { index: false, follow: false } };
  const url = `${BRAND.url}/analyses-techniques/${a.slug}`;
  return {
    title: fitTitle(titreAnalyse(a)),
    description: fitDescription(descriptionAnalyse(a)),
    alternates: withHreflang(url),
    openGraph: {
      title: titreAnalyse(a),
      description: fitDescription(descriptionAnalyse(a)),
      url,
      type: "article",
      modifiedTime: a.latest.calculatedAt,
    },
  };
}

export default function AnalyseTechniquePage({ params }: Props) {
  const a = getAnalyse(params.slug);
  if (!a) notFound();
  const url = `${BRAND.url}/analyses-techniques/${a.slug}`;

  /* Article : dateModified = horodatage du dernier calcul réussi ; auteur = l'organisation (décision D3 du 06/10/2026 :
     contenu publié automatiquement → pas de fiche auteur). Le BreadcrumbList est émis par le fil d'Ariane (unique). */
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: h1Analyse(a),
    description: fitDescription(descriptionAnalyse(a)),
    datePublished: premierCalcul(a),
    dateModified: a.latest.calculatedAt,
    author: { "@type": "Organization", name: BRAND.name, url: BRAND.url },
    publisher: { "@type": "Organization", name: BRAND.name, url: BRAND.url, logo: { "@type": "ImageObject", url: `${BRAND.url}/api/logo` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: "Analyse technique",
    inLanguage: "fr-FR",
    isAccessibleForFree: true,
    about: { "@type": "Thing", name: nomAvecSymbole(a) },
  };

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={articleLd} id={`analyse-${a.slug}`} />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs chemin={`/analyses-techniques/${a.slug}`} label={nomAvecSymbole(a)} className="mb-6" />
        <AnalyseVivante analyse={a} url={url} />
      </div>
    </article>
  );
}
