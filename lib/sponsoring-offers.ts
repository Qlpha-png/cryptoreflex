/**
 * Offres de sponsoring publiques — source UNIQUE pour la page /sponsoring et son formulaire (06/10/2026).
 *
 * Avant : le formulaire proposait « Article sponsorisé (1 500 €) » quand la page affichait 800 €, un « Sponsor
 * newsletter (300 €) » alors qu'aucune édition de newsletter n'est envoyée, et un pack / un « display » jamais
 * présentés sur la page. Aucune offre newsletter n'est vendue tant que des envois réguliers n'existent pas.
 */
export interface SponsoringOffer {
  id: "article" | "comparateur";
  name: string;
  price: string;
  priceUnit: string;
}

export const SPONSORING_OFFERS: readonly SponsoringOffer[] = [
  { id: "article", name: "Article sponsorisé", price: "800 €", priceUnit: "/ article" },
  { id: "comparateur", name: "Encart sponsorisé comparateur", price: "1 500 €", priceUnit: "/ mois" },
];

/** Libellé d'une offre dans le formulaire, ex. « Article sponsorisé — 800 € / article ». */
export function sponsoringOfferLabel(o: SponsoringOffer): string {
  return `${o.name} — ${o.price} ${o.priceUnit}`;
}

export function getSponsoringOffer(id: SponsoringOffer["id"]): SponsoringOffer {
  const o = SPONSORING_OFFERS.find((x) => x.id === id);
  if (!o) throw new Error(`Offre de sponsoring inconnue : ${id}`);
  return o;
}
