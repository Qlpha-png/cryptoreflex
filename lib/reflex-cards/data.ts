/**
 * Reflex Cards — accès aux données du jeu (data/reflex-cards.json, généré par
 * Reflex-Cards/src/export-site.mjs depuis la maquette v8). Côté serveur uniquement :
 * le JSON pèse ~760 Ko et contient les raretés et dates de sortie des cartes pas encore sorties ;
 * il ne doit jamais partir dans un bundle client (« server-only » casse le build si c'est le cas).
 */
import "server-only";
import raw from "@/data/reflex-cards.json";
import { getAllCryptos } from "@/lib/cryptos";
import type { Rarity, ReflexCard, ReflexCardsData, ReflexRarityInfo } from "./types";
import { pct, type CardEnv } from "./render";

const DATA = raw as unknown as ReflexCardsData;
const BY_ID = new Map(DATA.cartes.map((c) => [c.id, c]));

export const REFLEX_META = DATA.meta;
export const REFLEX_PARTS = DATA.parties;
export const REFLEX_RARITIES: ReflexRarityInfo[] = DATA.raretes;
export const CARD_ENV: CardEnv & { back: string } = { ncards: DATA.meta.ncards, emb: DATA.emb, back: DATA.back };
export const FOSSIL_P = DATA.fossilP;

export { isReflexCardsEnabled } from "./flag";
export { seasonDay, isLaunched, launchDate } from "./season";

/** rang en toutes lettres : « 1er », « 2e », « 590e » */
export const ordinal = (n: number): string => (n === 1 ? "1er" : `${n}e`);

/* ---------- sorties et révélations (règle de la maquette, validée par Kev le 02/10) ----------
   - pas encore sortie : rien ne fuite (page « à venir » neutre, tête d'affiche anonyme, ni rareté ni numéro ni date) ;
   - sortie mais pas obtenue : la case vide de l'album (numéro, logo grisé, nom, rareté, chance) ;
   - obtenue (phase B, comptes) ou révélée officiellement : la carte entière. */
const J1 = (c: ReflexCard) => !c.fossil && c.sortie?.jour === 1;
const j1ByRarity = (r: Rarity) => DATA.cartes.filter((c) => J1(c) && c.r === r).sort((a, b) => a.noto - b.noto);
/* vitrine (choix éditorial) : des projets qui apprennent quelque chose — ni stablecoin, ni memecoin,
   ni projet politique (famille Trump, etc.), quelle que soit leur notoriété */
const POLITIQUE = new Set(["world-liberty-financial", "official-trump", "melania-meme", "hunter-biden-s-laptop-3", "maga", "usd1-wlfi"]);
const vitrine = (c: ReflexCard) => c.fam !== "Stablecoin" && c.fam !== "Memecoin" && !POLITIQUE.has(c.id);
/* de préférence une carte avec son accroche rédigée (« Le saviez-vous ? ») */
const pick = (r: Rarity, ok: (c: ReflexCard) => boolean) => {
  const l = j1ByRarity(r);
  return l.find((c) => ok(c) && !!c.tag) ?? l.find(ok) ?? l[0];
};
/** éventail du héros de /cartes : Ultra rare, Légendaire, Super rare du jour 1 */
export const HERO_CARDS: ReflexCard[] = (["UR", "L", "SR"] as Rarity[]).map((r) => pick(r, vitrine));
/** une carte du jour 1 par rareté, pour montrer les six matières (différente du héros) */
export const SHOWCASE_CARDS: ReflexCard[] = (["C", "PC", "R", "SR", "UR", "L"] as Rarity[]).map((r) =>
  pick(r, (c) => vitrine(c) && !HERO_CARDS.includes(c)),
);
/** révélations officielles avant le lancement : têtes d'affiche du jour 1 + héros + vitrine des raretés */
const REVEALED = new Set([...(DATA.parties[0]?.tete ?? []), ...HERO_CARDS.map((c) => c.id), ...SHOWCASE_CARDS.map((c) => c.id)]);

export const isReleased = (c: ReflexCard, day: number): boolean => (c.fossil ? day >= 1 : !!c.sortie && day >= 1 && c.sortie.jour <= day);
/** carte entière visible par tous (révélation officielle) */
export const isRevealed = (c: ReflexCard): boolean => REVEALED.has(c.id);
/** a une page publique : sortie, révélée, ou fossile (l'histoire du Musée est publique, la carte reste à trouver) */
export const isVisible = (c: ReflexCard, day: number): boolean => isReleased(c, day) || isRevealed(c) || c.fossil;
/** une tête d'affiche se nomme dès que sa partie est sortie (le jour 1 est révélé d'avance) */
export const isPartNamed = (jour: number, day: number): boolean => jour === 1 || jour <= day;

/**
 * chance qu'une carte tirée soit CELLE-CI ce jour-là (avant le lancement : au jour 1) :
 * elle baisse à mesure que d'autres cartes de même rareté sortent. Fossile : taux fixe partagé.
 */
export function todayChance(c: ReflexCard, day: number): number {
  if (c.fossil) return DATA.fossilP / DATA.meta.fossiles;
  const d = Math.max(day, 1);
  const n = DATA.cartes.filter((x) => !x.fossil && x.r === c.r && isReleased(x, d)).length || 1;
  return rarityInfo(c.r).chance / n;
}
/** texte de chance de la case vide (« 0,0018 % par carte »), comme la maquette */
export const slotOdd = (c: ReflexCard, day: number): string => `${pct(todayChance(c, day), 4)} par carte`;

export const getCard = (id: string): ReflexCard | undefined => BY_ID.get(id);
export const allCards = (): ReflexCard[] => DATA.cartes;
/** cartes de l'album (hors Musée des Fossiles), dans l'ordre de l'album */
export const albumCards = (): ReflexCard[] => DATA.cartes.filter((c) => !c.fossil).sort((a, b) => Number(a.num) - Number(b.num));
export const fossilCards = (): ReflexCard[] => DATA.cartes.filter((c) => c.fossil);
export const rarityInfo = (r: Rarity): ReflexRarityInfo => DATA.raretes.find((x) => x.r === r) as ReflexRarityInfo;

/** chapitres de l'album : une famille par chapitre, dans l'ordre des numéros */
export function chapters(): { fam: string; color: string; cards: ReflexCard[] }[] {
  const out: { fam: string; color: string; cards: ReflexCard[] }[] = [];
  for (const c of albumCards()) {
    let ch = out.find((x) => x.fam === c.fam);
    if (!ch) out.push((ch = { fam: c.fam, color: c.famColor, cards: [] }));
    ch.cards.push(c);
  }
  return out;
}

/* fiches éditoriales : leur slug peut différer de l'id CoinGecko (xrp / ripple, io-net / io) */
let EDITO: Map<string, string> | null = null;
function editorialSlugs(): Map<string, string> {
  if (!EDITO) EDITO = new Map(getAllCryptos().map((c) => [c.coingeckoId, c.id]));
  return EDITO;
}

/** lien vers la fiche crypto du site (fiche rédigée en priorité, sinon fiche d'analyse), null si aucune */
export function ficheHref(c: ReflexCard): string | null {
  const ed = editorialSlugs().get(c.id);
  if (ed) return `/cryptos/${ed}`;
  return c.slug ? `/cryptos/${c.slug}` : null;
}

/** nom lisible hors carte (CoinGecko glisse parfois des espaces invisibles : « \u200b\u200bStable ») */
export const cleanName = (s: string) => s.replace(/[\u200b-\u200d\u2060\ufeff]/g, "").trim();

/**
 * Page carte indexable seulement si elle apporte du contenu : une vraie description
 * ET une fiche crypto à relier (sinon page mince → noindex, follow ; hors sitemap).
 */
export function isIndexable(c: ReflexCard): boolean {
  return c.fossil || (!!ficheHref(c) && c.desc.length >= 80);
}

/** part des cartes tirées : « 70,1 % des cartes tirées » au-dessus de 1 %, sinon « 1 carte sur 3 000 tirée » */
export function shareText(p: number): string {
  return p >= 0.01 ? `${(p * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % des cartes tirées` : `${oddsText(p)} tirée`;
}

/** « 1 carte sur 57 000 » (arrondi lisible), pour le texte des pages */
export function oddsText(p: number): string {
  const x = 1 / p;
  const r = x < 100 ? Math.round(x) : x < 10_000 ? Math.round(x / 10) * 10 : x < 1_000_000 ? Math.round(x / 1000) * 1000 : Math.round(x / 100_000) * 100_000;
  return "1 carte sur " + r.toLocaleString("fr-FR").replace(/\u202f/g, "\u00a0");
}
