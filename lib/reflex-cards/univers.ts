/**
 * Reflex Cards — « Univers » (chantier du 04/10/2026, décision Kev : « tout ce qui a un rapport avec la crypto de près ou de loin,
 * autant de cartes que WikiMasters, à toi de trancher la rareté, Icônes / Mythiques / Reliques par catégorie »).
 *
 * Source : data/reflex-cards-univers.json, exporté par Reflex-Cards/src/univers/export-site.mjs depuis le catalogue
 * (CoinGecko, DefiLlama, Wikipédia/Wikidata, chronologie maison, relecture carte par carte). 27 744 cartes en 8 catégories.
 *
 * Interrupteur : REFLEX_CARDS_UNIVERS=true (serveur). Absent → le jeu actuel (881 cartes, data/reflex-cards-rules.json) est inchangé.
 * Les cryptos gardent leur identifiant CoinGecko : les collections existantes restent valables telles quelles ; une carte déjà en jeu
 * ne descend jamais de rareté (Légendaires à vie : le plancher est appliqué à l'export).
 *
 * Règle de tirage WikiMasters : TOUTES les cartes ont la même chance (drapeau `equi` lu par engine.ts) ; la rareté d'une carte est
 * sa place dans sa catégorie. Les garanties (Rare au 6e booster, 1re Super rare, filets invisibles) sont conservées.
 */
import "server-only";
import raw from "@/data/reflex-cards-univers.json";
import descRaw from "@/data/reflex-cards-univers-desc.json";

export type Cat = "crypto" | "protocole" | "plateforme" | "nft" | "personne" | "evenement" | "entreprise" | "concept";
export const CATS: Cat[] = ["crypto", "protocole", "plateforme", "nft", "personne", "evenement", "entreprise", "concept"];
/** libellé de catégorie = « famille » du moteur (boosters thématiques, collections, album) */
export const CAT_LABEL: Record<Cat, string> = { crypto: "Cryptos", protocole: "Protocoles", plateforme: "Plateformes", nft: "NFT", personne: "Personnes", evenement: "Événements", entreprise: "Entreprises", concept: "Concepts" };
export const LABEL_CAT: Record<string, Cat> = Object.fromEntries(CATS.map((c) => [CAT_LABEL[c], c])) as Record<string, Cat>;

/** [id, nom, symbole, catégorie, sous-type, rareté, rang dans la catégorie, image compactée, famille crypto héritée] */
type Row = [string, string, string, Cat, string, "C" | "PC" | "R" | "SR" | "UR" | "L", number, string, string];
interface Raw {
  meta: { genere: string; total: number; prefixes: Record<string, string>; plancherRarete: number };
  stats: Record<Cat, Record<string, number>>;
  editions: Record<string, { reliques: string[]; mythiques: string[]; icones: string[] }>;
  cards: Row[];
}
const RAW = raw as unknown as Raw;

export const UNIVERS_ON = (): boolean => process.env.REFLEX_CARDS_UNIVERS?.trim() === "true";

export interface UCard {
  id: string; nom: string; sym: string; cat: Cat; sous: string; r: Row[5]; rank: number;
  /** URL complète de l'image (null = emblème de catégorie) */
  img: string | null;
  /** famille crypto héritée du jeu actuel (« Layer 1 », « DeFi »…), vide sinon */
  fam: string;
}
const PREFIXES: Record<string, string> = RAW.meta.prefixes;
/** déplie une image compactée (préfixe à une lettre, voir export-site.mjs) */
export const unpackImg = (p: string): string | null => (p ? (PREFIXES[p[0]] ?? "") + p.slice(1) || null : null);

let ALL: UCard[] | null = null, BY_ID: Map<string, UCard> | null = null;
export function universCards(): UCard[] {
  if (!ALL) ALL = RAW.cards.map(([id, nom, sym, cat, sous, r, rank, img, fam]) => ({ id, nom, sym, cat, sous, r, rank, img: unpackImg(img), fam }));
  return ALL;
}
export function universById(id: string): UCard | undefined {
  if (!BY_ID) BY_ID = new Map(universCards().map((c) => [c.id, c]));
  return BY_ID.get(id);
}
export const universStats = () => RAW.stats;
export const universEditions = () => RAW.editions;
export const universMeta = () => RAW.meta;

/* descriptions, dates et sources (fichier séparé, chargé une fois côté serveur) */
interface DescEntry { d: string; t: string; l: string; u: string; s: string }
const DESC = (descRaw as unknown as { desc: Record<string, DescEntry> }).desc;
export const universDesc = (id: string): DescEntry | undefined => DESC[id];
/** phrase courte pour la carte (« en bref ») : première phrase, au plus 220 caractères */
export function universBlurb(id: string): string {
  const d = DESC[id]?.d ?? "";
  if (!d) return "";
  const first = d.match(/^.{20,}?[.!?](\s|$)/)?.[0]?.trim() ?? d;
  return first.length > 220 ? first.slice(0, 217).replace(/\s+\S*$/, "") + "…" : first;
}
/** année d'un événement (date AAAA-MM-JJ), 0 sinon */
export const universYear = (id: string): number => { const t = DESC[id]?.t ?? ""; return /^\d{4}/.test(t) ? Number(t.slice(0, 4)) : 0; };

/** ligne envoyée au navigateur : [id, nom, symbole, catégorie, sous-type, rareté, rang, image, famille, en bref, année] (jamais la popularité brute) */
export type ClientRow = [string, string, string, Cat, string, string, number, string, string, string, number];
export const toClientRow = (c: UCard): ClientRow => [c.id, c.nom, c.sym, c.cat, c.sous, c.r, c.rank, c.img ?? "", c.fam, universBlurb(c.id), universYear(c.id)];

/* ---------- recherche (album : « Chercher une carte ») ---------- */
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
let INDEX: { c: UCard; k: string }[] | null = null;
/** recherche par nom ou symbole, insensible aux accents ; les plus connues d'abord ; au plus `limit` résultats */
export function searchUnivers(q: string, cat: Cat | null, limit = 30): UCard[] {
  const needle = fold(q.trim());
  if (needle.length < 2) return [];
  if (!INDEX) INDEX = universCards().map((c) => ({ c, k: fold(`${c.nom} ${c.sym}`) }));
  /* 3 niveaux : le nom commence par la saisie, un mot commence par la saisie, la saisie est à l'intérieur ; dans un niveau, les
     plus connues d'abord (rang dans leur catégorie), puis l'ordre des catégories */
  const hits: { c: UCard; t: number }[] = [];
  for (const { c, k } of INDEX) {
    if (cat && c.cat !== cat) continue;
    const i = k.indexOf(needle);
    if (i < 0) continue;
    hits.push({ c, t: i === 0 ? 0 : k[i - 1] === " " ? 1 : 2 });
  }
  hits.sort((a, b) => a.t - b.t || a.c.rank - b.c.rank || CATS.indexOf(a.c.cat) - CATS.indexOf(b.c.cat));
  return hits.slice(0, limit).map((h) => h.c);
}

/* ---------- règles du moteur ---------- */
type Rar = "C" | "PC" | "R" | "SR" | "UR" | "L";
interface RCardLike { id: string; r: Rar; fam: string; noto: number; num: number | string; part: number | null; legende?: 1; fossil?: 1; year?: number }
/** le sous-ensemble des règles que l'Univers remplace (le reste — économie, missions, objets… — est repris tel quel) */
export interface UniversRulesPatch {
  cards: RCardLike[];
  parts: { jour: number; collection: string; partie: number }[];
  pages: string[][];
  families: string[];
  ed: Record<string, { p: number; list: string[] }>;
  relics: string[];
  quests: { id: string; goal: number; card?: string }[];
  themes: { id: string; rew: number; fams?: boolean; cards?: string[] }[];
  /** tirage équiprobable sur tout le pool (WikiMasters) */
  equi: true;
  totyFromDay: number;
}
/**
 * Construit les règles Univers à partir des règles actuelles : mêmes éditions crypto (Mythiques, Icônes, Équipe, Bloc, Fossiles,
 * Trophées) complétées par les éditions de chaque catégorie ; taux PAR CARTE inchangés (une liste plus longue → une probabilité
 * d'édition plus grande, carte par carte rien ne bouge) ; Reliques = les 3 Reliques historiques + 3 par catégorie.
 */
export function universRules(base: { cards: RCardLike[]; ed: Record<string, { p: number; list: string[] }>; relics: string[]; relicP: number; themes: UniversRulesPatch["themes"]; totyFromDay: number }): UniversRulesPatch {
  const fossils = base.cards.filter((c) => c.fossil);
  const cards: RCardLike[] = universCards().map((c) => ({ id: c.id, r: c.r, fam: CAT_LABEL[c.cat], noto: c.rank, num: c.rank, part: 0, ...(c.r === "L" ? { legende: 1 as const } : {}) }));
  /* les 2 Fossiles du Musée restent (ils ne sont pas dans le catalogue : projets morts) */
  for (const f of fossils) if (!universById(f.id)) cards.push({ ...f });
  /* pages de l'album : 9 cartes par page, par catégorie et par rang (« compléter une page » reste un défi atteignable en tête de catégorie) */
  const pages: string[][] = [];
  for (const cat of CATS) {
    const ids = universCards().filter((c) => c.cat === cat).sort((a, b) => a.rank - b.rank).map((c) => c.id);
    for (let i = 0; i < ids.length; i += 9) pages.push(ids.slice(i, i + 9));
  }
  const E = universEditions();
  const perCard = (k: string) => (base.ed[k]?.list.length ? base.ed[k].p / base.ed[k].list.length : 0);
  const extra = (slot: "reliques" | "mythiques" | "icones") => Object.values(E).flatMap((e) => e[slot]).filter((id) => !!universById(id));
  const uniq = (l: string[]) => [...new Set(l)];
  const ed: UniversRulesPatch["ed"] = { ...base.ed };
  const mythList = uniq([...base.ed.myth.list, ...extra("mythiques")]);
  ed.myth = { p: perCard("myth") * mythList.length, list: mythList };
  const iconList = uniq([...base.ed.icon.list, ...extra("icones")]);
  ed.icon = { p: perCard("icon") * iconList.length, list: iconList };
  const relics = uniq([...base.relics, ...extra("reliques")]);
  /* défis Univers : mêmes mécaniques (boosters, page, doublons, quiz, fiches, semaine), nouveaux objectifs transversaux */
  const quests: UniversRulesPatch["quests"] = [
    { id: "q-open", goal: 3 }, { id: "q-page", goal: 1 }, { id: "q-tour", goal: 8 }, { id: "q-swap", goal: 15 },
    { id: "q-perso", goal: 3 }, { id: "q-event", goal: 3 }, { id: "q-quiz", goal: 10 }, { id: "q-read", goal: 3, card: "aave" }, { id: "q-week", goal: 7 },
  ];
  return {
    cards, parts: [{ jour: 1, collection: "Univers", partie: 1 }], pages, families: CATS.map((c) => CAT_LABEL[c]), ed, relics, quests,
    themes: base.themes, equi: true, totyFromDay: base.totyFromDay,
  };
}
