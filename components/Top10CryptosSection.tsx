import topCryptosData from "@/data/top-cryptos.json";
import Top10CryptosClient, { type TopCrypto } from "./Top10CryptosClient";

/**
 * Server wrapper de la section "Top 10 cryptos expliquées" (P1-3 + P1-4).
 *
 * Pourquoi un wrapper ? La donnée est statique (JSON build-time), aucun fetch
 * client n'est nécessaire — autant la lire côté Server et passer la liste au
 * composant Client. Le composant Client gère ensuite filtres / tri / view
 * toggle. Pattern aligné avec MarketTable → MarketTableClient.
 */
export default function Top10CryptosSection() {
  const cryptos = (topCryptosData.topCryptos as TopCrypto[]).slice(0, 10);
  return <Top10CryptosClient cryptos={cryptos} />;
}
