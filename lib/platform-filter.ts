/**
 * Filtre neutre des plateformes autorisées en France (07/10/2026), à la place du questionnaire « quelle plateforme
 * pour vous ? ». L'AMF (actualité du 04/08/2026, position DOC-2006-23 mise à jour) range dans le conseil sur
 * crypto-actifs, soumis à agrément, les recommandations personnalisées sur l'utilisation de services sur crypto-actifs ;
 * l'information non personnalisée destinée au public reste libre. Le filtre ne note donc rien et ne classe rien : il
 * garde les plateformes autorisées en France qui remplissent les critères cochés, par ordre alphabétique.
 *
 * Seuls des critères appuyés sur un relevé daté et sourcé servent de filtre :
 *  - paiement par carte : fees.cost.card (relevé des grilles officielles) ;
 *  - aide en français : support.frenchChat / frenchPhone (relevé des pages d'assistance officielles) ;
 *  - coût publié : fees.cost.kind et c100 (relevé des grilles officielles).
 * Staking, montant minimum et nombre de cryptos ne sont pas relevés sur une source datée : ils ne filtrent rien.
 */
import type { Platform } from "@/lib/platforms";
import { frenchHelpLabel, frenchHelpRank, isAvailableFr } from "@/lib/platforms";

export type FilterKey = "card" | "french" | "fullCost";
export type FilterChoice = "oui" | "peu-importe";
export type FilterAnswers = Partial<Record<FilterKey, FilterChoice>>;

/** Date ISO (AAAA-MM-JJ) → « 5 octobre 2026 », espaces insécables (la date ne se coupe pas en fin de ligne). */
export function dateFr(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d
        .toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })
        .replace(/ /g, " ");
}

/** « relevé du 5 octobre 2026 » ou « relevés du 5 octobre 2026 au 6 octobre 2026 », d'après les dates présentes. */
export function releveText(dates: (string | null | undefined)[]): string | null {
  const ok = dates.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (!ok.length) return null;
  const first = ok[0];
  const last = ok[ok.length - 1];
  return first === last ? `relevé du ${dateFr(first)}` : `relevés du ${dateFr(first)} au ${dateFr(last)}`;
}

/** Achat par carte possible pour un résident français, d'après le relevé fees.cost.card. */
export function cardAvailable(p: Platform): boolean {
  return p.fees.cost != null && p.fees.cost.card !== null;
}

/** Coût d'un achat de 100 € publié en entier (exact) ou plafonné (max), d'après le relevé fees.cost. */
export function fullCostPublished(p: Platform): boolean {
  const c = p.fees.cost;
  return c != null && c.c100 != null && (c.kind === "exact" || c.kind === "max");
}

export function cardFact(p: Platform): string {
  if (!p.fees.cost) return "Non relevé";
  return p.fees.cost.card === null ? "Pas d'achat par carte pour un résident français" : "Achat par carte possible";
}

export function costFact(p: Platform): string {
  const c = p.fees.cost;
  if (!c) return "Non relevé";
  if (c.c100 == null) return "Non publié";
  if (c.kind === "exact") return "Publié en entier";
  if (c.kind === "max") return "Plafond publié";
  return "Frais publiés + marge non chiffrée";
}

export interface FilterCriterion {
  key: FilterKey;
  /** Question affichée. */
  title: string;
  subtitle: string;
  /** Libellé de l'option qui active le filtre. */
  yesLabel: string;
  yesHint: string;
  /** Libellé court pour le récapitulatif des critères. */
  short: string;
  /** Libellé de la donnée affichée sur chaque plateforme. */
  factLabel: string;
  test: (p: Platform) => boolean;
  fact: (p: Platform) => string;
  /** Dates des relevés utilisés par ce critère. */
  dates: (p: Platform) => (string | null | undefined)[];
}

export const ANY_LABEL = "Peu importe";
export const ANY_HINT = "Ce critère ne filtre rien";

export const CRITERIA: FilterCriterion[] = [
  {
    key: "card",
    title: "Voulez-vous pouvoir payer par carte bancaire ?",
    subtitle: "Retire les plateformes qui ne proposent pas d'achat par carte à un résident français.",
    yesLabel: "Oui, payer par carte",
    yesHint: "Garde les plateformes où l'achat par carte est possible",
    short: "Paiement par carte",
    factLabel: "Carte bancaire",
    test: cardAvailable,
    fact: cardFact,
    dates: (p) => [p.fees.cost?.date],
  },
  {
    key: "french",
    title: "Voulez-vous une aide en français (chat ou téléphone) ?",
    subtitle:
      "Garde les plateformes dont la page d'assistance officielle annonce un chat ou un téléphone en français. Celles dont la page ne le dit pas sont retirées.",
    yesLabel: "Oui, aide en français",
    yesHint: "Chat ou téléphone en français annoncé par la plateforme",
    short: "Aide en français",
    factLabel: "Aide en français",
    test: (p) => frenchHelpRank(p.support) > 0,
    fact: (p) => frenchHelpLabel(p.support),
    dates: (p) => [p.support.verified],
  },
  {
    key: "fullCost",
    title: "Voulez-vous connaître le coût d'un achat avant de payer ?",
    subtitle:
      "Garde les plateformes qui publient le coût complet d'un achat de Bitcoin payé avec le solde en euros, ou au moins son plafond. Les autres ajoutent une marge qu'elles ne chiffrent pas, ou ne publient pas ce coût.",
    yesLabel: "Oui, coût publié",
    yesHint: "Coût complet ou plafond publié par la plateforme",
    short: "Coût publié",
    factLabel: "Coût d'un achat de Bitcoin",
    test: fullCostPublished,
    fact: costFact,
    dates: (p) => [p.fees.cost?.date],
  },
];

/** Plateformes du champ du filtre : exchanges et courtiers autorisés en France (sans les portefeuilles matériels). */
export function filterScope(platforms: Platform[]): Platform[] {
  return platforms.filter((p) => p.category !== "wallet" && isAvailableFr(p));
}

/** Plateformes autorisées en France qui remplissent tous les critères cochés, par ordre alphabétique. */
export function filterPlatforms(platforms: Platform[], answers: FilterAnswers): Platform[] {
  const active = CRITERIA.filter((c) => answers[c.key] === "oui");
  return filterScope(platforms)
    .filter((p) => active.every((c) => c.test(p)))
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
}

/**
 * Pourquoi l'ordre est alphabétique, chiffré depuis les données : combien de plateformes publient le coût complet
 * d'un achat (kind « exact »).
 */
export function costCoverage(platforms: Platform[]): { total: number; exact: number } {
  const scope = filterScope(platforms);
  return {
    total: scope.length,
    exact: scope.filter((p) => p.fees.cost?.c100 != null && p.fees.cost.kind === "exact").length,
  };
}

/** Phrase exacte de l'avertissement (demande de Kev, 07/10/2026). */
export const FILTER_DISCLAIMER =
  "Ce filtre n'est pas un conseil personnalisé : il liste les plateformes autorisées en France qui remplissent vos critères.";
