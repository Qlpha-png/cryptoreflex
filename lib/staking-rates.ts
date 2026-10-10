/**
 * staking-rates.ts — APY de référence par crypto pour le Calculateur APY Staking.
 *
 * Deux sortes de lignes (lot Z5, 10/10/2026) :
 *  - « Lido (stETH) » : APR publié par Lido, relu chaque jour par le robot R8 (data/rendements.json, lib/rendements.ts),
 *    médiane sur 7 jours, NET de la commission de Lido (apyNet) ; date et source affichées avec la ligne. Si le fichier
 *    est illisible, la ligne n'est pas affichée (jamais une valeur sans date) ;
 *  - toutes les autres : taux relevés à la main (champ `releve`, jamais rajeuni), sans source automatique autorisée
 *    (Kraken, Coinbase : conditions d'utilisation ; Rocket Pool : contrôlé par R8, jamais affiché). Leur âge est affiché
 *    par <VerifieLe>. Z5-bis (10/10/2026) : relecture des pages publiques (ethereum.org, Kraken version française,
 *    Marinade, Jito) et des paramètres publics des réseaux (Solana, NEAR) ; les lignes du T1 2026 restantes ne sont pas
 *    contredites (Coinbase illisible : HTTP 403) ; une ligne sans aucune source citable porte `nonReleve`.
 * Les chiffres SONT INDICATIFS — pas de promesse de rendement.
 *
 * Audit 2026-10-02 : providers « Binance Earn » retirés (Binance ne fournit plus
 * de services sur crypto-actifs en France depuis le 1er juillet 2026).
 */
import { oldestIso } from "@/lib/data-dates";
import { TAUX_LIDO, type IdControle, type TauxLido } from "@/lib/rendements";

export type StakingMethod = "direct" | "liquid" | "cex";

/** Période d'un relevé éditorial : `debut` = début de période (calcul de l'âge), `texte` = période telle qu'écrite. */
export interface PeriodeReleve {
  debut: string;
  texte: string;
}

export interface StakingProviderRate {
  /** Nom affiché (ex: "Lido", "Kraken Staking"). */
  provider: string;
  /** APY indicatif (en %) — brut, sauf si `apyNet` (frais déjà déduits par la source). */
  apy: number;
  /** true : `apy` est déjà net des frais du fournisseur (APR publié par Lido) ; les frais ne sont pas retirés une 2e fois. */
  apyNet?: boolean;
  /** Période de lock-up estimée en jours (0 = liquid / instant). */
  lockupDays: number;
  /** Frais retenus par le provider (en %, ex: 10 pour Lido). */
  feePct: number;
  /** Méthode (direct, liquid, cex). */
  method: StakingMethod;
  /** URL d'info (jamais affilié ici — ce sont les données de référence). */
  infoUrl: string;
  /** Relevé éditorial (lignes sans source automatique). */
  releve?: PeriodeReleve;
  /** Taux tenu par le robot R8 (date, méthode, source). */
  taux?: TauxLido;
  /** Ligne contrôlée par le robot R8 (data/rendements.json) : en écart, le taux n'est plus affiché (reprise Z5). */
  controle?: IdControle;
  /** Z5-bis : aucun taux publié par une source citable ; `apy` n'est ni affiché ni utilisé (ligne « Taux non relevé »). */
  nonReleve?: true;
}

/** Relevé éditorial du calculateur : « APY indicatifs Q1 2026 » (08/10/2026, lot fraîcheur A2 ; aucun jour inventé). */
const T1_2026: PeriodeReleve = { debut: "2026-01", texte: "T1 2026" };
/** Relecture du 10/10/2026 (Z5-bis). */
const RELU_10_10: PeriodeReleve = { debut: "2026-10-10", texte: "10/10/2026" };

/** Ligne Lido tenue par le robot R8, ou rien si data/rendements.json est illisible. */
function ligneLido(t: TauxLido | null): StakingProviderRate[] {
  if (!t) return [];
  return [{ provider: "Lido (stETH)", apy: t.valeurPct, apyNet: true, lockupDays: 0, feePct: 10, method: "liquid", infoUrl: "https://lido.fi", taux: t }];
}

/** APY net d'un fournisseur (en %) : frais retirés seulement d'un APY brut. */
export function apyNetFournisseur(p: Pick<StakingProviderRate, "apy" | "apyNet" | "feePct">): number {
  return p.apyNet ? p.apy : p.apy * (1 - p.feePct / 100);
}

/** Plus ancien relevé éditorial d'une liste de fournisseurs (null si toutes les lignes sont tenues par le robot). */
export function plusAncienReleve(providers: ReadonlyArray<Pick<StakingProviderRate, "releve">>): PeriodeReleve | null {
  const rel = providers.map((p) => p.releve).filter((r): r is PeriodeReleve => !!r);
  const debut = oldestIso(rel.map((r) => r.debut));
  return rel.find((r) => r.debut === debut) ?? null;
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
      { provider: "Validateur direct (32 ETH)", apy: 2.5, lockupDays: 14, feePct: 0, method: "direct", infoUrl: "https://ethereum.org/fr/staking/", releve: RELU_10_10 },
      ...ligneLido(TAUX_LIDO),
      { provider: "Rocket Pool (rETH)", apy: 2.9, lockupDays: 0, feePct: 14, method: "liquid", infoUrl: "https://rocketpool.net", releve: T1_2026, controle: "rocketpool-reth" },
      { provider: "Coinbase Stake", apy: 2.4, lockupDays: 7, feePct: 25, method: "cex", infoUrl: "https://www.coinbase.com/staking", releve: T1_2026 },
    ],
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    risks: [
      "Slashing théorique (jamais appliqué massivement à ce jour).",
      "Cooldown de unstake direct ~ 2 epochs (~ 4-5 jours).",
      "Concentration validateurs : risque de censure si vous choisissez mal.",
    ],
    providers: [
      { provider: "Validateur direct", apy: 5.2, lockupDays: 4, feePct: 0, method: "direct", infoUrl: "https://solana.com/staking", releve: RELU_10_10 },
      { provider: "Marinade (mSOL)", apy: 4.75, apyNet: true, lockupDays: 0, feePct: 6, method: "liquid", infoUrl: "https://marinade.finance", releve: RELU_10_10 },
      { provider: "Jito (jitoSOL)", apy: 4.89, apyNet: true, lockupDays: 0, feePct: 4, method: "liquid", infoUrl: "https://jito.network", releve: RELU_10_10 },
      { provider: "Coinbase Stake", apy: 4.8, lockupDays: 5, feePct: 30, method: "cex", infoUrl: "https://www.coinbase.com/staking", releve: T1_2026 },
    ],
  },
  {
    id: "cardano",
    symbol: "ADA",
    name: "Cardano",
    risks: [
      "Pas de slashing sur Cardano (modèle Ouroboros).",
      "Pas de lock-up : vos ADA restent dans votre wallet, libres à tout moment.",
      "Rendement variable selon la saturation du pool choisi.",
    ],
    providers: [
      { provider: "Délégation pool (wallet Daedalus/Yoroi)", apy: 3.0, lockupDays: 0, feePct: 1, method: "direct", infoUrl: "https://cardano.org/stake-pool-delegation/", releve: T1_2026 },
      { provider: "Kraken Staking", apy: 2.65, lockupDays: 0, feePct: 15, method: "cex", infoUrl: "https://www.kraken.com/pro/staking", releve: RELU_10_10 },
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
      { provider: "Nomination pool (wallet)", apy: 0, nonReleve: true, lockupDays: 28, feePct: 0, method: "direct", infoUrl: "https://wiki.polkadot.network/docs/learn-nomination-pools", releve: RELU_10_10 },
      { provider: "Kraken Staking", apy: 1.37, lockupDays: 0, feePct: 15, method: "cex", infoUrl: "https://www.kraken.com/pro/staking", releve: RELU_10_10 },
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
      { provider: "Délégation Keplr / Cosmostation", apy: 14.5, lockupDays: 21, feePct: 5, method: "direct", infoUrl: "https://cosmos.network/learn/staking", releve: T1_2026 },
      { provider: "Kraken Staking", apy: 10.52, lockupDays: 0, feePct: 15, method: "cex", infoUrl: "https://www.kraken.com/pro/staking", releve: RELU_10_10 },
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
      { provider: "Délégation pool (wallet NEAR)", apy: 5.6, lockupDays: 3, feePct: 5, method: "direct", infoUrl: "https://near.org/stake", releve: RELU_10_10 },
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
