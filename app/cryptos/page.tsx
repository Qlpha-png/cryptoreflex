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
 * ISR 1h (2026-05-28) — remplace l'ancien `force-dynamic`. La justification
 * historique (« clé service-role indispo au build Vercel ») est caduque :
 * SUPABASE_SERVICE_ROLE_KEY est configurée côté Vercel depuis la migration
 * Hetzner→Vercel (2026-05-27), le build a donc accès aux 780 fiches.
 * Gain mesuré : TTFB 1.9 s (render dynamique) → ~50 ms (HIT CDN).
 * Filet de sécurité : si un build tombe pendant un incident Supabase, la page
 * régénérée ne contiendrait que les 100 fiches statiques pendant au plus 1 h
 * (revalidate ci-dessous) avant le retour des 780 — dégradation acceptable
 * et silencieuse (CryptosBrowser pagine ce qu'on lui donne).
 */
// QUOTA VERCEL 2026-06-11 — revalidate allongé (ISR writes 409K/200K Hobby) :
// le HTML seed peut dater, les données fraîches arrivent côté client.
export const revalidate = 86400;

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
          <p className="section-eyebrow">
            <strong>Cryptos</strong> — fiches éditoriales · scores publics · sans hype
          </p>
          <h1 className="section-h1 mt-3 font-display font-bold">
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
            title="Vous débutez ? Apprenez avant d'investir"
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
