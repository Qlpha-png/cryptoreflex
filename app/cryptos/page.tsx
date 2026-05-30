import Link from "next/link";
import type { Metadata } from "next";
import { getAllCryptosBrowsable } from "@/lib/cryptos-extended";
import CryptosBrowser from "@/components/cryptos/CryptosBrowser";
import AcademyCrossLink from "@/components/AcademyCrossLink";

/**
 * Index /cryptos — Server Component.
 *
 * Fetch la liste UNIFIEE (100 fiches premium statiques + ~680 fiches LLM en
 * base, dédoublonnées, cache 6h via getAllCryptosUnified). Passe le tout au
 * client `CryptosBrowser` qui gère recherche/filtres + PAGINATION (48/page) :
 * seules les cartes de la page courante sont montées dans le DOM.
 *
 * Coût : aucune génération LLM (fiches déjà en base), ~1 lecture Supabase / 6h
 * (unstable_cache). Dégradation gracieuse : si Supabase n'est pas configuré
 * (build local), seules les 100 statiques sont retournées.
 *
 * RENDU DYNAMIQUE (runtime) — IMPORTANT : au BUILD/SSG, le fetch Supabase des
 * 680 fiches LLM revient vide (clé service-role indispo au build Vercel) → la
 * page serait figée à 100. Au runtime, getAllCryptosUnified renvoie bien les
 * 780 (vérifié : /alertes, /admin, /api/*). On force donc le rendu runtime ;
 * la data restant cachée 6h (unstable_cache), le coût DB reste borné.
 */
export const dynamic = "force-dynamic";

const SITE = "https://www.cryptoreflex.fr";

export const metadata: Metadata = {
  title: "Cryptos analysées : fiches, scores de fiabilité & risques | Cryptoreflex",
  description:
    "La plus grande base d'analyse crypto francophone : fiches détaillées avec score de fiabilité, statut MiCA, audits et risques. Recherche, filtres et navigation par pages.",
  alternates: { canonical: `${SITE}/cryptos` },
  openGraph: {
    title: "Cryptos analysées — Cryptoreflex",
    description:
      "Fiches crypto détaillées : score de fiabilité, statut MiCA/PSAN, risques. Recherche et filtres.",
    url: `${SITE}/cryptos`,
    type: "website",
  },
};

export default async function CryptosIndexPage() {
  const items = await getAllCryptosBrowsable();

  // JSON-LD ItemList — limité aux 100 premières (premium en tête) pour garder
  // le HTML léger ; la découverte des 780 est déjà assurée par le sitemap.
  const itemListJson = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: `${items.length} cryptos analysées par Cryptoreflex`,
        description:
          "Fiches crypto avec score de fiabilité, statut MiCA, audits, backers et risques détaillés. 100 fiches éditoriales premium + analyses complémentaires.",
        numberOfItems: items.length,
        itemListElement: items.slice(0, 100).map((c, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: `${SITE}/cryptos/${c.id}`,
          name: c.name,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "Cryptos", item: `${SITE}/cryptos` },
        ],
      },
    ],
  });

  // Speculation Rules — prerender intent-based des top 5 (70%+ des clics).
  const speculationRulesJson = JSON.stringify({
    prerender: [
      {
        urls: [
          "/cryptos/bitcoin",
          "/cryptos/ethereum",
          "/cryptos/solana",
          "/cryptos/bnb",
          "/cryptos/xrp",
        ],
        eagerness: "moderate",
      },
    ],
  }).replace(/</g, "\\u003c");

  return (
    <div className="py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListJson }} />
      <script type="speculationrules" dangerouslySetInnerHTML={{ __html: speculationRulesJson }} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Cryptos</span>
        </nav>

        {/* Header */}
        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            {items.length} cryptos <span className="gradient-text">analysées</span>
          </h1>
          <p className="mt-3 text-base text-muted">
            La plus grande base d&apos;analyse crypto francophone : 100 fiches éditoriales premium
            (score de fiabilité calculé sur méthodologie publique, audits, backers, risques) plus
            des centaines d&apos;analyses complémentaires (tokenomics, statut FR/UE, scores).
            Recherche, filtres et navigation par pages ci-dessous.
          </p>
        </header>

        {/* Recherche + filtres + grille paginée (client) */}
        <CryptosBrowser items={items} />

        <div className="mt-12">
          <AcademyCrossLink
            title="Tu débutes ? Apprends avant d'investir"
            links={[
              { href: "/academie/debutant", label: "Parcours Débutant" },
              { href: "/academie/choisir", label: "Bien choisir ses cryptos" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
