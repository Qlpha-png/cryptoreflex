/**
 * lib/partnerships.ts — Source de VÉRITÉ UNIQUE des relations commerciales de
 * Cryptoreflex avec les plateformes.
 *
 * Extrait de app/transparence/page.tsx le 2026-05-31 (audit F) pour être
 * réutilisable par AffiliateLink / PlatformCard : on ne doit afficher
 * rel="sponsored" + la mention « Publicité / lien rémunéré » QUE sur les
 * plateformes réellement rémunérées — pas sur toutes (Kev : « je ne suis pas
 * affilié à tous, loin de là »).
 *
 * 2 types de relation rémunérée :
 *   - "affiliate" : vrai contrat commercial éditeur (commission tracée via
 *     Impact.com / Cellxpert / programme maison).
 *   - "referral"  : code de parrainage PERSONNEL de Kevin Voisin (le rémunère
 *     LUI en tant que client, pas l'éditeur) — listé par souci de transparence
 *     loi Influenceurs n°2023-451.
 *
 * Toute plateforme ABSENTE de PARTNERSHIPS (ou en "review") = AUCUN lien
 * rémunéré → pas de rel="sponsored", pas de mention « Publicité/commission ».
 * Prétendre une affiliation inexistante serait tout aussi trompeur que d'en
 * cacher une réelle (DGCCRF, pratiques commerciales trompeuses L.121-1).
 */

export type PartnershipStatus = "live" | "review";
export type PartnershipKind = "affiliate" | "referral";

export interface PartnershipMeta {
  revenue: string;
  since: string;
  status: PartnershipStatus;
  /** Type juridique : programme d'affiliation commercial OU code parrainage personnel. */
  kind: PartnershipKind;
}

export const PARTNERSHIPS: Record<string, PartnershipMeta> = {
  // === 3 VRAIS PROGRAMMES D'AFFILIATION (contrats commerciaux éditeur) ===
  ledger: {
    revenue: "10 % commission sur hardware (Nano S+, Nano X, Stax) via Impact.com",
    since: "2026-04-26",
    status: "live",
    kind: "affiliate",
  },
  trezor: {
    revenue: "12-15 % commission sur hardware (Safe 3, Safe 5, Model T) via Cellxpert",
    since: "2026-04-26",
    status: "live",
    kind: "affiliate",
  },
  waltio: {
    revenue: "Commission sur souscription au logiciel de fiscalité crypto",
    since: "2026-04-26",
    status: "live",
    kind: "affiliate",
  },

  // === CODES DE PARRAINAGE PERSONNELS (rémunèrent Kevin Voisin, pas l'éditeur) ===
  bitpanda: {
    revenue:
      "Code parrainage personnel — programme Tell-a-Friend de Bitpanda (prime fixée par les conditions du programme)",
    since: "2026-04-25",
    status: "live",
    kind: "referral",
  },
  "trade-republic": {
    revenue:
      "Code parrainage personnel — programme de parrainage de Trade Republic, dans l'application (prime fixée par les conditions du programme)",
    since: "2026-04-25",
    status: "live",
    kind: "referral",
  },
  // Audit 2026-10-02 : code parrainage Binance retiré — Binance a cessé ses
  // services sur crypto-actifs en France le 1er juillet 2026 (absente du
  // registre MiCA de l'ESMA). Aucun lien rémunéré vers une plateforme non
  // autorisée en France.
};

/**
 * Relation rémunérée ACTIVE pour une plateforme (par son id kebab-case), ou
 * null si aucune (ou en "review", pas encore live → on ne revendique rien).
 *
 * C'est le seul point de décision pour : rel="sponsored", mention « Publicité »,
 * et le wording (commission éditeur vs parrainage perso).
 */
export function getAffiliationKind(platformId: string): PartnershipKind | null {
  const p = PARTNERSHIPS[platformId];
  return p && p.status === "live" ? p.kind : null;
}

/*
 * 06/10/2026 — helpers partagés par TOUS les liens sortants vers une plateforme (avis, comparatifs, fiches crypto,
 * quiz, outils, MDX) : la page /avis/kraken affichait « Publicité — Cryptoreflex perçoit une commission » alors que
 * Kraken n'est pas partenaire. Un lien n'est rémunéré que si la plateforme est listée ci-dessus (status live) ET que
 * le lien sort du site (un lien interne, ex. /comparatif/frais pour une plateforme non autorisée, ne rapporte rien).
 * Ces helpers remplacent affiliationNotice() (wording « Lien direct : aucune commission » retiré, plus utilisé).
 */

/** Vrai si le lien vers cette plateforme est réellement rémunéré (relation live + lien externe). */
export function isPaidLink(platformId: string, href?: string): boolean {
  if (getAffiliationKind(platformId) === null) return false;
  return href === undefined || /^https?:\/\//i.test(href);
}

/** rel d'un lien sortant ouvert dans un nouvel onglet : « sponsored » uniquement si le lien est rémunéré. */
export function outboundRel(platformId: string, href?: string): string {
  return isPaidLink(platformId, href) ? "sponsored nofollow noopener" : "nofollow noopener noreferrer";
}

/** Mention « Publicité » à afficher sous un lien rémunéré (bon type : affiliation ou parrainage), null sinon. */
export function paidLinkCaption(platformId: string, href?: string): string | null {
  if (!isPaidLink(platformId, href)) return null;
  return getAffiliationKind(platformId) === "affiliate"
    ? "Publicité — Cryptoreflex perçoit une commission"
    : "Publicité — lien de parrainage personnel";
}

/*
 * Lot B4 (10/10/2026) — lignes « Rémunération » de l'encadré de confiance (components/ui/TrustBox.tsx).
 * Formulations EXACTES de la spec C+ (bloc 00-R2) ; le type de relation vient de PARTNERSHIPS (getAffiliationKind),
 * jamais d'une liste recopiée. Aucune promesse d'absence de surcoût n'y figure (non vérifiée).
 *  - commission : Ledger, Trezor, Waltio ;
 *  - parrainage : Bitpanda, Trade Republic (code de Kevin Voisin, fondateur) ;
 *  - aucun lien rémunéré dans la page : constat simple.
 */
export const REMUNERATION: Record<PartnershipKind | "aucune", string> = {
  affiliate:
    "Publicité — Cryptoreflex perçoit une commission si vous achetez ou vous abonnez par ce lien. Cela ne change ni l’ordre ni la note.",
  referral:
    "Publicité — lien de parrainage personnel : Kevin Voisin, fondateur, peut toucher une prime si vous ouvrez un compte par ce lien. Cela ne change ni l’ordre ni la note.",
  aucune: "Aucun lien publicitaire dans cet article.",
};

/** Lignes de rémunération à afficher pour les types de relation trouvés dans une page (une ligne par type, ordre stable). */
export function lignesRemuneration(types: Iterable<PartnershipKind>, aucune: string = REMUNERATION.aucune): string[] {
  const set = new Set(types);
  const out: string[] = [];
  if (set.has("affiliate")) out.push(REMUNERATION.affiliate);
  if (set.has("referral")) out.push(REMUNERATION.referral);
  return out.length ? out : [aucune];
}
