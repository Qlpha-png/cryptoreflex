import type { Metadata } from "next";
import Link from "next/link";
import { avecTypo } from "@/components/ui/Typo";
import Breadcrumbs from "@/components/Breadcrumbs";
import StructuredData from "@/components/StructuredData";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import { isReflexCardsEnabled } from "@/lib/reflex-cards/flag";
import { LIGNE_LEGALE, ONGLETS, PIED_COLONNES, type NavLien, type Onglet } from "@/lib/nav-data";
import { fmtNb } from "@/lib/format-fr";
import counts from "@/data/site-counts.json";
import { getHistHubCryptos, getHistYearsFor } from "@/lib/historique-prix";
import { getAllCryptos } from "@/lib/cryptos";
import { COUNTRY_CODES } from "@/lib/programmatic-pages";
import { getTASlugs } from "@/lib/ta-mdx";
import { GLOSSARY_TERMS } from "@/lib/glossary";
import { TRACKS } from "@/lib/academy-tracks";
import { REFLEX_META } from "@/lib/reflex-cards/data";
import { UNIVERS_ON, universCards } from "@/lib/reflex-cards/univers";

/**
 * /plan-du-site — toutes les pages du site, rangées par rubrique (lot B3a, architecture § 10).
 *
 *  - Les 8 rubriques dans l'ordre des onglets, avec tous leurs liens et leurs phrases (lib/nav-data.ts), puis les
 *    pages de la rubrique rangées seulement dans le pied (chaque page du pied figure donc ici) ;
 *  - Le site, Soutenir et suivre, Pour votre site, Mon espace, Informations légales ;
 *  - les grandes collections : liens vers leur page d’entrée, avec des nombres CALCULÉS (aucun écrit à la main) et
 *    le même compte que la page liée ; aucune promesse de « tous les liens » (plusieurs index paginent côté client).
 * HTML serveur, liens <a href>, aucune liste cachée. Liée depuis la ligne légale du pied ; présente au sitemap XML.
 */

const PATH = "/plan-du-site";
const URL_PAGE = `${BRAND.url}${PATH}`;
const TITLE = "Plan du site";
const DESCRIPTION =
  "Toutes les pages de Cryptoreflex, rangées par rubrique : marché, actus, cryptos, plateformes, impôts, outils, apprendre, cartes, le site et votre espace.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(PATH),
  openGraph: { title: `${TITLE} | ${BRAND.name}`, description: DESCRIPTION, url: URL_PAGE, type: "website", siteName: BRAND.name, locale: "fr_FR" },
  robots: { index: true, follow: true },
};

export const revalidate = 86400;

const CARTES_ON = isReflexCardsEnabled();

/** Le même nombre que /cartes affiche (univers s’il est activé, sinon les cartes de la saison). */
const nbCartes = () => (UNIVERS_ON() ? universCards().length : REFLEX_META.ncards);

/** Colonnes du pied par identifiant (rubriques sans onglet et compléments des rubriques). */
const COL = Object.fromEntries(PIED_COLONNES.map((c) => [c.id, c]));

/** Pages de la colonne du pied absentes du panneau de la rubrique (pour que le plan soit complet). */
function complements(o: Onglet): NavLien[] {
  const dans = new Set([...o.groupes.flatMap((g) => g.liens.map((l) => l.href.split("#")[0])), o.toutVoir.href]);
  const ids = o.id === "apprendre" ? ["apprendre", "parcours"] : [o.id];
  return ids.flatMap((id) => COL[id]?.liens ?? []).filter((l) => !dans.has(l.href));
}

function Lien({ l }: { l: NavLien }) {
  return (
    <li>
      <Link href={l.href} className="font-semibold text-fg underline decoration-link-line underline-offset-4 hover:decoration-fg">
        {l.label}
      </Link>
      {l.phrase ? <span className="block text-fg-2">{l.phrase}</span> : null}
    </li>
  );
}

async function PlanDuSitePage() {
  const histo = getHistHubCryptos().reduce((n, e) => n + getHistYearsFor(e.crypto).length, 0);
  const achats = getAllCryptos().length * COUNTRY_CODES.length;
  const analyses = (await getTASlugs()).length;
  const listes: { href: string; label: string; n: number; unite: string }[] = [
    { href: "/cryptos", label: "Les fiches crypto", n: counts.cryptos, unite: "fiches" },
    { href: "/historique-prix", label: "L’historique des prix, crypto par crypto et année par année", n: histo, unite: "pages" },
    { href: "/acheter", label: "Acheter une crypto, pays par pays", n: achats, unite: "guides" },
    { href: "/analyses-techniques", label: "Les analyses techniques, crypto par crypto", n: analyses, unite: "analyses" },
    { href: "/actualites", label: "Les actualités, mois par mois", n: counts.news, unite: "actualités" },
    { href: "/blog", label: "Les articles", n: counts.articles, unite: "articles" },
    { href: "/vs", label: "Les duels de cryptos déjà prêts", n: counts.vsPairs, unite: "duels" },
    { href: "/glossaire", label: "Les définitions, de A à Z", n: GLOSSARY_TERMS.length, unite: "mots" },
    { href: "/academie", label: "Les parcours de l’académie", n: TRACKS.length, unite: "parcours" },
    ...(CARTES_ON ? [{ href: "/cartes", label: "Les cartes Reflex Cards", n: nbCartes(), unite: "cartes" }] : []),
  ];
  const onglets = ONGLETS.filter((o) => CARTES_ON || o.id !== "cartes");
  const autres = [COL.site, COL.soutenir, COL.devs, COL.espace].filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: URL_PAGE,
    inLanguage: "fr-FR",
    isPartOf: { "@type": "WebSite", name: BRAND.name, url: BRAND.url },
  };

  return (
    <div className="py-10 sm:py-14">
      <StructuredData id="plan-du-site" data={jsonLd} />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs chemin={PATH} className="mb-6" />
        <header className="max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-fg sm:text-5xl">Plan du site</h1>
          <p className="mt-3 text-lg text-fg-2">
            Toutes les pages de Cryptoreflex, rangées comme dans le menu : d’abord les huit rubriques, puis le
            site, votre espace et les grandes collections.
          </p>
        </header>

        <nav aria-label="Rubriques" className="mt-8">
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {onglets.map((o) => (
              <li key={o.id}>
                <a href={`#${o.id}`} className="inline-flex min-h-[44px] items-center text-fg-2 underline decoration-link-line underline-offset-4 hover:text-fg">
                  {o.label}
                </a>
              </li>
            ))}
            <li>
              <a href="#listes" className="inline-flex min-h-[44px] items-center text-fg-2 underline decoration-link-line underline-offset-4 hover:text-fg">
                Les grandes collections
              </a>
            </li>
          </ul>
        </nav>

        {onglets.map((o) => {
          const plus = complements(o);
          return (
            <section key={o.id} id={o.id} aria-labelledby={`t-${o.id}`} className="mt-10 scroll-mt-28 border-t border-border-strong pt-6">
              <h2 id={`t-${o.id}`} className="text-2xl font-bold text-fg">
                <Link href={o.hub} className="hover:underline">
                  {o.label}
                </Link>
              </h2>
              <p className="mt-1 text-fg-2">{o.intro}</p>
              <div className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                {o.groupes.map((g) => (
                  <div key={g.titre}>
                    <h3 className="font-semibold text-fg">{g.titre}</h3>
                    {g.ordonne ? (
                      <ol className="mt-2 list-decimal space-y-3 pl-5">{g.liens.map((l) => <Lien key={l.href} l={l} />)}</ol>
                    ) : (
                      <ul className="mt-2 space-y-3">{g.liens.map((l) => <Lien key={l.href} l={l} />)}</ul>
                    )}
                  </div>
                ))}
                {plus.length ? (
                  <div>
                    <h3 className="font-semibold text-fg">Aussi dans cette rubrique</h3>
                    <ul className="mt-2 space-y-3">{plus.map((l) => <Lien key={l.href} l={l} />)}</ul>
                  </div>
                ) : null}
              </div>
              <p className="mt-5">
                <Link href={o.toutVoir.href} className="font-semibold text-fg underline decoration-link-line underline-offset-4 hover:decoration-fg">
                  {o.toutVoir.label}
                </Link>
                <span className="text-fg-2"> : {o.toutVoir.phrase}</span>
              </p>
            </section>
          );
        })}

        <section aria-labelledby="t-autres" className="mt-10 border-t border-border-strong pt-6">
          <h2 id="t-autres" className="text-2xl font-bold text-fg">Le site et votre espace</h2>
          <div className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {autres.map((c) => (
              <div key={c.id}>
                <h3 className="font-semibold text-fg">{c.titre}</h3>
                <ul className="mt-2 space-y-3">{c.liens.map((l) => <Lien key={l.href} l={l} />)}</ul>
              </div>
            ))}
            <div>
              <h3 className="font-semibold text-fg">Informations légales</h3>
              <ul className="mt-2 space-y-3">{LIGNE_LEGALE.filter((l) => l.href !== PATH).map((l) => <Lien key={l.href} l={l} />)}</ul>
            </div>
          </div>
        </section>

        <section id="listes" aria-labelledby="t-listes" className="mt-10 scroll-mt-28 border-t border-border-strong pt-6">
          <h2 id="t-listes" className="text-2xl font-bold text-fg">Les grandes collections</h2>
          <p className="mt-1 text-fg-2">
            La page d’entrée de chaque collection, avec le nombre de pages qu’elle réunit. Certaines n’en montrent
            qu’une partie à la fois : la recherche, les filtres ou les pages suivantes donnent accès au reste.
          </p>
          <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {listes.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="font-semibold text-fg underline decoration-link-line underline-offset-4 hover:decoration-fg">
                  {l.label}
                </Link>
                <span className="block text-fg-2">
                  {fmtNb(l.n, 0)} {l.unite}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default avecTypo(PlanDuSitePage);
