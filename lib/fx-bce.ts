/**
 * lib/fx-bce.ts — taux de change de référence de la BCE (lot Z4, 10/10/2026), utilisable côté serveur ET navigateur.
 *
 * Source unique : data/fx-bce.json, écrit par le robot R6 (.github/workflows/fx-bce.yml, scripts/fx-bce.mjs) qui lit
 * https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml chaque jour ouvré après la publication de la BCE.
 * Aucun appel réseau au rendu (la BCE et ses relais échouaient depuis Vercel : la production servait un taux en dur).
 *
 * Repli : seulement si le fichier est illisible ou incomplet (REPLI_BCE ci-dessous : publication de la BCE du 09/10/2026,
 * relue par le robot le 10/10/2026). Il porte sa date, affichée telle quelle avec « dernier taux BCE connu ».
 * Licence : « users of this website may make free use of the information », la BCE doit être citée (S6).
 */
import fichier from "@/data/fx-bce.json";

export type SourceFx = "bce" | "secours";

/** Unités de devise pour 1 dollar, date de la publication BCE (AAAA-MM-JJ). */
export interface FiatPerUsd {
  usd: 1;
  eur: number;
  gbp: number;
  chf: number;
  /** date de la publication de la BCE (AAAA-MM-JJ) */
  date: string;
  source: SourceFx;
}

/** Adresse publique de la page des taux de référence de la BCE (mention « Source : BCE »). */
export const BCE_TAUX_URL = "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html";

/** Repli en dur : publication de la BCE du 09/10/2026 (1 € = 1,1206 $ ; 0,84763 £ ; 0,9313 CHF), seulement si data/fx-bce.json est illisible. */
const REPLI_PAR_EURO = { USD: 1.1206, GBP: 0.84763, CHF: 0.9313 } as const;
const REPLI_DATE = "2026-10-09";

const plausible = (x: unknown, min: number, max: number): x is number => typeof x === "number" && Number.isFinite(x) && x > min && x < max;

function depuisParEuro(p: { USD: number; GBP: number; CHF: number }, date: string, source: SourceFx): FiatPerUsd {
  return { usd: 1, eur: 1 / p.USD, gbp: p.GBP / p.USD, chf: p.CHF / p.USD, date, source };
}

/** Lecture défensive du contenu de data/fx-bce.json (exportée pour les tests). */
export function lireFxBce(j: unknown): FiatPerUsd {
  const o = j as { date?: unknown; parEuro?: Record<string, unknown> } | null;
  const p = o?.parEuro ?? {};
  const date = typeof o?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : null;
  if (date && plausible(p.USD, 0.6, 2) && plausible(p.GBP, 0.5, 1.5) && plausible(p.CHF, 0.5, 2)) {
    return depuisParEuro({ USD: p.USD, GBP: p.GBP, CHF: p.CHF }, date, "bce");
  }
  return depuisParEuro(REPLI_PAR_EURO, REPLI_DATE, "secours");
}

/** Taux BCE en vigueur sur le site (unités de devise pour 1 dollar). */
export const FX_BCE: FiatPerUsd = lireFxBce(fichier);

/** JJ/MM (court) ou JJ/MM/AAAA d'une date AAAA-MM-JJ. */
export function jourFx(date: string, long = false): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  return long ? `${m[3]}/${m[2]}/${m[1]}` : `${m[3]}/${m[2]}`;
}

/**
 * Mention à placer à côté d'un prix en euros calculé depuis un prix en dollars :
 * « converti au taux BCE du 09/10 » (ou « converti au dernier taux BCE connu, du 09/10/2026 » en repli).
 */
export function mentionConversionBce(fx: Pick<FiatPerUsd, "date" | "source"> = FX_BCE): string {
  return fx.source === "secours" ? `converti au dernier taux BCE connu, du ${jourFx(fx.date, true)}` : `converti au taux BCE du ${jourFx(fx.date)}`;
}

/** Mention d'un taux de change affiché : « taux de référence BCE du 09/10/2026 ». */
export function mentionFxBce(fx: Pick<FiatPerUsd, "date" | "source"> = FX_BCE): string {
  // reprise Z4 : « BCE » une seule fois (le taux de référence est publié par la BCE : la source est dans la phrase)
  return fx.source === "secours" ? `dernier taux de référence BCE connu, du ${jourFx(fx.date, true)}` : `taux de référence BCE du ${jourFx(fx.date, true)}`;
}
