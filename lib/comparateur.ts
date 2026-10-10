/**
 * Comparateur de plateformes (refonte du 05/10/2026) — calculs purs, testés (tests/lib/comparateur.test.ts).
 *
 * Une seule mesure, compréhensible par tous : « combien me coûte un achat de Bitcoin de 100 € ou de 1 000 € par le chemin le
 * plus simple de l'appli, après un virement SEPA » (et « par carte »). Les montants viennent de fees.cost : recalculés depuis la
 * grille officielle de chaque plateforme, datés et sourcés. Trois niveaux de fiabilité (CostKind) :
 *  - « exact » : tout est publié ; « max » : la marge publiée est comptée à son maximum (« au plus ») ;
 *  - « partiel » : une marge non chiffrée s'ajoute. Un coût partiel n'est JAMAIS classé devant un coût publié en entier,
 *    et un coût non publié passe en dernier.
 */
import { dateFraisAffichee } from "@/lib/frais-auto";
import { frenchHelpLabel, frenchHelpRank, isAvailableFr, type CostKind, type Platform } from "@/lib/platforms";

export type Goal = "prix" | "debutant" | "francais" | "carte";
export type Amount = 100 | 1000;

export interface Cost {
  c100: number | null;
  c1000: number | null;
  kind: CostKind;
}

export interface Row {
  id: string;
  name: string;
  /** autorité qui a délivré l'agrément MiCA (ex. « AMF, France ») */
  authority: string;
  /** pays de l'autorité qui a délivré l'agrément (« Irlande », « France »…) */
  country: string;
  french: boolean;
  /** Aide en français relevée sur la page officielle d'assistance (« Téléphone et chat », « Chat », « Non », « Non vérifié »…). */
  supportFr: string;
  /** 2 : téléphone en français ; 1 : chat en français ; 0 : sinon, non vérifié compris (tri « débutant »). */
  supportFrRank: number;
  score: number;
  ux: number;
  simple: Cost;
  /** null : pas d'achat par carte pour un résident français */
  card: Cost | null;
  /** chemin d'achat le plus simple, tel que la plateforme le décrit */
  path: string;
  /** précision sur les frais (une phrase) */
  note: string | null;
  verifiedDate: string | null;
  /** vrai : la date vient du contrôle automatique des grilles (lib/frais-auto.ts), pas d'une relecture humaine */
  verifiedAuto: boolean;
  source: string | null;
  affiliateUrl: string;
  affiliationNotice: string;
}

/** Coûts d'une plateforme : relevé du 05/10/2026 (fees.cost), sinon estimation partielle depuis les champs historiques. */
export function costsOf(p: Platform): { simple: Cost; card: Cost | null; path: string; note: string | null } {
  const c = p.fees.cost;
  if (c) return { simple: { c100: c.c100, c1000: c.c1000, kind: c.kind }, card: c.card, path: c.path, note: c.note ?? null };
  const mt = p.fees.verified?.makerTakerApplies ?? true;
  const pct = mt ? p.fees.spotTaker : p.fees.instantBuy;
  const at = (n: number) => Math.round(n * pct) / 100;
  return {
    simple: { c100: at(100), c1000: at(1000), kind: "partiel" },
    card: null,
    path: mt ? "ordre au marché, après virement" : "achat dans l'appli, après virement",
    note: null,
  };
}

/** Date des frais d'une ligne et sa nature (relecture humaine ou contrôle automatique des grilles, lot Z6). */
function verifiee(p: Platform): { verifiedDate: string | null; verifiedAuto: boolean } {
  const { date, auto } = dateFraisAffichee(p.id, p.fees.cost?.date ?? p.fees.verified?.date);
  return { verifiedDate: date, verifiedAuto: auto };
}

/** Lignes du comparateur : plateformes autorisées en France, hors portefeuilles matériels. */
export function buildRows(platforms: Platform[], notice: (id: string) => string): Row[] {
  return platforms
    .filter((p) => p.category !== "wallet" && isAvailableFr(p))
    .map((p) => {
      const { simple, card, path, note } = costsOf(p);
      const auth = p.mica.authority ?? "";
      const country = auth.includes(",") ? auth.split(",").pop()!.trim() : /Irlande/.test(auth) ? "Irlande" : /AMF/.test(auth) ? "France" : auth;
      return {
        id: p.id,
        name: p.name,
        authority: auth,
        country,
        french: /\bAMF\b/.test(auth) || /AMF/.test(p.mica.status),
        supportFr: frenchHelpLabel(p.support),
        supportFrRank: frenchHelpRank(p.support),
        score: p.scoring.global,
        ux: p.scoring.ux,
        simple,
        card,
        path,
        note,
        ...verifiee(p),
        source: p.fees.cost?.source ?? p.fees.verified?.source ?? null,
        affiliateUrl: p.affiliateUrl,
        affiliationNotice: notice(p.id),
      };
    });
}

/**
 * Coût affiché pour une ligne : après virement, ou par carte pour l'objectif « carte ».
 * null : pas d'achat par carte ; fee null : la plateforme ne publie pas ce coût.
 */
export function rowCost(r: Row, amount: Amount, goal: Goal): { fee: number | null; kind: CostKind } | null {
  const c = goal === "carte" ? r.card : r.simple;
  if (!c) return null;
  return { fee: amount === 100 ? c.c100 : c.c1000, kind: c.kind };
}

/** groupe de classement : 0 coût publié (exact ou au plus), 1 marge non publiée en plus, 2 coût non publié, 3 pas de carte */
const group = (c: { fee: number | null; kind: CostKind } | null) => (!c ? 3 : c.fee == null ? 2 : c.kind === "partiel" || c.kind === "max-partiel" ? 1 : 0);

/**
 * Tri et filtre selon l'objectif :
 *  - prix : coûts publiés d'abord, puis coûts avec marge non publiée, puis coûts non publiés ; dans chaque groupe, du moins cher au plus cher ;
 *  - carte : même règle sur le coût par carte, sans les plateformes qui n'acceptent pas la carte ;
 *  - debutant : support en français d'abord, puis simplicité (note UX), puis coût ;
 *  - francais : plateformes agréées par l'AMF, triées par coût.
 */
export function sortRows(rows: Row[], amount: Amount, goal: Goal): Row[] {
  const list = rows.filter((r) => (goal === "carte" ? !!r.card : goal === "francais" ? r.french : true));
  const cost = (r: Row) => rowCost(r, amount, goal === "carte" ? "carte" : "prix");
  const byCost = (a: Row, b: Row) => {
    const ca = cost(a), cb = cost(b);
    const ga = group(ca), gb = group(cb);
    if (ga !== gb) return ga - gb;
    return (ca?.fee ?? 0) - (cb?.fee ?? 0) || b.score - a.score;
  };
  if (goal === "debutant") {
    return [...list].sort((a, b) => b.supportFrRank - a.supportFrRank || b.ux - a.ux || byCost(a, b));
  }
  return [...list].sort(byCost);
}

/** « 1,49 € » / « 14,90 € » */
export const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/** Libellé d'un coût : « 2,50 € » ; « au plus 2,50 € » ; « 1,00 € + marge non publiée » ; « Non publié ». */
export function costLabel(c: { fee: number | null; kind: CostKind }): { main: string; prefix: string | null; suffix: string | null } {
  if (c.fee == null) return { main: "Non publié", prefix: null, suffix: null };
  return { main: euros(c.fee), prefix: c.kind === "max" || c.kind === "max-partiel" ? "au plus" : null, suffix: c.kind === "partiel" || c.kind === "max-partiel" ? "+ marge non publiée" : null };
}
