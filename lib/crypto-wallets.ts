/**
 * lib/crypto-wallets.ts — Lookup wallets recommandés pour une crypto donnée.
 *
 * Hiérarchie de fallback :
 *   1. byId[crypto.id]            → entrée explicite (BTC, ETH, SOL, XMR)
 *   2. byChain[<chain inférée>]   → mapping par chain (Bitcoin / EVM / Solana / Cosmos / Polkadot / BNB Chain / Bitcoin-fork)
 *   3. default                    → fallback générique (Ledger / Trezor)
 *
 * L'inférence de chain depuis `category` + `id` est volontairement permissive
 * pour couvrir les 100 cryptos sans exploser le mapping manuel.
 */
import walletsData from "@/data/crypto-wallets.json";
import type { AnyCrypto } from "@/lib/cryptos";

export interface WalletRecommendation {
  name: string;
  type: string;
  level: string;
  url: string | null;
  note: string;
}

export interface CryptoWalletEntry {
  chain: string;
  recommendations: WalletRecommendation[];
}

const BY_ID = walletsData.byId as Record<string, CryptoWalletEntry>;
const BY_CHAIN = walletsData.byChain as Record<string, WalletRecommendation[]>;
const DEFAULT_RECS = walletsData.default as WalletRecommendation[];

/** Devine la chain "famille" à partir de la category + id. */
function inferChain(c: AnyCrypto): string {
  const cat = (c.category ?? "").toLowerCase();
  const id = (c.id ?? "").toLowerCase();

  // Bitcoin et forks (PoW chains compatibles UTXO)
  if (
    [
      "litecoin",
      "bitcoin-cash",
      "dogecoin",
      "dash",
      "zcash",
      "kaspa",
    ].includes(id) ||
    cat.includes("memecoin / paiement")
  ) {
    return "Bitcoin-fork";
  }

  // BNB Chain spécifique
  if (id === "bnb" || id === "binancecoin" || cat.includes("bnb chain")) {
    return "BNB Chain";
  }

  // Solana et son écosystème
  if (
    id === "solana" ||
    id === "jupiter-exchange-solana" ||
    id === "raydium" ||
    id === "bonk" ||
    id === "dogwifhat" ||
    id === "render" ||
    cat.includes("solana")
  ) {
    return "Solana";
  }

  // Cosmos SDK chains
  if (
    [
      "cosmos",
      "celestia",
      "injective",
      "sei",
      "akash-network",
      "secret",
      "kava",
      "osmosis",
    ].includes(id) ||
    cat.includes("cosmos") ||
    cat.includes("ibc")
  ) {
    return "Cosmos";
  }

  // Polkadot / Substrate chains
  if (id === "polkadot" || cat.includes("polkadot") || cat.includes("substrate")) {
    return "Polkadot";
  }

  // Tout le reste = EVM-compatible (par défaut, vu la dominance EVM en 2026)
  // Couvre : Ethereum, Layer 2 (Arbitrum, Optimism, Base, Polygon, Mantle…),
  // sidechains EVM, Avalanche C-Chain, BNB Chain alt path, etc.
  return "EVM";
}

/**
 * Retourne les wallets recommandés pour une crypto.
 * Garanti de retourner au moins 1 entrée (fallback default).
 */
export function getWalletsForCrypto(c: AnyCrypto): {
  chain: string;
  recommendations: WalletRecommendation[];
} {
  // 1. Lookup par id
  const explicit = BY_ID[c.id];
  if (explicit) {
    return explicit;
  }

  // 2. Lookup par chain inférée
  const chain = inferChain(c);
  const byChain = BY_CHAIN[chain];
  if (byChain && byChain.length) {
    return { chain, recommendations: byChain };
  }

  // 3. Default
  return { chain: "Multi-chain", recommendations: DEFAULT_RECS };
}
