import type { Metadata } from "next";
import Link from "next/link";
import { avecTypoSync } from "@/components/ui/Typo";
import Breadcrumbs from "@/components/Breadcrumbs";
import StructuredData from "@/components/StructuredData";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import { ONGLETS, type NavLien } from "@/lib/nav-data";
import VerifieLe from "@/components/ui/VerifieLe";

/**
 * /impots — hub « Déclarer ses cryptos » (lot B3a, architecture § 10, maquette cplus/hubs/impots.html).
 *
 * Besoin n° 1 de l'étude de la demande (07/10/2026) : « déclarer juste ». Quatre étapes dans l'ordre, chacune mène à
 * son outil : Calculer → Cerfa 2086 → 3916-bis → Vérifier. Les mots des visiteurs : impôt crypto, déclarer,
 * Cerfa 2086, 3916-bis.
 *
 * Règles (architecture § 10) :
 *  - aucun montant, taux ou seuil écrit ici : les outils appliquent les règles vérifiées (scripts/lib/fiscal-guardrails.mjs) ;
 *  - aucune date limite de déclaration (seulement si une source officielle datée est branchée) ;
 *  - aucun lien rémunéré sur ce hub ; pas de FAQ ;
 *  - libellés et phrases des liens lus dans lib/nav-data.ts (onglet Impôts), comme le menu et le pied.
 */

const PATH = "/impots";
const URL_PAGE = `${BRAND.url}${PATH}`;
const TITLE = "Impôt crypto : calcul, Cerfa 2086 et 3916-bis, outils gratuits";
const DESCRIPTION =
  "Impôt crypto : calculer, remplir le Cerfa 2086, déclarer vos comptes à l’étranger (3916-bis), vérifier. Un outil gratuit par étape, des règles officielles datées.";

/** Notice officielle du formulaire 2086, relue le 3 octobre 2026 (règles 2086 vérifiées, cf. data/veille/sources.json). */
const NOTICE_2086 = "https://www.impots.gouv.fr/formulaire/2086/declaration-des-plus-ou-moins-values-de-cessions-dactifs-numeriques";
/** notice 2086 lue le 03/10/2026 (date réelle de la lecture, affichée par <VerifieLe>) */
const NOTICE_LUE_LE = "2026-10-03";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(PATH),
  openGraph: { title: `${TITLE} | ${BRAND.name}`, description: DESCRIPTION, url: URL_PAGE, type: "website", siteName: BRAND.name, locale: "fr_FR" },
  robots: { index: true, follow: true },
};

const IMPOTS = ONGLETS.find((o) => o.id === "impots")!;
const LIENS = new Map(IMPOTS.groupes.flatMap((g) => g.liens).map((l) => [l.href, l]));
const lien = (href: string): NavLien => {
  const l = LIENS.get(href);
  if (!l) throw new Error(`/impots : ${href} absent de l'onglet Impôts (lib/nav-data.ts)`);
  return l;
};

const ETAPES = [
  {
    n: 1,
    titre: "Calculer",
    outil: lien("/outils/calculateur-fiscalite"),
    besoin: "Vos ventes de l’année, la valeur de votre portefeuille à chaque vente et ce que vous avez investi",
    donne: "La plus-value imposable, l’impôt en flat tax ou au barème, et un PDF",
  },
  {
    n: 2,
    titre: "Remplir le Cerfa 2086",
    outil: lien("/outils/cerfa-2086-auto"),
    besoin: "Vos cessions saisies dans le modèle CSV fourni (les exports bruts des plateformes ne sont pas lus)",
    donne: "Le récapitulatif 2086, ligne par ligne",
  },
  {
    n: 3,
    titre: "Déclarer ses comptes à l’étranger (3916-bis)",
    outil: lien("/outils/radar-3916-bis"),
    besoin: "La liste de vos plateformes",
    donne: "Les comptes à déclarer et le risque en cas d’oubli",
  },
  {
    n: 4,
    titre: "Vérifier avant d’envoyer",
    outil: { href: "/guides/declaration-crypto-2026-checklist", label: "La liste de contrôle 2026" },
    besoin: "Votre déclaration remplie",
    donne: "Les points à vérifier, un par un",
  },
];

const BLOCS: { titre: string; liens: NavLien[] }[] = [
  { titre: "Tout en un ou avec un logiciel", liens: [lien("/pack-declaration-crypto-2026"), lien("/outils/declaration-fiscale-crypto"), lien("/ressources")] },
  { titre: "Cas particuliers", liens: [lien("/outils/tax-loss-harvesting"), lien("/outils/succession-crypto")] },
  {
    titre: "Comprendre",
    liens: [
      {
        href: "/blog/comment-declarer-crypto-impots-2026-guide-complet",
        label: "Comment déclarer ses cryptos aux impôts : le guide complet",
        phrase: "Le formulaire 2086 ligne par ligne, les comptes à l’étranger, les cas DCA, swap et staking",
      },
      lien("/etudes/fiscalite-crypto-france-2026-guide-cerfa"),
      lien("/academie/fiscalite"),
      { href: "/blog", label: "Articles", phrase: "Fiscalité, sécurité, débuter : nos articles de fond" },
    ],
  },
];

const BTN =
  "inline-flex min-h-[44px] items-center rounded-lg border border-border-strong px-4 font-semibold text-fg hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const LNK = "text-fg underline decoration-link-line underline-offset-4 hover:decoration-fg";

function ImpotsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Déclarer ses cryptos : les étapes",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: ETAPES.length,
    itemListElement: ETAPES.map((e) => ({ "@type": "ListItem", position: e.n, name: e.titre, url: `${BRAND.url}${e.outil.href}` })),
  };
  return (
    <div className="py-10 sm:py-14">
      <StructuredData id="impots-etapes" data={jsonLd} />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs chemin={PATH} className="mb-6" />
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Impôt crypto en France</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-fg sm:text-5xl">Déclarer ses cryptos : les étapes</h1>
          <p className="mt-4 text-lg text-fg-2">
            Quatre étapes, un outil gratuit pour chacune. Les règles et les montants viennent de sources officielles
            datées.
          </p>
          <p className="mt-3 text-sm text-fg-2">
            <VerifieLe date={NOTICE_LUE_LE} famille="fiscalite" label="Règles vérifiées" /> sur la{" "}
            <a href={NOTICE_2086} target="_blank" rel="noopener noreferrer" className={LNK}>
              notice officielle du formulaire 2086
              <span className="sr-only"> (site officiel, nouvel onglet)</span>
            </a>
            .
          </p>
        </header>

        <section aria-labelledby="t-etapes" className="mt-10">
          <h2 id="t-etapes" className="sr-only">
            Les quatre étapes, dans l’ordre
          </h2>
          <ol className="grid gap-5 md:grid-cols-2">
            {ETAPES.map((e) => (
              <li key={e.n} aria-labelledby={`etape-${e.n}`} className="flex gap-4 rounded-xl border border-border bg-surface p-5">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-strong text-lg font-bold text-fg">
                  {e.n}
                </span>
                <div className="min-w-0">
                  <h3 id={`etape-${e.n}`} className="text-xl font-bold text-fg">
                    <span className="sr-only">Étape {e.n} : </span>
                    {e.titre}
                  </h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div>
                      <dt className="font-semibold text-fg">Ce qu’il vous faut</dt>
                      <dd className="text-fg-2">{e.besoin}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-fg">Ce que vous obtenez</dt>
                      <dd className="text-fg-2">{e.donne}</dd>
                    </div>
                  </dl>
                  <p className="mt-4">
                    <Link href={e.outil.href} className={BTN}>
                      {e.outil.label}
                    </Link>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="t-situation" className="mt-12">
          <h2 id="t-situation" className="text-2xl font-bold text-fg">
            Selon votre situation
          </h2>
          <div className="mt-5 grid gap-x-8 gap-y-6 md:grid-cols-3">
            {BLOCS.map((b) => (
              <section key={b.titre} aria-label={b.titre}>
                <h3 className="font-semibold text-fg">{b.titre}</h3>
                <ul className="mt-2 space-y-3">
                  {b.liens.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className={`font-semibold ${LNK}`}>
                        {l.label}
                      </Link>
                      {l.phrase ? <span className="block text-sm text-fg-2">{l.phrase}</span> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>

        <div role="note" className="mt-10 rounded-xl border border-info-border bg-info-soft p-5 text-sm text-fg-2">
          <p className="font-semibold text-fg">Aucun lien publicitaire sur cette page</p>
          <p className="mt-1">
            Les outils sont gratuits et appliquent les règles de la notice officielle. Dans le{" "}
            <Link href="/outils/declaration-fiscale-crypto" className={LNK}>
              comparatif des logiciels de déclaration
            </Link>
            , les liens rémunérés portent la mention « Publicité ».{" "}
            <Link href="/transparence" className={LNK}>
              Qui nous rémunère
            </Link>
          </p>
        </div>

        <aside aria-label="Soutenir Cryptoreflex" className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-sunken p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-fg-2">
            <strong className="text-fg">Ces outils sont gratuits, sans abonnement.</strong> Le site vit de
            contributions libres et de quelques liens publicitaires, toujours signalés « Publicité ».
          </p>
          <Link href="/soutenir" className={`${BTN} shrink-0`}>
            Soutenir le site
          </Link>
        </aside>

        <AmfDisclaimer variant="fiscalite" className="mt-10" />
      </div>
    </div>
  );
}

export default avecTypoSync(ImpotsPage);
