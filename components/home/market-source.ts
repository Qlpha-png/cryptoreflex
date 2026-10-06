/**
 * Source réelle des cours affichés sur l'accueil (06/10/2026, audit licences : l'attribution CoinGecko est
 * obligatoire là où ses données s'affichent, et la source citée doit être celle qui a VRAIMENT servi).
 *
 * fetchTopMarket (lib/coingecko.ts) essaie dans l'ordre : CoinGecko /coins/markets, puis l'agrégateur de secours
 * (lib/price-source.ts : CoinCap, Binance, Kraken…), puis un jeu statique enregistré. Le résultat ne porte pas de
 * champ « source » ; on la déduit de la forme des données, propre à chaque chemin :
 *   - CoinGecko renvoie la variation sur 1 h (price_change_percentage_1h_in_currency) ;
 *   - l'agrégateur de secours met priceChange1h à null pour toutes les cryptos ;
 *   - le jeu statique met priceChange1h ET priceChange24h à 0 pour toutes les cryptos.
 * Limite connue : après le premier rafraîchissement côté navigateur (/api/prices), les cours viennent du cache du
 * bandeau (rempli depuis CoinGecko par le cron refresh-ticker-prices) ou, à défaut, de l'agrégateur ; l'API ne dit
 * pas laquelle. Correcteur final (06/10/2026) : le navigateur remplace ensuite ces cours par le flux public de Binance
 * (lib/hooks/useLivePrices.ts, voie 0), puis par /api/prices en cas de panne. Le libellé cite donc toutes les sources
 * possibles au lieu d'en désigner une seule, qui serait fausse dès le premier rafraîchissement.
 */

export type MarketSource = "coingecko" | "secours" | "statique";

export interface MarketShape {
  priceChange1h: number | null;
  priceChange24h: number;
}

export function detectMarketSource(market: MarketShape[]): MarketSource | null {
  if (market.length === 0) return null;
  if (market.every((c) => c.priceChange1h === 0 && c.priceChange24h === 0)) return "statique";
  if (market.some((c) => typeof c.priceChange1h === "number" && c.priceChange1h !== 0)) return "coingecko";
  return "secours";
}

export interface SourceLabel {
  /** Texte avant le lien (ou texte complet s'il n'y a pas de lien). */
  text: string;
  link: { label: string; href: string } | null;
  /** Précision affichée après le lien. */
  note: string | null;
}

export const COINGECKO_URL = "https://www.coingecko.com/";

export function priceSourceLabel(source: MarketSource | null): SourceLabel | null {
  if (source === null) return null;
  return {
    text: "Cours : flux public de Binance dans votre navigateur,",
    link: { label: "CoinGecko", href: COINGECKO_URL },
    note:
      source === "statique"
        ? "et sources de secours ; au chargement, dernier relevé enregistré (cours non à jour)"
        : "et sources de secours en cas de panne",
  };
}
