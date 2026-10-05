/**
 * lib/fx-fallback.ts — taux de change de secours (unités de devise pour 1 dollar), utilisables côté navigateur.
 *
 * Taux de référence de la BCE du 02/10/2026 (api.frankfurter.dev, relevé le 05/10/2026). Ils ne servent que si le taux du
 * jour est indisponible (lib/fx.ts) ou comme valeur par défaut d'un composant : à rafraîchir quand l'écart dépasse ~2 %.
 * Avant le 05/10/2026, le site utilisait 1 USD = 0,92 € (taux de mai) : prix en euros surévalués de 3,3 %.
 */
export const FX_FALLBACK = { usd: 1, eur: 0.89087, gbp: 0.75753, chf: 0.82664, date: "2026-10-02" } as const;
