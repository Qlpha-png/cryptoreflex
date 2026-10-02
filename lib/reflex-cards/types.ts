/** Reflex Cards — types des données exportées par Reflex-Cards/src/export-site.mjs (data/reflex-cards.json). */
export type Rarity = "C" | "PC" | "R" | "SR" | "UR" | "L";

export interface ReflexCard {
  /** identifiant CoinGecko (= id de la carte) */
  id: string;
  name: string;
  sym: string;
  /** chemin d'image CoinGecko (« 1/bitcoin.png ») */
  img: string;
  fam: string;
  famColor: string;
  sub: string;
  /** année de lancement, 0 si inconnue */
  year: number;
  r: Rarity;
  /** rang de notoriété durable (1 = la plus connue), 0 pour un fossile */
  noto: number;
  /** grande note 40-99 (indice de notoriété, jamais le prix) */
  ovr: number;
  /** n° d'album (1…881) ou « F1 » pour un fossile */
  num: number | string;
  fossil: boolean;
  /** Légendaire au titre de n° 1 de sa catégorie */
  legende: boolean;
  /** Légendaire / Ultra rare au titre du classement général */
  merite: boolean;
  /** score Cryptoreflex sur 100 si la fiche en a un */
  score: number | null;
  /** slug de la fiche /cryptos/<slug> du site, vide si pas de fiche */
  slug: string;
  desc: string;
  tag: string;
  sortie: { jour: number; collection: string; partie: number; tete: boolean; fabrication: number } | null;
  fossile: { titre: string; evenement: string; lecon: string; critere: string; source: string; article: string } | null;
  /** mesures faites dans la maquette avec les vraies polices */
  nm: { size: number; two: boolean; html: string };
  /** nom ajusté pour la case vide de l'album (police et largeur différentes) */
  ph: { size: number; two: boolean; html: string };
  subSize: number;
  /** fait affiché sur la carte (HTML déjà échappé) */
  ab: string;
  /** chance qu'une carte tirée soit celle-ci, sur la saison complète (« 1/57 k ») */
  chance: string;
  chanceP: number;
}

export interface ReflexRarityInfo {
  r: Rarity;
  nom: string;
  couleur: string;
  pips: string;
  /** nombre de cartes de cette rareté */
  n: number;
  /** chance qu'une carte tirée soit de cette rareté */
  chance: number;
}

export interface ReflexPart {
  jour: number;
  collection: string;
  partie: number;
  taille: number;
  tete: string[];
}

export interface ReflexCardsData {
  meta: { genere: string; source: string; saison: string; ncards: number; fossiles: number; provisoire: boolean; couvertureCoinGecko: number };
  raretes: ReflexRarityInfo[];
  parties: ReflexPart[];
  emb: string;
  /** dos de carte (SVG), identifiants à rendre uniques : {U} */
  back: string;
  /** chance de tirer un Fossile (toutes cartes confondues) */
  fossilP: number;
  cartes: ReflexCard[];
}
