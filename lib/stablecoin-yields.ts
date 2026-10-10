/**
 * lib/stablecoin-yields.ts — rendements de stablecoins affichés sur /outils/yield-stablecoins (page hors index).
 *
 * Lot Z5 (10/10/2026), demande de Kev : données « toujours à jour », aucune donnée inventée, jamais une valeur sans date.
 *  - Chaque ligne porte sa date de relevé (`releveLe`), affichée avec son âge (<VerifieLe>) ; la date de la page est
 *    calculée depuis les lignes (plus de date globale écrite à la main).
 *  - Aucune de ces lignes n'a de source automatique autorisée : Aave et Rocket Pool ne servent qu'au CONTRÔLE (robot R8,
 *    data/rendements.json) ; Morpho et Kraken l'interdisent par leurs conditions (lues le 10/10/2026). Les lignes Aave
 *    portent `controle` : quand la médiane Aave sur 7 jours tombe dans la fourchette affichée, la page affiche la date
 *    de ce contrôle ; sinon un ticket privé demande la correction.
 *  - Retirées le 10/10/2026 : les anciennes lignes « Earn » USDC/EURC (Coinbase, Kraken, SwissBorg) relevées le
 *    02/05/2026, sans relevé récent (MiCA, art. 50 : un prestataire agréé ne verse pas d'intérêts sur un jeton de
 *    monnaie électronique) ; Kraken USDT Earn, absent de la liste staking/Earn de Kraken lue le 10/10/2026.
 *  - Z5-bis (10/10/2026) : l'offre de Bitpanda existe bien, montée comme un PRÊT hors MiCA (relue sur bitpanda.com/fr) :
 *    elle est affichée avec ses risques, catégorie « Non réglementé ».
 *  - L'ancienne note « mises à jour manuellement pour rester sous le seuil d'un statut CIF » n'avait aucune source : elle
 *    ne justifie rien ici (question juridique non tranchée, à poser à Kev si un jour des taux de plateformes sont automatisés).
 *
 * À NE PAS interpréter comme un conseil en investissement (cf. AMF).
 */

export interface StablecoinYield {
  /** Identifiant plateforme (matche `lib/platforms.ts:Platform.id` quand applicable). */
  platformId: string;
  /** Nom affiché. */
  platformName: string;
  /** Régulation en France/UE : "MiCA" | "PSAN" | "Hors UE". */
  regulation: "MiCA" | "PSAN" | "Hors UE" | "Non réglementé";
  /** Stablecoin proposé. */
  stablecoin: "USDC" | "USDT" | "EURC" | "EURCV" | "DAI";
  /** APY net observé (post-frais plateforme, hors fiscalité). */
  apyMin: number;
  /** Maximum de l'APY (range si applicable, sinon = apyMin). */
  apyMax: number;
  /** Lock-up minimum en jours (0 = liquide instant). */
  lockUpDays: number;
  /** Type de produit : "Earn" (centralisé) / "DeFi" / "Staking" / "Liquidity". */
  productType: "Earn" | "DeFi" | "Staking" | "Liquidity";
  /** Risque (1 = très faible / 5 = très élevé). */
  risk: 1 | 2 | 3 | 4 | 5;
  /** Notes éditoriales (max 100 chars). */
  notes?: string;
  /** Lien d'inscription (affiliation si applicable). */
  url: string;
  /** Date du relevé de la ligne (AAAA-MM-JJ), affichée avec son âge. */
  releveLe: string;
  /** Contrôle par le robot R8 (data/rendements.json) : identifiant du contrôle de la ligne. */
  controle?: "aave-usdc" | "aave-dai";
}

export const STABLECOIN_YIELDS: StablecoinYield[] = [
  // === Centralized Earn (CeFi) ===
  // Reprise Z5 (10/10/2026) : ligne « Bitpanda · MiCA · USDT · Earn 4,0 % » (relevé du 02/05/2026) retirée. L'USDT n'a
  // pas d'émetteur agréé dans l'UE ; la déclaration publique de l'ESMA du 17/01/2025 (ESMA75-223375936-6099) demande aux
  // prestataires d'arrêter leurs services sur ces jetons (au plus une vente seule jusqu'à la fin du T1 2025). Aucun relevé
  // daté ne prouve une offre Earn USDT ouverte en France : la règle de la page (« sans relevé daté, nous ne l'affichons
  // pas ») s'applique.
  // Audit 2026-10-02 : entrées « Binance Earn » retirées — Binance a cessé ses
  // services sur crypto-actifs en France le 1er juillet 2026 (absente du
  // registre MiCA de l'ESMA) ; elles étaient en outre étiquetées « MiCA » à tort.

  // === Earn hors MiCA (prêt à la plateforme) ===
  // Z5-bis (10/10/2026) : bitpanda.com/fr/staking, « Earn on Stablecoins » : prêt d'USDC ou d'EURCV à Bitpanda GmbH,
  // « produit non réglementé », « non couvert par le MiCAR », sans protection des dépôts, propriété transférée pendant le
  // prêt, déverrouillage de 14 jours, récompense de base fixe de 3 % + bonus variable, « jusqu'à 7 % d'APY »,
  // « disponibilité limitée ». Affiché tel quel avec ses risques : retirer l'offre aurait caché une information réelle.
  {
    platformId: "bitpanda",
    platformName: "Bitpanda (Earn on Stablecoins)",
    regulation: "Non réglementé",
    stablecoin: "USDC",
    apyMin: 3.0,
    apyMax: 7.0,
    lockUpDays: 14,
    productType: "Earn",
    risk: 3,
    notes: "Prêt à Bitpanda hors MiCA, sans protection des dépôts. 3 % fixes + bonus variable. Accès limité.",
    url: "https://www.bitpanda.com/fr/staking",
    releveLe: "2026-10-10",
  },
  {
    platformId: "bitpanda",
    platformName: "Bitpanda (Earn on Stablecoins)",
    regulation: "Non réglementé",
    stablecoin: "EURCV",
    apyMin: 3.0,
    apyMax: 7.0,
    lockUpDays: 14,
    productType: "Earn",
    risk: 3,
    notes: "Prêt à Bitpanda hors MiCA, sans protection des dépôts. 3 % fixes + bonus variable. Accès limité.",
    url: "https://www.bitpanda.com/fr/staking",
    releveLe: "2026-10-10",
  },

  // === DeFi (référence — non-MiCA) ===
  {
    platformId: "aave",
    platformName: "Aave V3 (DeFi)",
    regulation: "Hors UE",
    stablecoin: "USDC",
    apyMin: 3.8,
    apyMax: 6.2,
    lockUpDays: 0,
    productType: "DeFi",
    risk: 4,
    notes: "Risque de smart contract. Taux variable selon l'utilisation. Réseau Ethereum.",
    url: "https://app.aave.com/",
    releveLe: "2026-05-02",
    controle: "aave-usdc",
  },
  {
    platformId: "aave",
    platformName: "Aave V3 (DeFi)",
    regulation: "Hors UE",
    stablecoin: "DAI",
    apyMin: 4.0,
    apyMax: 7.5,
    lockUpDays: 0,
    productType: "DeFi",
    risk: 4,
    url: "https://app.aave.com/",
    releveLe: "2026-05-02",
    controle: "aave-dai",
  },
  {
    platformId: "compound",
    platformName: "Compound V3",
    regulation: "Hors UE",
    stablecoin: "USDC",
    apyMin: 3.5,
    apyMax: 5.5,
    lockUpDays: 0,
    productType: "DeFi",
    risk: 4,
    url: "https://app.compound.finance/",
    releveLe: "2026-05-02",
  },
];

/** Dates de relevé de toutes les lignes (la plus ancienne compte pour l'âge affiché). */
export function datesReleveStablecoins(lignes: ReadonlyArray<Pick<StablecoinYield, "releveLe">> = STABLECOIN_YIELDS): string[] {
  return lignes.map((y) => y.releveLe);
}

/**
 * Filtre + tri pour le composant table : récupère les yields d'un stablecoin
 * donné triés par APY desc (meilleur en haut). Si `regulation` est précisé,
 * limite aux plateformes répondant au critère (ex: "MiCA" only pour FR).
 */
export function getYieldsFor(
  stablecoin: StablecoinYield["stablecoin"],
  options: { regulationOnly?: StablecoinYield["regulation"][] } = {},
): StablecoinYield[] {
  const filtered = STABLECOIN_YIELDS.filter((y) => {
    if (y.stablecoin !== stablecoin) return false;
    if (options.regulationOnly && !options.regulationOnly.includes(y.regulation)) {
      return false;
    }
    return true;
  });
  // Tri par APY max descendant (meilleur opportunité en haut), tiebreaker = risk asc
  return filtered.sort((a, b) => {
    if (b.apyMax !== a.apyMax) return b.apyMax - a.apyMax;
    return a.risk - b.risk;
  });
}

/** Liste unique des stablecoins représentés (pour l'UI tabs). */
export function getAvailableStablecoins(): StablecoinYield["stablecoin"][] {
  const set = new Set<StablecoinYield["stablecoin"]>();
  for (const y of STABLECOIN_YIELDS) set.add(y.stablecoin);
  return Array.from(set);
}
