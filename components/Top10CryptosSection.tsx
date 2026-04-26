import topCryptosData from "@/data/top-cryptos.json";
import Top10CryptosClient, { type TopCrypto } from "./Top10CryptosClient";
import StructuredData from "./StructuredData";
import { BRAND } from "@/lib/brand";

/**
 * Server wrapper de la section "Top 10 cryptos expliquées" (P1-3 + P1-4).
 *
 * Pourquoi un wrapper ? La donnée est statique (JSON build-time), aucun fetch
 * client n'est nécessaire — autant la lire côté Server et passer la liste au
 * composant Client. Le composant Client gère ensuite filtres / tri / view
 * toggle. Pattern aligné avec MarketTable → MarketTableClient.
 *
 * Audit Block 5 26/04/2026 (Agent SEO) : ajout JSON-LD ItemList pour Rich
 * Results "Top 10" sur Google + signal hierarchique fort pour le crawler.
 */
export default function Top10CryptosSection() {
  const cryptos = (topCryptosData.topCryptos as TopCrypto[]).slice(0, 10);

  // JSON-LD ItemList — eligible Rich Results "Top 10 cryptos" sur Google
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Top 10 cryptos en France 2026",
    description: "Les 10 cryptomonnaies les plus importantes du marché expliquées simplement par Cryptoreflex.",
    numberOfItems: cryptos.length,
    itemListElement: cryptos.map((c, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${BRAND.url}/cryptos/${c.id}`,
      name: c.name,
    })),
  };

  return (
    <>
      <StructuredData data={itemListSchema} id="top10-cryptos-itemlist" />
      <Top10CryptosClient cryptos={cryptos} />
    </>
  );
}
