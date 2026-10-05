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
 * La rareté d'une carte est sa place dans sa catégorie. Tirage : d'abord la rareté (UNIV_W), puis la catégorie (UNIV_CAT_W, 05/10), puis une carte au hasard parmi celles de
 * cette rareté (de la catégorie, pour un booster thématique). Les garanties (Rare au 6e booster, 1re Super rare, filets invisibles)
 * sont conservées.
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
/** note de la carte (40-99), même formule que le jeu (ovrOf) : rang dans la catégorie / total de la catégorie */
export const universOvr = (rank: number, total: number): number => Math.round(40 + 59 * Math.pow(Math.max(0, 1 - (rank - 1) / Math.max(1, total - 1)), 2.2));

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
/* textes source restés en anglais (descriptions DefiLlama, CoinGecko) : jamais affichés tels quels (Kev 04/10 : « tout en
   français ») ; à la place, une phrase française factuelle tirée des données de la carte (type de protocole, chaîne de la collection) */
const EN_RE = /\b(the|and|of|is|are|for|with|your|our|we|that|which|on|to|an|by|from|built|platform|protocol|decentralized|users|first|leading|allows|enables|its|it)\b/gi;
const FR_RE = /\b(le|la|les|des|du|une|un|est|sont|pour|avec|qui|sur|dans|et|de|en|au|aux|son|sa|ses)\b/gi;
/** texte probablement anglais (plus de mots-outils anglais que français, au moins deux) */
export function isEnglish(t: string): boolean {
  const en = (t.match(EN_RE) ?? []).length, fr = (t.match(FR_RE) ?? []).length;
  return en >= 2 && en > fr;
}
function frenchFallback(id: string): string {
  const c = universById(id);
  if (!c) return "";
  const s = sousFr(c);
  if (c.cat === "protocole") return `${c.nom} est un protocole de finance décentralisée${s ? ` de type « ${s} »` : ""}.`;
  if (c.cat === "plateforme") return `${c.nom} est une plateforme d'échange de cryptomonnaies.`;
  if (c.cat === "nft") return `${c.nom} est une collection NFT${s && s !== "Collection NFT" ? ` sur ${s}` : ""}.`;
  return "";
}
const FR_CACHE = new Map<string, DescEntry | undefined>();
/** description affichable (toujours en français) */
export const universDesc = (id: string): DescEntry | undefined => {
  if (FR_CACHE.has(id)) return FR_CACHE.get(id);
  const e = DESC[id];
  const out = e && e.d && isEnglish(e.d) ? { ...e, d: frenchFallback(id) } : e;
  FR_CACHE.set(id, out);
  return out;
};
/** phrase courte pour la carte (« en bref ») : première phrase, au plus 220 caractères */
export function universBlurb(id: string): string {
  const d = universDesc(id)?.d ?? "";
  if (!d) return "";
  const first = d.match(/^.{20,}?[.!?](\s|$)/)?.[0]?.trim() ?? d;
  return first.length > 220 ? first.slice(0, 217).replace(/\s+\S*$/, "") + "…" : first;
}
/** page du site indexable : Super rare et mieux, avec un texte de présentation (les autres restent en noindex, hors sitemap) */
/* un texte source anglais remplacé par une phrase générée ne suffit pas pour une page indexée (page mince) */
export const universIndexable = (c: UCard): boolean => ["SR", "UR", "L"].includes(c.r) && !!DESC[c.id]?.d && !isEnglish(DESC[c.id]!.d);
/** année d'un événement (date AAAA-MM-JJ), 0 sinon */
export const universYear = (id: string): number => { const t = DESC[id]?.t ?? ""; return /^\d{4}/.test(t) ? Number(t.slice(0, 4)) : 0; };

/* sous-types lisibles en français (catégories DefiLlama, types de piratage, chaînes NFT, repères) : un seul endroit pour la page et l'API */
const SOUS_FR: Record<string, string> = {
  /* DefiLlama */
  Lending: "Prêt", Dexs: "Échange décentralisé", "Liquid Staking": "Staking liquide", Bridge: "Pont", CDP: "Stablecoin adossé (CDP)", Yield: "Rendement",
  Derivatives: "Dérivés", "Yield Aggregator": "Agrégateur de rendement", Restaking: "Restaking", "Liquid Restaking": "Restaking liquide", RWA: "Actifs réels (RWA)",
  "Basis Trading": "Arbitrage de base", "Prediction Market": "Marché de prédiction", "NFT Marketplace": "Place de marché NFT", Launchpad: "Launchpad", Farm: "Ferme de rendement",
  "Staking Pool": "Pool de staking", "Canonical Bridge": "Pont officiel", "Cross Chain Bridge": "Pont inter-chaînes", "Risk Curators": "Curateur de risque",
  "Onchain Capital Allocator": "Allocation de capital", Indexes: "Indice", Privacy: "Confidentialité", Payments: "Paiements", Insurance: "Assurance",
  "Leveraged Farming": "Rendement à levier", Options: "Options", "Options Vault": "Coffre d'options", Services: "Services", "Algo-Stables": "Stablecoin algorithmique",
  Synthetics: "Actifs synthétiques", Gaming: "Jeu", "Liquidity manager": "Gestion de liquidité", "Liquidity Manager": "Gestion de liquidité", CeDeFi: "CeDeFi",
  "Reserve Currency": "Monnaie de réserve", "Decentralized Stablecoin": "Stablecoin décentralisé", "Token Locker": "Verrouillage de jetons", Staking: "Staking",
  SoFi: "Finance sociale", "Uncollateralized Lending": "Prêt sans garantie", Oracle: "Oracle", "Stablecoin Issuer": "Émetteur de stablecoin", "Stablecoin Wrapper": "Stablecoin enveloppé",
  "Dual-Token Stablecoin": "Stablecoin à deux jetons", "Restaked BTC": "Bitcoin restaké", "Anchor BTC": "Bitcoin ancré", "Decentralized BTC": "Bitcoin décentralisé",
  "Governance Incentives": "Incitations de gouvernance", "NftFi": "Finance NFT", "NFT Lending": "Prêt sur NFT", "Yield Lottery": "Loterie de rendement", "Treasury Manager": "Gestion de trésorerie",
  "Collateral Markets": "Marchés de collatéral", "CDP Manager": "Gestion de CDP", "Decentralized AI": "IA décentralisée", "Wallets": "Portefeuille", "Telegram Bot": "Robot Telegram",
  "Exotic Options": "Options exotiques", "Managed Token Pools": "Pools gérés", "Volume Boosting": "Incitation au volume", "Bug Bounty": "Prime aux bogues", "Ponzi": "Ponzi",
  /* piratages DefiLlama */
  "Access Control": "Faille d'accès", Rugpull: "Rug pull", "Key Compromise": "Clé compromise", "Oracle Manipulation": "Manipulation d'oracle", Reentrancy: "Réentrance",
  "Bridge & Cross-Chain": "Pont piraté", "Frontend & Infrastructure": "Infrastructure piratée", "Social Engineering": "Ingénierie sociale", "Protocol Logic": "Logique du protocole",
  "Token & Share Accounting": "Comptabilité des jetons", "Price Manipulation": "Manipulation de prix", Governance: "Gouvernance", "Flash Loan": "Prêt éclair", "Other": "Piratage",
  "Smart Contract": "Contrat intelligent", "Infrastructure": "Infrastructure", pont: "Piratage de pont", piratage: "Piratage",
  /* repères et Wikipédia */
  "repère": "Repère historique", culture: "Culture", lieu: "Lieu", jeu: "Jeu",
  /* chaînes NFT (CoinGecko) */
  ethereum: "Ethereum", solana: "Solana", "binance-smart-chain": "BNB Chain", "polygon-pos": "Polygon", bitcoin: "Bitcoin (Ordinals)", base: "Base", arbitrum: "Arbitrum",
  "arbitrum-one": "Arbitrum", avalanche: "Avalanche", optimism: "Optimism", "optimistic-ethereum": "Optimism", hyperevm: "HyperEVM", abstract: "Abstract", ronin: "Ronin",
  "immutable-x": "Immutable", "zksync": "zkSync", linea: "Linea", blast: "Blast", sui: "Sui", aptos: "Aptos", ton: "TON", "the-open-network": "TON", cronos: "Cronos",
  klaytn: "Kaia", "klay-token": "Kaia", fantom: "Fantom", gnosis: "Gnosis", xdai: "Gnosis", celo: "Celo", tezos: "Tezos", flow: "Flow", near: "NEAR", "near-protocol": "NEAR",
  cardano: "Cardano", "mantle": "Mantle", scroll: "Scroll", "zora-network": "Zora", "berachain": "Berachain", sei: "Sei", "sei-network": "Sei", apechain: "ApeChain",
  "shape": "Shape", "soneium": "Soneium", "ink": "Ink", "unichain": "Unichain", "world-chain": "World Chain", "sonic": "Sonic", "monad": "Monad", "plasma": "Plasma",
};
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
/** sous-titre de la carte : famille crypto héritée, sinon sous-type traduit, sinon le nom de la catégorie */
export function sousFr(c: UCard): string {
  if (c.cat === "crypto") return c.fam || "Crypto";
  if (c.cat === "plateforme") return "Plateforme d'échange";
  const s = c.sous || "";
  if (!s) return c.cat === "nft" ? "Collection NFT" : "";
  return SOUS_FR[s] ?? (c.cat === "nft" ? cap(s.replace(/-/g, " ")) : s);
}

/** ligne envoyée au navigateur : [id, nom, symbole, catégorie, sous-type FR, rareté, rang, image, famille, en bref, année] (jamais la popularité brute) */
export type ClientRow = [string, string, string, Cat, string, string, number, string, string, string, number];
/* écritures non latines (chinois, japonais, coréen, cyrillique…) : jamais affichées sur une carte (04/10) */
const NON_LATIN_RE = /[Ѐ-ӿ؀-ۿऀ-ॿ฀-๿぀-ヿ㐀-鿿가-힯]/;
/** texte lisible : « 牛来 (Niu Lai) est… » → « Niu Lai est… » ; symbole non latin → vide */
export function latinText(s: string): string {
  if (!s || !NON_LATIN_RE.test(s)) return s;
  return s
    .replace(/[Ѐ-ӿ؀-ۿऀ-ॿ฀-๿぀-ヿ㐀-鿿가-힯]+\s*\(([^()]*[A-Za-z][^()]*)\)/g, "$1")
    .replace(/[Ѐ-ӿ؀-ۿऀ-ॿ฀-๿぀-ヿ㐀-鿿가-힯]+/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
export const toClientRow = (c: UCard): ClientRow => [c.id, latinText(c.nom), latinText(c.sym), c.cat, sousFr(c), c.r, c.rank, c.img ?? "", c.fam, latinText(universBlurb(c.id)), universYear(c.id)];

/* champs qui portent une carte dans les réponses du jeu (échanges, fil, boosters d'amis, profils, Colporteur, dernières cartes) ;
   on ne lit QUE ceux-là : des mots courants (« on », « packs », « ok », « base »…) sont aussi des identifiants de cryptos */
const CARD_KEYS = new Set(["id", "card", "give", "get", "cards", "best", "pantheon", "hero", "fiches"]);
/** identifiants de cartes de l'Univers cités dans une réponse (valeurs des champs de carte, clés « édition|carte » comprises) */
export function universIdsIn(v: unknown, out: Set<string> = new Set(), depth = 0, key = ""): Set<string> {
  if (depth > 10) return out;
  if (typeof v === "string") {
    if (!CARD_KEYS.has(key) || !v || v.length > 100) return out;
    if (universById(v)) out.add(v);
    else if (v.includes("|")) { const id = v.split("|")[1]; if (id && universById(id)) out.add(id); }
  } else if (Array.isArray(v)) for (const x of v) universIdsIn(x, out, depth + 1, key);
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) universIdsIn(x, out, depth + 1, k);
  return out;
}
/** Univers : joint à une réponse les lignes de toutes les cartes qu'elle cite (le jeu ne peut pas dessiner une carte sans sa ligne) */
export function withUniversMeta<T extends object>(body: T): T & { meta?: ClientRow[] } {
  if (!UNIVERS_ON()) return body;
  const ids = universIdsIn(body);
  return ids.size ? { ...body, meta: [...ids].map((id) => toClientRow(universById(id)!)) } : body;
}

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
/**
 * Part de chaque rareté parmi les cartes tirées (hors éditions et reliques).
 * Historique : jusqu'au 04/10, option W (C 72 % · PC 18,6 % · R 6,5 % · SR 2,4 % · UR 0,45 % · L 0,063 %) ; du 04 au 05/10, Univers
 * équiprobable : chaque carte à égalité, donc chaque rareté au prorata de son effectif (C 40 % · PC 30 % · R 18 % · SR 8,5 % ·
 * UR 3 % · L 0,57 %) → une Ultra rare dans 1 booster sur 6, autant de chance sur une Super rare que sur une Commune (retour de
 * Valérie, 05/10 : « y'a trop de rares, du coup c'est plus rare »).
 * Décision de Kev (05/10) : « rehausser la rareté entre ce qu'on avait avant et maintenant » → moyenne géométrique des deux, arrondie :
 * par booster de 5 cartes, une Rare ou mieux 62 % · Super rare ou mieux 27 % · Ultra rare ou mieux 6,8 % (1 sur 15) · Légendaire 1 %
 * (1 sur 100). Une Légendaire précise devient ~4 fois plus rare qu'une Commune précise (avant : la même chance).
 */
export const UNIV_W: Record<Rar, number> = { C: 0.573, PC: 0.25, R: 0.115, SR: 0.048, UR: 0.012, L: 0.002 };
/**
 * Part de chaque CATÉGORIE parmi les cartes tirées (05/10/2026, Kev : « t'as mis que les cryptos en jeu ? »). Avant : une carte au
 * hasard parmi toutes celles de la rareté, donc au prorata du catalogue (cryptos 61 %, protocoles 27 %, NFT 7 %, et 5 % seulement
 * pour personnes, événements, entreprises, concepts et plateformes réunis : une carte sur vingt). Désormais : la rareté (UNIV_W,
 * inchangée), PUIS la catégorie selon ces parts, puis une carte au hasard parmi celles de cette catégorie et de cette rareté.
 * Calibrage : les cinq petites catégories (4 Légendaires chacune) sont plafonnées pour qu'une Légendaire précise ne soit JAMAIS plus
 * probable qu'une Commune précise, quelle que soit la catégorie (contrôlé par tests/lib/reflex-cards-univers.test.ts).
 * Par booster de 5 cartes : ~1,6 carte « hors crypto » (personne, événement, entreprise, concept, plateforme) au lieu de 0,25.
 */
export const UNIV_CAT_W: Record<Cat, number> = {
  crypto: 0.35, protocole: 0.21, nft: 0.12, plateforme: 0.06, evenement: 0.065, personne: 0.065, entreprise: 0.065, concept: 0.065,
};
interface RCardLike { id: string; r: Rar; fam: string; noto: number; num: number | string; part: number | null; legende?: 1; fossil?: 1; year?: number }
/** le sous-ensemble des règles que l'Univers remplace (le reste — économie, missions, objets… — est repris tel quel) */
export interface UniversRulesPatch {
  cards: RCardLike[];
  parts: { jour: number; collection: string; partie: number }[];
  pages: string[][];
  families: string[];
  ed: Record<string, { p: number; list: string[] }>;
  relics: string[];
  /** chance PAR relique (la chance d'une relique quelconque reste 1 sur 1 milliard) */
  relicP: number;
  quests: { id: string; goal: number; card?: string }[];
  themes: { id: string; rew: number; fams?: boolean; cards?: string[] }[];
  /** catalogue Univers (objectifs adaptés : « Album d'argent » = 1 000 cartes…) */
  univ: true;
  /** part de chaque rareté parmi les cartes tirées (UNIV_W) */
  wRar: Record<Rar, number>;
  /** part de chaque catégorie (par libellé : « Cryptos »…) parmi les cartes tirées, une fois la rareté tirée (UNIV_CAT_W) */
  wFam: Record<string, number>;
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
  const extra = (slot: "reliques" | "mythiques" | "icones") => Object.values(E).flatMap((e) => e[slot]).filter((id) => !!universById(id));
  const uniq = (l: string[]) => [...new Set(l)];
  const ed: UniversRulesPatch["ed"] = { ...base.ed };
  /* Fossiles : le Musée n'existe pas dans l'Univers (le jeu le masque) ; ils ne se tirent donc plus (04/10 : une Fossile tirée
     s'affichait « chance 1/NaN » et restait introuvable dans l'album). Les exemplaires déjà obtenus restent aux joueurs. */
  if (ed.fossil) ed.fossil = { p: 0, list: [] };
  /* Rareté des éditions (décision du 04/10, dans l'esprit des règles de Kev « Mythiques = vraie rareté », « Icônes plus rares que les
     Légendaires », « Reliques quasi impossibles ») : avec 7 catégories de plus, on ne multiplie pas les chances par 8.
     - Icônes : 5 → 40 cartes, chance TOTALE ×3 (une Icône quelconque ≈ 1 carte sur 10 000, une Icône précise ≈ 1 sur 400 000 ;
       toujours ~18 fois plus rare qu'une Légendaire, 1 sur 554) ;
     - Mythiques : 6 → 27 cartes, chance TOTALE ×2 (une Mythique précise ≈ 1 sur 2,25 millions) ;
     - Reliques : 3 → 24 cartes, chance TOTALE INCHANGÉE (« 1 carte sur 1 milliard », règle fixée pour toujours le 01/10). */
  const mythList = uniq([...base.ed.myth.list, ...extra("mythiques")]);
  ed.myth = { p: base.ed.myth.p * 2, list: mythList };
  const iconList = uniq([...base.ed.icon.list, ...extra("icones")]);
  ed.icon = { p: base.ed.icon.p * 3, list: iconList };
  const relics = uniq([...base.relics, ...extra("reliques")]);
  const relicP = (base.relicP * base.relics.length) / relics.length;
  /* défis Univers : mêmes mécaniques (boosters, page, doublons, quiz, fiches, semaine), nouveaux objectifs transversaux */
  const quests: UniversRulesPatch["quests"] = [
    { id: "q-open", goal: 3 }, { id: "q-page", goal: 1 }, { id: "q-tour", goal: 8 }, { id: "q-swap", goal: 15 },
    { id: "q-perso", goal: 3 }, { id: "q-event", goal: 3 }, { id: "q-quiz", goal: 10 }, { id: "q-read", goal: 3, card: "aave" }, { id: "q-week", goal: 7 },
  ];
  return {
    cards, parts: [{ jour: 1, collection: "Univers", partie: 1 }], pages, families: CATS.map((c) => CAT_LABEL[c]), ed, relics, relicP, quests,
    themes: base.themes, univ: true, wRar: UNIV_W, wFam: Object.fromEntries(CATS.map((c) => [CAT_LABEL[c], UNIV_CAT_W[c]])), totyFromDay: base.totyFromDay,
  };
}
