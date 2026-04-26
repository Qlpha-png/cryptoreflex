/**
 * staking-rates.ts — APY de référence par crypto pour le Calculateur APY Staking.
 *
 * Source : moyennes pondérées observées Q1 2026 sur Lido, Marinade, Binance Earn,
 * Coinbase Stake, Kraken, et les rapports de validation officiels (eth.staking,
 * solana.com/staking-rewards). Les chiffres SONT INDICATIFS et doivent être
 * affichés avec un disclaimer "estimation" claire — pas de promesse de rendement.
 *
 * V2 : remplacer par fetch DefiLlama API `/v2/yields` ou CoinGecko `/derivatives`
 *      filtré sur les pools liquid staking.
 */

export type StakingMethod = "direct" | "liquid" | "cex";

export interface StakingProviderRate {
  /** Nom affiché (ex: "Lido", "Binance Earn"). */
  provider: string;
  /** APY brut indicatif (en %) — ex: 3.4 pour 3.4 %. */
  apy: number;
  /** Période de lock-up estimée en jours (0 = liquid / instant). */
  lockupDays: number;
  /** Frais retenus par le provider (en %, ex: 10 pour Lido). */
  feePct: number;
  /** Méthode (direct, liquid, cex). */
  method: StakingMethod;
  /** URL d'info (jamais affilié ici — ce sont les données de référence). */
  infoUrl: string;
}

export interface StakingCryptoData {
  id: "ethereum" | "solana" | "cardano" | "polkadot" | "cosmos" | "near";
  symbol: string;
  name: string;
  /** Risques principaux à faire connaître (slashing, smart contract, etc.). */
  risks: string[];
  /** Liste de providers réels avec APY indicatif Q1 2026. */
  providers: StakingProviderRate[];
}

export const STAKING_RATES: StakingCryptoData[] = [
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    risks: [
      "Slashing en cas de mauvaise gestion du validateur (rare mais possible).",
      "Lock-up sur retrait (queue de exit ~ quelques jours à plusieurs semaines).",
      "Risque smart contract sur les solutions liquid staking (Lido, Rocket Pool).",
    ],
    providers: [
      { provider: "Validateur direct (32 ETH)", apy: 3.4, lockupDays: 14, feePct: 0, method: "direct", infoUrl: "https://ethereum.org/staking" },
      { provider: "Lido (stETH)", apy: 3.0, lockupDays: 0, feePct: 10, method: "liquid", infoUrl: "https://lido.fi" },
      { provider: "Rocket Pool (rETH)", apy: 2.9, lockupDays: 0, feePct: 14, method: "liquid", infoUrl: "https://rocketpool.net" },
      { provider: "Coinbase Stake", apy: 2.4, lockupDays: 7, feePct: 25, method: "cex", infoUrl: "https://www.coinbase.com/staking" },
      { provider: "Binance Earn (ETH locked)", apy: 2.6, lockupDays: 30, feePct: 15, method: "cex", infoUrl: "https://www.binance.com/en/earn" },
    ],
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    risks: [
      "Slashing théorique (jamais appliqué massivement à ce jour).",
      "Cooldown de unstake direct ~ 2 epochs (~ 4-5 jours).",
      "Concentration validateurs : risque de censure si tu choisis mal.",
    ],
    providers: [
      { provider: "Validateur direct", apy: 6.8, lockupDays: 4, feePct: 0, method: "direct", infoUrl: "https://solana.com/staking" },
      { provider: "Marinade (mSOL)", apy: 6.5, lockupDays: 0, feePct: 6, method: "liquid", infoUrl: "https://marinade.finance" },
      { provider: "Jito (jitoSOL)", apy: 7.4, lockupDays: 0, feePct: 4, method: "liquid", infoUrl: "https://jito.network" },
      { provider: "Coinbase Stake", apy: 4.8, lockupDays: 5, feePct: 30, method: "cex", infoUrl: "https://www.coinbase.com/staking" },
      { provider: "Binance Earn (SOL)", apy: 5.2, lockupDays: 30, feePct: 20, method: "cex", infoUrl: "https://www.binance.com/en/earn" },
    ],
  },
  {
    id: "cardano",
    symbol: "ADA",
    name: "Cardano",
    risks: [
      "Pas de slashing sur Cardano (modèle Ouroboros).",
      "Pas de lock-up : tes ADA restent dans ton wallet, libres à tout moment.",
      "Rendement variable selon la saturation du pool choisi.",
    ],
    providers: [
      { provider: "Délégation pool (wallet Daedalus/Yoroi)", apy: 3.0, lockupDays: 0, feePct: 1, method: "direct", infoUrl: "https://cardano.org/stake-pool-delegation/" },
      { provider: "Binance Earn (ADA)", apy: 2.3, lockupDays: 30, feePct: 25, method: "cex", infoUrl: "https://www.binance.com/en/earn" },
      { provider: "Kraken Staking", apy: 2.5, lockupDays: 0, feePct: 15, method: "cex", infoUrl: "https://www.kraken.com/features/staking-coins" },
    ],
  },
  {
    id: "polkadot",
    symbol: "DOT",
    name: "Polkadot",
    risks: [
      "Slashing possible si le validateur choisi est offline ou misbehave.",
      "Unbonding de 28 jours (fonds bloqués pendant cette période).",
      "Nomination minimale (~ 250 DOT) pour le staking direct, sinon nomination pool.",
    ],
    providers: [
      { provider: "Nomination pool (wallet)", apy: 11.5, lockupDays: 28, feePct: 0, method: "direct", infoUrl: "https://wiki.polkadot.network/docs/learn-nomination-pools" },
      { provider: "Binance Earn (DOT)", apy: 9.0, lockupDays: 30, feePct: 20, method: "cex", infoUrl: "https://www.binance.com/en/earn" },
      { provider: "Kraken Staking", apy: 10.0, lockupDays: 28, feePct: 15, method: "cex", infoUrl: "https://www.kraken.com/features/staking-coins" },
    ],
  },
  {
    id: "cosmos",
    symbol: "ATOM",
    name: "Cosmos",
    risks: [
      "Slashing si validateur offline ou double-sign.",
      "Unbonding de 21 jours strict.",
      "Inflation élevée — diluant pour les non-stakers.",
    ],
    providers: [
      { provider: "Délégation Keplr / Cosmostation", apy: 14.5, lockupDays: 21, feePct: 5, method: "direct", infoUrl: "https://cosmos.network/learn/staking" },
      { provider: "Binance Earn (ATOM)", apy: 11.0, lockupDays: 30, feePct: 25, method: "cex", infoUrl: "https://www.binance.com/en/earn" },
      { provider: "Kraken Staking", apy: 12.0, lockupDays: 21, feePct: 15, method: "cex", infoUrl: "https://www.kraken.com/features/staking-coins" },
    ],
  },
  {
    id: "near",
    symbol: "NEAR",
    name: "NEAR Protocol",
    risks: [
      "Slashing technique possible (peu courant).",
      "Unbonding ~ 4 epochs (~ 52-65 heures).",
      "Récompenses payées en NEAR — exposition au prix du token.",
    ],
    providers: [
      { provider: "Délégation pool (wallet NEAR)", apy: 9.0, lockupDays: 3, feePct: 5, method: "direct", infoUrl: "https://near.org/stake" },
      { provider: "Binance Earn (NEAR)", apy: 6.5, lockupDays: 30, feePct: 25, method: "cex", infoUrl: "https://www.binance.com/en/earn" },
    ],
  },
];

export function getStakingDataById(id: StakingCryptoData["id"]): StakingCryptoData | null {
  return STAKING_RATES.find((c) => c.id === id) ?? null;
}

/**
 * Calcule les récompenses brutes pour un montant et une durée donnés.
 *
 * Formule simple : `montant * apy * mois / 12`. On NE recompose PAS les
 * intérêts ici car la majorité des CEX/liquid staking distribuent les
 * récompenses en continu mais tu choisis souvent de les sortir.
 * Si l'utilisateur reinvest, le résultat sera plus élevé (mentionné en note).
 */
export function computeStakingReward(
  amountEur: number,
  apyPct: number,
  months: number,
): number {
  if (!Number.isFinite(amountEur) || amountEur <= 0) return 0;
  if (!Number.isFinite(apyPct) || apyPct < 0) return 0;
  if (!Number.isFinite(months) || months <= 0) return 0;
  return (amountEur * (apyPct / 100) * months) / 12;
}
