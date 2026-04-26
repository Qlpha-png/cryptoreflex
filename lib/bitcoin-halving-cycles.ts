/**
 * bitcoin-halving-cycles.ts — Données historiques + projections halving Bitcoin.
 *
 * Source : Bitcoin Magazine, Glassnode, et calculs sur le bloc actuel
 * (https://www.blockchain.com/explorer/charts/total-bitcoins). Les chiffres
 * historiques sont vérifiables on-chain. Les projections futures sont des
 * SCÉNARIOS — affichage explicite "estimation, pas un conseil".
 */

export interface HalvingEvent {
  /** Numéro du halving (1 = 2012, 2 = 2016, 3 = 2020, 4 = 2024, 5 = 2028...). */
  index: number;
  /** Date approximative ISO (mois précis, jour ~ 14j de tolérance pour les futurs). */
  dateIso: string;
  /** Récompense par bloc après le halving (BTC). */
  rewardAfter: number;
  /** Prix BTC en EUR au jour du halving (estimation marchés FR). null = futur. */
  priceAtEur: number | null;
  /** ATH cycle suivant en EUR. null = futur. */
  athNextCycleEur: number | null;
  /** Mois entre halving et ATH. null = futur. */
  monthsToAth: number | null;
}

/**
 * Historique des halvings Bitcoin.
 * Les prix sont des moyennes du marché EUR à la date donnée
 * (sources Cryptocompare + CoinGecko archive). Tolérance ±5 % sur les ATH
 * car ils diffèrent légèrement entre exchanges et indices.
 */
export const HALVING_HISTORY: HalvingEvent[] = [
  {
    index: 1,
    dateIso: "2012-11-28",
    rewardAfter: 25,
    priceAtEur: 10,
    athNextCycleEur: 950,
    monthsToAth: 12,
  },
  {
    index: 2,
    dateIso: "2016-07-09",
    rewardAfter: 12.5,
    priceAtEur: 580,
    athNextCycleEur: 16500,
    monthsToAth: 17,
  },
  {
    index: 3,
    dateIso: "2020-05-11",
    rewardAfter: 6.25,
    priceAtEur: 7800,
    athNextCycleEur: 56000,
    monthsToAth: 18,
  },
  {
    index: 4,
    dateIso: "2024-04-20",
    rewardAfter: 3.125,
    priceAtEur: 60500,
    athNextCycleEur: 105000,
    monthsToAth: 13,
  },
];

export const FUTURE_HALVINGS: HalvingEvent[] = [
  {
    index: 5,
    dateIso: "2028-04-15",
    rewardAfter: 1.5625,
    priceAtEur: null,
    athNextCycleEur: null,
    monthsToAth: null,
  },
  {
    index: 6,
    dateIso: "2032-04-15",
    rewardAfter: 0.78125,
    priceAtEur: null,
    athNextCycleEur: null,
    monthsToAth: null,
  },
  {
    index: 7,
    dateIso: "2036-04-15",
    rewardAfter: 0.390625,
    priceAtEur: null,
    athNextCycleEur: null,
    monthsToAth: null,
  },
];

export type Scenario = "conservative" | "moderate" | "bullish";

export interface ScenarioParams {
  label: string;
  description: string;
  /** Multiplicateur de prix appliqué à chaque halving. 1 = stable. */
  perCycleMultiplier: number;
}

export const SCENARIOS: Record<Scenario, ScenarioParams> = {
  conservative: {
    label: "Conservateur",
    description: "Prix BTC stable cycle après cycle (pas de croissance, juste l'inflation).",
    perCycleMultiplier: 1,
  },
  moderate: {
    label: "Moyen",
    description: "ATH +50 % par cycle (les rendements diminuent à mesure que la capitalisation monte).",
    perCycleMultiplier: 1.5,
  },
  bullish: {
    label: "Bullish",
    description: "Reproduction du cycle 2020 → 2024 (ATH ~ x1.75 par cycle). Hypothèse haute.",
    perCycleMultiplier: 1.75,
  },
};

export interface DcaProjectionPoint {
  /** Date ISO du point (souvent = date d'un halving futur). */
  dateIso: string;
  /** Label affichable ex: "Halving 2028". */
  label: string;
  /** Total investi en EUR à cette date. */
  invested: number;
  /** Prix BTC estimé en EUR sous le scénario. */
  estimatedBtcPriceEur: number;
  /** Quantité totale de BTC accumulée. */
  btcAccumulated: number;
  /** Valeur portfolio en EUR. */
  portfolioValueEur: number;
}

const PRICE_AT_LAST_HALVING_EUR = HALVING_HISTORY[HALVING_HISTORY.length - 1].athNextCycleEur ?? 105000;

/**
 * Construit la liste des dates intermédiaires (mensuelles ou hebdo) entre
 * deux dates et calcule la projection de portfolio en DCA pour chacune.
 */
export function buildHalvingProjection(
  monthlyEur: number,
  scenario: Scenario,
  startDateIso: string,
  /** "monthly" ou "weekly". */
  frequency: "monthly" | "weekly" = "monthly",
): DcaProjectionPoint[] {
  if (!Number.isFinite(monthlyEur) || monthlyEur <= 0) return [];

  const start = new Date(startDateIso);
  if (Number.isNaN(start.getTime())) return [];

  const params = SCENARIOS[scenario];
  // Prix de base pour la projection : ATH du cycle 2024 connu (~ 105 k EUR).
  // On part du principe que tu commences à acheter aujourd'hui à ce prix.
  let estimatedPrice = PRICE_AT_LAST_HALVING_EUR;
  let invested = 0;
  let btcAccumulated = 0;

  const points: DcaProjectionPoint[] = [];

  // On ajoute un point par halving futur uniquement (max 3 cycles, soit ~ 12 ans).
  for (const halving of FUTURE_HALVINGS) {
    const target = new Date(halving.dateIso);
    if (target < start) continue;

    // Combien de périodes de DCA entre `start` et `target` ?
    const monthsBetween = Math.max(
      0,
      (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth()),
    );
    const periods =
      frequency === "weekly" ? Math.round(monthsBetween * 4.345) : monthsBetween;
    const perPeriodEur =
      frequency === "weekly" ? monthlyEur / 4.345 : monthlyEur;

    // Le prix BTC monte LINÉAIREMENT vers le multiplicateur du cycle, pour
    // éviter de "spike" tout d'un coup à un seul point (graphe trompeur).
    const targetPriceForThisCycle =
      estimatedPrice * params.perCycleMultiplier;

    // Estime un prix moyen d'achat sur la période (interpolation linéaire).
    const avgPriceDuringPeriod = (estimatedPrice + targetPriceForThisCycle) / 2;

    // Reset les trackers locaux pour ce segment et accumule.
    let segmentInvested = 0;
    let segmentBtc = 0;
    for (let p = 0; p < periods; p++) {
      // Prix linéaire interpolé : `start + (target - start) * (p+1)/periods`
      const interp = (p + 1) / Math.max(periods, 1);
      const priceAtP =
        estimatedPrice + (targetPriceForThisCycle - estimatedPrice) * interp;
      segmentBtc += perPeriodEur / priceAtP;
      segmentInvested += perPeriodEur;
    }

    invested += segmentInvested;
    btcAccumulated += segmentBtc;
    estimatedPrice = targetPriceForThisCycle;

    points.push({
      dateIso: halving.dateIso,
      label: `Halving ${target.getFullYear()}`,
      invested: Math.round(invested),
      estimatedBtcPriceEur: Math.round(estimatedPrice),
      btcAccumulated: Number(btcAccumulated.toFixed(6)),
      portfolioValueEur: Math.round(btcAccumulated * estimatedPrice),
    });

    // Petite référence non utilisée mais qui rappelle que le prix moyen est la base
    void avgPriceDuringPeriod;
  }

  return points;
}

/** Distance en jours d'aujourd'hui au prochain halving. */
export function daysToNextHalving(): number {
  const now = new Date();
  const next = new Date(FUTURE_HALVINGS[0].dateIso);
  return Math.max(0, Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}
