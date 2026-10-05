/**
 * lib/fx.ts — taux de change du jour (unités de devise pour 1 dollar), côté serveur.
 *
 * Audit du 05/10/2026 : plusieurs écrans (suivi de portefeuille, alertes de prix, convertisseur, listes) convertissaient avec un
 * taux figé en mai (1 USD = 0,92 €) alors que la BCE donnait 0,8909 € le 02/10/2026 : prix en euros surévalués de 3,3 %
 * (franc suisse 6,5 %, livre 4,3 %).
 * Source : taux de référence de la BCE (api.frankfurter.dev, gratuit, sans clé), mis en cache 6 h ; secours pour l'euro : paire
 * EURUSDT de Binance ; dernier recours : FX_FALLBACK (lib/fx-fallback.ts).
 */
import { unstable_cache } from "next/cache";
import { FX_FALLBACK } from "@/lib/fx-fallback";

export interface FiatPerUsd {
  usd: 1;
  eur: number;
  gbp: number;
  chf: number;
  /** date du taux (AAAA-MM-JJ) */
  date: string;
  source: "bce" | "binance" | "secours";
}

const ok = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x > 0.3 && x < 3;

async function fetchFx(): Promise<FiatPerUsd> {
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,GBP,CHF", { signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (res.ok) {
      const j = (await res.json()) as { date?: string; rates?: { EUR?: number; GBP?: number; CHF?: number } };
      const r = j.rates ?? {};
      if (ok(r.EUR) && ok(r.GBP) && ok(r.CHF)) return { usd: 1, eur: r.EUR, gbp: r.GBP, chf: r.CHF, date: j.date ?? "", source: "bce" };
    }
  } catch {
    /* source suivante */
  }
  try {
    const res = await fetch("https://data-api.binance.vision/api/v3/ticker/price?symbol=EURUSDT", { signal: AbortSignal.timeout(3000), cache: "no-store" });
    if (res.ok) {
      const eurInUsd = parseFloat(((await res.json()) as { price?: string }).price ?? "");
      if (ok(eurInUsd)) {
        const eur = 1 / eurInUsd;
        /* livre et franc suisse : on garde leur rapport à l'euro du dernier taux BCE connu */
        return { usd: 1, eur, gbp: (FX_FALLBACK.gbp / FX_FALLBACK.eur) * eur, chf: (FX_FALLBACK.chf / FX_FALLBACK.eur) * eur, date: new Date().toISOString().slice(0, 10), source: "binance" };
      }
    }
  } catch {
    /* secours */
  }
  return { ...FX_FALLBACK, source: "secours" };
}

/* un taux de secours n'est pas mis en cache (on retentera à l'appel suivant) */
const cached = unstable_cache(
  async (): Promise<FiatPerUsd> => {
    const fx = await fetchFx();
    if (fx.source === "secours") throw new Error("taux du jour indisponible");
    return fx;
  },
  ["fx-fiat-per-usd-v1"],
  { revalidate: 6 * 3600, tags: ["fx"] },
);

/** Taux du jour, jamais d'exception : en dernier recours, les taux BCE de FX_FALLBACK. */
export async function fiatPerUsd(): Promise<FiatPerUsd> {
  try {
    return await cached();
  } catch {
    return { ...FX_FALLBACK, source: "secours" };
  }
}

/** Prix en euros d'une unité de devise ou de stablecoin dollar (convertisseur). */
export function eurPerUnit(fx: FiatPerUsd): Record<string, number> {
  return { eur: 1, usd: fx.eur, usdt: fx.eur, usdc: fx.eur, dai: fx.eur, gbp: fx.eur / fx.gbp, chf: fx.eur / fx.chf };
}
