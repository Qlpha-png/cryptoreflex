/**
 * Reflex Cards — la « forme la plus rare » de chaque carte du jeu d'origine (Kev 04/10 : « sur les fiches crypto qui ont leur
 * carte, je veux qu'on puisse la voir dans sa forme la plus rare, je ne veux plus cacher pour attirer les gens »).
 * Images photographiées avec le moteur du jeu lui-même (Reflex-Cards/src/rare-cards.mjs) : public/cartes/rare/<id>.webp.
 * Mythique > Icône > Onyx 1/1. Aucun numéro de découverte inventé sur ces images.
 */
import "server-only";
import raw from "@/data/reflex-cards-rare.json";

export type RareForm = "myth" | "icon" | "onyx";
export interface RareCard { src: string; form: RareForm; label: string; phrase: string; w: number; h: number }

const DATA = raw as unknown as { cartes: Record<string, { f: RareForm; t: string; r: string; w: number; h: number }> };

const PHRASE: Record<RareForm, string> = {
  myth: "une carte sur un million, numérotée dans l'ordre de découverte",
  icon: "une Icône : 40 cartes en tout, plus rares qu'une Légendaire",
  onyx: "l'unique exemplaire de la saison, numéroté 1/1",
};

/** la forme la plus rare d'une carte, si son image existe */
export function rareCard(id: string): RareCard | null {
  const e = DATA.cartes[id];
  if (!e) return null;
  return { src: `/cartes/rare/${id}.webp`, form: e.f, label: e.t, phrase: PHRASE[e.f], w: e.w, h: e.h };
}
