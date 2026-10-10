import Link from "next/link";
import { filAriane, type Miette } from "@/lib/nav-data";
import { jsonLdSafe } from "@/lib/schema";
import { BRAND } from "@/lib/brand";
import { typoFr, typoFrRiche } from "@/lib/typo-fr";

/**
 * Breadcrumbs — LE fil d'Ariane du site (lot B3a, 08/10/2026 ; architecture § 8).
 *
 * Accueil › Rubrique (lien vers son hub) › page parente éventuelle › page, calculé par filAriane() depuis
 * lib/nav-data.ts (rubriqueDe) : l'onglet allumé et le fil suivent la même rubrique.
 *
 * Il émet LE BreadcrumbList JSON-LD de la page, construit depuis la même liste que le fil visible (mêmes noms,
 * mêmes positions, mêmes adresses, aucune ancre). Aucun autre fichier n'émet de BreadcrumbList :
 * tests/components/breadcrumbs.test.tsx le vérifie sur tout app/, components/ et lib/.
 *
 * Rendu serveur, liens <a href> ; « aria-current="page" » sur la page courante (non cliquable).
 *
 * Usage :
 *   <Breadcrumbs chemin="/outils/cerfa-2086-auto" />                       page fixe : nom lu dans LIBELLE_DE
 *   <Breadcrumbs chemin={`/cryptos/${slug}`} label={crypto.name} />         gabarit : nom de l'instance
 *   <Breadcrumbs chemin={`/cryptos/${slug}/acheter-en-france`} label="…" parent={{ href: `/cryptos/${slug}`, label: crypto.name }} />
 */

const SITE = BRAND.url.replace(/\/+$/, "");

export interface BreadcrumbsProps {
  /** Adresse réelle de la page (« /cryptos/bitcoin »). */
  chemin: string;
  /** Nom de la page ; obligatoire pour un gabarit. */
  label?: string;
  /** Parent réel quand il est lui-même un gabarit (fiche, parcours). */
  parent?: Miette;
  /** Sous 640 px : seul le parent direct reste visible, précédé de « ‹ » (« ‹ Articles ») ; le JSON-LD garde le fil entier. */
  compactMobile?: boolean;
  /** Marges de placement dans la page. */
  className?: string;
}

/** Adresse absolue d'une miette (même forme que le reste du JSON-LD du site). */
export function urlMiette(href: string): string {
  return `${SITE}${href === "/" ? "/" : href}`;
}

/** BreadcrumbList JSON-LD d'un fil (exporté pour les tests). */
export function breadcrumbListDe(fil: Miette[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: fil.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.label,
      item: urlMiette(m.href),
    })),
  };
}

export default function Breadcrumbs({ chemin, label, parent, className = "", compactMobile = false }: BreadcrumbsProps) {
  // `visible` : typographie riche (apostrophe ’, tiret insécable) pour le texte affiché ; le JSON-LD garde typoFr (inchangé).
  const fil = filAriane(chemin, { label, parent }).map((m) => ({ href: m.href, label: typoFr(m.label), visible: typoFrRiche(m.label) }));
  const dernier = fil.length - 1;
  return (
    <>
      <nav aria-label="Fil d’Ariane" className={`text-sm text-fg-2 ${className}`.trim()} data-fil-ariane="">
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
          {fil.map((m, i) => (
            <li
              key={m.href}
              className={`inline-flex min-w-0 items-center gap-x-1 ${compactMobile && i < dernier - 1 ? "max-sm:hidden" : ""} ${compactMobile && i === dernier ? "max-sm:hidden" : ""}`.trim()}
            >
              {compactMobile && i === dernier - 1 && (
                <span aria-hidden="true" className="text-muted sm:hidden">
                  ‹
                </span>
              )}
              {i < dernier ? (
                <>
                  <Link
                    href={m.href}
                    className="inline-flex min-h-[24px] items-center rounded-sm text-fg-2 underline decoration-transparent underline-offset-4 hover:text-fg hover:decoration-link-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {m.visible}
                  </Link>
                  <span aria-hidden="true" className={`text-muted ${compactMobile ? "max-sm:hidden" : ""}`.trim()}>
                    ›
                  </span>
                </>
              ) : (
                <span aria-current="page" className="min-w-0 break-words text-fg">
                  {m.visible}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        data-schema="breadcrumbs"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumbListDe(fil)) }}
      />
    </>
  );
}
