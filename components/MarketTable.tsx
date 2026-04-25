import { BarChart3 } from "lucide-react";
import { fetchTopMarket } from "@/lib/coingecko";
import EmptyState from "@/components/ui/EmptyState";
import { getCryptoSlugs } from "@/lib/cryptos";
import MarketTableClient from "@/components/MarketTableClient";

/**
 * Tableau "marché" style CoinMarketCap : top N cryptos par market cap
 * avec prix, variation 1h/24h/7j, market cap, volume, sparkline.
 *
 * Architecture (audit P0-3 / P0-4) :
 *  - Ce fichier reste un Server Component : il fetch les données via
 *    `fetchTopMarket()` (ISR 2 min) et passe la liste de slugs internes
 *    cliquables (présents dans `lib/cryptos.ts`) au composant client.
 *  - L'interactivité (tri colonnes, lignes cliquables) vit dans
 *    `MarketTableClient` — séparation propre Server/Client pour ne pas
 *    casser le caching ISR ni alourdir le JS bundle de la page d'accueil.
 *
 * Mobile-first :
 *  - <md : cartes verticales compactes (titre + prix + 24h + sparkline mini).
 *  - >=md : tableau classique CoinMarketCap-like avec tri.
 */
export default async function MarketTable({ limit = 20 }: { limit?: number }) {
  const coins = await fetchTopMarket(limit);

  if (!coins.length) {
    return (
      <section id="marche" className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" aria-hidden="true" />}
            title="Données marché indisponibles"
            description="Notre fournisseur de cours est temporairement injoignable. Les prix reviendront dans quelques minutes."
            cta={{ label: "Réessayer", href: "/#marche" }}
            secondaryCta={{ label: "Voir les guides", href: "/blog" }}
          />
        </div>
      </section>
    );
  }

  // Slugs cliquables : on n'enroule la ligne dans un <Link> que si la crypto
  // a une fiche éditoriale dédiée dans lib/cryptos.ts (sinon lien mort = pire UX).
  const internalSlugs = new Set(getCryptoSlugs());

  return <MarketTableClient coins={coins} limit={limit} internalSlugs={Array.from(internalSlugs)} />;
}
