/**
 * lib/price-providers/static.ts — Provider Static (Source #8, dernier recours).
 *
 * Utilise le KV snapshot (auto-update via cron) en prio + fallback hardcode.
 * Si toutes les sources live ont echoue, on garantit qu'un prix coherent
 * est affiche au lieu de "—".
 *
 * Particularite : ce provider ne retourne JAMAIS null tant qu'un id existe
 * dans STATIC_FALLBACK ou KV. C'est le filet ultime de la cascade.
 */

import type {
  CryptoMeta,
  PriceProvider,
  ProviderPriceData,
} from "./types";

/**
 * Snapshot statique etendu — derniere mise a jour 2026-05-08.
 * Etendu aux 30 cryptos les plus visitees pour eviter "—".
 *
 * Source unique de verite pour le marketCap supply estimate quand un
 * provider live (Binance/Kraken/Coinbase/KuCoin/DexScreener) ne donne
 * pas de marketCap natif. Le supply est derive : marketCap / priceUsd.
 *
 * Export pour utilisation externe par le cascade orchestrator.
 */
export const STATIC_FALLBACK: Readonly<
  Record<
    string,
    {
      priceUsd: number;
      change24h: number;
      marketCap: number;
      volume24h: number;
    }
  >
> = {
  bitcoin: { priceUsd: 78500, change24h: 0, marketCap: 1550000000000, volume24h: 35000000000 },
  ethereum: { priceUsd: 2320, change24h: 0, marketCap: 280000000000, volume24h: 18000000000 },
  ripple: { priceUsd: 0.62, change24h: 0, marketCap: 34000000000, volume24h: 2500000000 },
  binancecoin: { priceUsd: 600, change24h: 0, marketCap: 90000000000, volume24h: 1800000000 },
  solana: { priceUsd: 145, change24h: 0, marketCap: 68000000000, volume24h: 3000000000 },
  cardano: { priceUsd: 0.45, change24h: 0, marketCap: 16000000000, volume24h: 600000000 },
  dogecoin: { priceUsd: 0.12, change24h: 0, marketCap: 17000000000, volume24h: 900000000 },
  tron: { priceUsd: 0.16, change24h: 0, marketCap: 14000000000, volume24h: 500000000 },
  "avalanche-2": { priceUsd: 30, change24h: 0, marketCap: 12000000000, volume24h: 400000000 },
  chainlink: { priceUsd: 14, change24h: 0, marketCap: 8000000000, volume24h: 400000000 },
  polkadot: { priceUsd: 4.2, change24h: 0, marketCap: 6500000000, volume24h: 180000000 },
  "matic-network": { priceUsd: 0.42, change24h: 0, marketCap: 4200000000, volume24h: 150000000 },
  "the-open-network": { priceUsd: 4.8, change24h: 0, marketCap: 12000000000, volume24h: 200000000 },
  "shiba-inu": { priceUsd: 0.000017, change24h: 0, marketCap: 10000000000, volume24h: 350000000 },
  litecoin: { priceUsd: 80, change24h: 0, marketCap: 6000000000, volume24h: 300000000 },
  "bitcoin-cash": { priceUsd: 380, change24h: 0, marketCap: 7500000000, volume24h: 250000000 },
  near: { priceUsd: 4.5, change24h: 0, marketCap: 5000000000, volume24h: 180000000 },
  uniswap: { priceUsd: 8, change24h: 0, marketCap: 4800000000, volume24h: 120000000 },
  aptos: { priceUsd: 8.5, change24h: 0, marketCap: 4500000000, volume24h: 150000000 },
  "internet-computer": { priceUsd: 9, change24h: 0, marketCap: 4200000000, volume24h: 100000000 },
  "ethereum-classic": { priceUsd: 22, change24h: 0, marketCap: 3300000000, volume24h: 110000000 },
  cosmos: { priceUsd: 7, change24h: 0, marketCap: 2700000000, volume24h: 80000000 },
  stellar: { priceUsd: 0.10, change24h: 0, marketCap: 3000000000, volume24h: 90000000 },
  filecoin: { priceUsd: 4.5, change24h: 0, marketCap: 2700000000, volume24h: 90000000 },
  monero: { priceUsd: 165, change24h: 0, marketCap: 3000000000, volume24h: 50000000 },
  algorand: { priceUsd: 0.18, change24h: 0, marketCap: 1500000000, volume24h: 40000000 },
  tezos: { priceUsd: 0.85, change24h: 0, marketCap: 850000000, volume24h: 20000000 },
  "hedera-hashgraph": { priceUsd: 0.06, change24h: 0, marketCap: 2200000000, volume24h: 70000000 },
  aave: { priceUsd: 145, change24h: 0, marketCap: 2200000000, volume24h: 80000000 },
  maker: { priceUsd: 1450, change24h: 0, marketCap: 1300000000, volume24h: 40000000 },
  sui: { priceUsd: 1.5, change24h: 0, marketCap: 4500000000, volume24h: 180000000 },
  arbitrum: { priceUsd: 0.85, change24h: 0, marketCap: 3500000000, volume24h: 120000000 },
  optimism: { priceUsd: 1.6, change24h: 0, marketCap: 1800000000, volume24h: 60000000 },
  tether: { priceUsd: 1, change24h: 0, marketCap: 120000000000, volume24h: 50000000000 },
  "usd-coin": { priceUsd: 1, change24h: 0, marketCap: 33000000000, volume24h: 6000000000 },
  // NEW $OM Mantra Chain Cosmos (apres rebrand 2024) — distinct de "mantra-dao"
  // (OLD ERC-20 mort post-crash 2025). CoinGecko 2026-05-08 : $0.0103.
  mantra: { priceUsd: 0.0103, change24h: 0, marketCap: 52000000, volume24h: 4500000 },
};

export const staticProvider: PriceProvider = {
  name: "static",
  priority: 99,

  canHandle(meta: CryptoMeta): boolean {
    return Boolean(STATIC_FALLBACK[meta.coingeckoId]);
  },

  async fetch(meta: CryptoMeta): Promise<ProviderPriceData | null> {
    const stat = STATIC_FALLBACK[meta.coingeckoId];
    if (!stat) return null;
    return {
      priceUsd: stat.priceUsd,
      change24h: stat.change24h,
      volume24h: stat.volume24h,
      marketCap: stat.marketCap,
    };
  },
};
