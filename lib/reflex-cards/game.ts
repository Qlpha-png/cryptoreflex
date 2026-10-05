/**
 * Reflex Cards — la page du jeu (cryptoreflex.fr/cartes/jouer, Kev 02/10/2026) ; bêta dans le navigateur, puis partie tenue par le serveur (REFLEX_CARDS_ACCOUNTS).
 *
 * Le gabarit (lib/reflex-cards/game/template.ts) et les données (data/reflex-cards-game.json) sont générés par
 * Reflex-Cards/src/export-game.mjs depuis la maquette v9. Le navigateur ne reçoit que ce qui est sorti au jour `day` :
 *  - cartes sorties, Fossiles, Icônes et Trophées (objectifs affichés dès le début) : données complètes ;
 *  - cartes à venir : identifiant opaque, ni nom, ni logo, ni texte, ni rang de notoriété exact ; seulement ce que
 *    montre leur case « À venir » (catégorie, rareté, jour de sortie), dans l'ordre de l'album ;
 *  - Équipe de la saison : secrète avant le jour de sa révélation.
 */
import "server-only";
import raw from "@/data/reflex-cards-game.json";
import rulesRaw from "@/data/reflex-cards-rules.json";
import { GAME_TEMPLATE } from "./game/template";
import { reflexAccountsMode } from "./flag";
import { launchDate } from "./season";
import { partDay, totyDay, RULES as ENGINE_RULES } from "./engine";
import { CATS, CAT_LABEL, UNIVERS_ON, latinText, sousFr, universBlurb, universById, universCards, universEditions, universMeta, universStats, universYear, type UCard } from "./univers";

const RULES = rulesRaw as unknown as { themes: { id: string; cards?: string[] }[] };

type Row = [string, string, string, string, number, string, string, number, string, string, string, number];
type Palier = { fam: string; sub: string; r: string; noto: number; part: number; legende?: number; merite?: number };
type Partie = { k: number; jour: number; collection: string; partie: number; taille: number; tete: string[] };
type GameRaw = {
  meta: { toty_revelee_jour: number };
  cards: Row[];
  paliers: { meta: unknown; cartes: Record<string, Palier>; parties: Partie[]; fossiles: Record<string, unknown> };
  noto: Record<string, number>;
  fiches: { desc: Record<string, unknown> };
  watch: Record<string, number>;
  toty: string[];
  publiques: string[];
};
const RAW = raw as unknown as GameRaw;
const PUBLIQUES = new Set(RAW.publiques);

/** carte envoyée en clair ce jour-là (sortie, Fossile, ou objectif affiché dès le début) */
export function isSentInClear(id: string, day: number): boolean {
  const P = RAW.paliers;
  if (P.fossiles[id] || PUBLIQUES.has(id)) return true;
  const p = P.cartes[id];
  return !!p && day >= 1 && partDay(p.part) <= day;
}

export type GameData = {
  cards: Row[];
  paliers: { meta: unknown; cartes: Record<string, Palier>; parties: Partie[]; fossiles: Record<string, unknown> };
  noto: Record<string, number>;
  fiches: { desc: Record<string, unknown> };
  watch: Record<string, number>;
  toty: string[];
  masked: number;
  /** cartes de chaque collection thématique (identifiants masqués pour celles à venir) : les mêmes listes que le serveur */
  themes: Record<string, string[]>;
  /** nombre de cartes de l'album par rareté (les cartes à venir n'envoient plus leur rareté : le jeu a besoin des totaux) */
  rarTotals: Record<string, number>;
};

export function gameData(day: number): GameData {
  const P = RAW.paliers;
  /* cartes masquées, dans l'ordre de l'album (catégorie puis notoriété) : leur position ne trahit rien de plus que leur case */
  const hidden = Object.keys(P.cartes).filter((id) => !isSentInClear(id, day));
  const byFam = new Map<string, string[]>();
  for (const id of Object.keys(P.cartes)) {
    const f = P.cartes[id].fam;
    if (!byFam.has(f)) byFam.set(f, []);
    byFam.get(f)!.push(id);
  }
  /* rang de notoriété des cartes masquées : juste après la dernière carte en clair de leur catégorie (l'ordre de l'album
     est conservé, le rang exact — qui trahirait la crypto — ne part pas) */
  const fuzzy = new Map<string, number>();
  for (const ids of byFam.values()) {
    let last = 0;
    let k = 0;
    for (const id of ids.sort((a, b) => P.cartes[a].noto - P.cartes[b].noto)) {
      if (isSentInClear(id, day)) { last = P.cartes[id].noto; k = 0; continue; }
      fuzzy.set(id, last + 0.001 * ++k);
    }
  }
  const order = hidden.sort((a, b) => P.cartes[a].fam.localeCompare(P.cartes[b].fam) || fuzzy.get(a)! - fuzzy.get(b)!);
  const mask = new Map(order.map((id, i) => [id, "x" + String(i + 1).padStart(3, "0")]));

  const seen = new Set<string>();
  const clear = RAW.cards.filter((row) => !mask.has(row[0]));
  const cards: Row[] = [
    ...clear,
    ...order.map((id): Row => [mask.get(id)!, "", "", "", 0, P.cartes[id].fam, "", 0, "", "", "", 0]),
  ].filter((row) => (seen.has(row[0]) ? false : (seen.add(row[0]), true)));

  const cartes: Record<string, Palier> = {};
  for (const [id, p] of Object.entries(P.cartes)) {
    const m = mask.get(id);
    cartes[m ?? id] = m
      /* carte à venir : famille (sa case dans l'album) et rang flou seulement — ni rareté, ni « légende », ni « méritée » :
         rareté + famille suffisaient à deviner les futures Légendaires (audit du 03/10, décision Kev) */
      ? { fam: p.fam, sub: "", r: "?", noto: fuzzy.get(id)!, part: p.part }
      : p;
  }
  const keep = <T>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).filter(([id]) => !mask.has(id)));
  return {
    cards,
    /* le jour de sortie envoyé est le jour EFFECTIF (paliers de joueurs) : FAR = partie en attente, aucune date */
    paliers: { meta: P.meta, cartes, parties: P.parties.map((p, i) => ({ ...p, jour: partDay(i), tete: p.tete.map((id) => mask.get(id) ?? id) })), fossiles: P.fossiles },
    noto: keep(RAW.noto),
    fiches: { desc: keep(RAW.fiches.desc) },
    watch: keep(RAW.watch),
    toty: day >= totyDay() ? RAW.toty.filter((id) => !mask.has(id)) : [],
    masked: mask.size,
    themes: Object.fromEntries(RULES.themes.filter((t) => t.cards?.length).map((t) => [t.id, t.cards!.map((id) => mask.get(id) ?? id)])),
    rarTotals: Object.entries(P.cartes).filter(([id]) => !P.fossiles[id]).reduce<Record<string, number>>((acc, [, p]) => ((acc[p.r] = (acc[p.r] ?? 0) + 1), acc), {}),
  };
}

/* ---------- Univers (REFLEX_CARDS_UNIVERS=true) ----------
   La page n'embarque que les têtes d'affiche : Légendaires et Ultra rares de chaque catégorie, Icônes, Trophées, Équipe de la saison.
   Les cartes possédées arrivent avec la partie (champ meta de /api/cartes/etat), les autres par /api/cartes/recherche. Tout est
   « sorti » et en clair : aucune carte masquée. */
export interface UniversInfo {
  catv: string; total: number; cats: Record<string, Record<string, number>>; labels: Record<string, string>; editions: ReturnType<typeof universEditions>;
  /** chances TOTALES des éditions côté serveur (le navigateur les affiche, il ne tire plus rien) */
  ed: { myth: number; icon: number; toty: number; bds: number; relicAny: number; relics: string[] };
  /** part de chaque rareté parmi les cartes tirées (UNIV_W, 05/10) : le navigateur en déduit les chances affichées */
  w: Record<string, number>;
}
export type GameDataU = GameData & { univers: UniversInfo | null };
const LEGACY_ROW = new Map(RAW.cards.map((r) => [r[0], r]));
/** ligne au format du jeu ([id, nom, symbole, image, rang, famille, sous-titre, année, en bref, accroche, slug, score]) */
function universRow(c: UCard): Row {
  const old = LEGACY_ROW.get(c.id);
  const label = CAT_LABEL[c.cat];
  /* nom = celui du catalogue Univers (nom d'origine nettoyé des caractères non latins : « 币安人生 (BinanceLife) » → « BinanceLife ») */
  if (old) { const r = [...old] as Row; r[1] = latinText(c.nom); r[2] = latinText(String(old[2] ?? "")); r[3] = c.img ?? old[3]; r[4] = c.rank; r[5] = label; r[6] = c.fam || old[5]; if (typeof r[8] === "string") r[8] = latinText(r[8]); return r; }
  return [c.id, latinText(c.nom), latinText(c.sym), c.img ?? "", c.rank, label, sousFr(c), universYear(c.id), latinText(universBlurb(c.id)), "", "", 0];
}
export function universGame(day: number): GameDataU {
  const all = universCards(), st = universStats(), E = universEditions();
  const stars = new Set<string>();
  /* têtes d'affiche embarquées dans la page : toutes les Légendaires + les 25 premières Ultra rares de chaque catégorie (le dosage du
     04/10 compte ~760 Ultra rares : toutes les embarquer alourdirait la page de ~150 Ko ; les autres arrivent avec la partie) */
  const urSeen: Record<string, number> = {};
  for (const c of [...all].sort((a, b) => a.rank - b.rank)) {
    if (c.r === "L") stars.add(c.id);
    else if (c.r === "UR" && (urSeen[c.cat] = (urSeen[c.cat] ?? 0) + 1) <= 25) stars.add(c.id);
  }
  /* éditions : les cartes de base de TOUTES les Icônes, Mythiques et Reliques (Trésors et Chambre forte complets : 27 Mythiques, 24 Reliques) */
  for (const e of Object.values(E)) for (const id of [...e.icones, ...e.mythiques, ...e.reliques]) stars.add(id);
  for (const id of [...RAW.publiques, ...RAW.toty]) stars.add(id);
  const rows: Row[] = [], cartes: Record<string, Palier> = {};
  for (const id of stars) {
    const c = universById(id);
    if (!c) continue;
    rows.push(universRow(c));
    cartes[id] = { fam: CAT_LABEL[c.cat], sub: sousFr(c), r: c.r, noto: c.rank, part: 0, ...(c.r === "L" ? { legende: 1 } : {}) };
  }
  const rarTotals: Record<string, number> = {};
  for (const cat of CATS) for (const r of ["C", "PC", "R", "SR", "UR", "L"]) rarTotals[r] = (rarTotals[r] ?? 0) + (st[cat][r] ?? 0);
  const cats: UniversInfo["cats"] = {};
  for (const cat of CATS) cats[CAT_LABEL[cat]] = st[cat];
  return {
    cards: rows,
    paliers: { meta: {}, cartes, parties: [{ k: 0, jour: 1, collection: "Univers", partie: 1, taille: all.length, tete: [] }], fossiles: {} },
    /* fiches des cartes d'origine : jamais d'écriture non latine affichée (« 牛来 (Niu Lai) est un memecoin… » → « Niu Lai est… ») */
    noto: RAW.noto,
    fiches: { desc: Object.fromEntries(Object.entries(RAW.fiches.desc as Record<string, Record<string, unknown>>).map(([k, v]) => [k, { ...v, ...(typeof v.desc === "string" ? { desc: latinText(v.desc) } : {}), ...(typeof v.tag === "string" ? { tag: latinText(v.tag) } : {}) }])) },
    watch: RAW.watch,
    toty: day >= totyDay() ? RAW.toty : [],
    masked: 0,
    themes: Object.fromEntries(RULES.themes.filter((t) => t.cards?.length).map((t) => [t.id, t.cards!])),
    rarTotals,
    univers: {
      catv: universMeta().genere, total: all.length, cats, labels: Object.fromEntries(CATS.map((c) => [c, CAT_LABEL[c]])), editions: E,
      ed: { myth: ENGINE_RULES.ed.myth.p, icon: ENGINE_RULES.ed.icon.p, toty: ENGINE_RULES.ed.toty.p, bds: ENGINE_RULES.ed.bds.p, relicAny: ENGINE_RULES.relicP * ENGINE_RULES.relics.length, relics: ENGINE_RULES.relics },
      w: { ...ENGINE_RULES.wRar },
    },
  };
}

/* JSON sûr dans un <script> : pas de « </script> », pas de séparateurs de ligne Unicode */
const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const js = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c").split(LS).join("\\u2028").split(PS).join("\\u2029");

/** ce que le jeu doit savoir des sorties en attente : prochaine partie, palier, joueurs du jour (null = masqué) */
export interface GameNext { part: number; need: number; have: number | null }

/** bloc de données injecté dans le gabarit */
export function gameDataScript(day: number, next: GameNext | null = null): string {
  const d: GameDataU = UNIVERS_ON() ? universGame(day) : { ...gameData(day), univers: null };
  /* GAME_LAUNCH : la date du jour 1, pour afficher de vraies dates de sortie sans dépendre de l'horloge ni du cache de la page ;
     GAME_NEXT : la prochaine partie en attente et son palier de joueurs ; GAME_TOTY_DAY : jour de révélation de l'Équipe (FAR = pas encore fixé) ;
     GAME_UNIVERS : total et effectifs par catégorie du catalogue Univers (null = jeu actuel) */
  return `const GAME_PUBLIC=true,GAME_DAY=${day},GAME_TOTY=${js(d.toty)},GAME_ACCOUNTS=${js(reflexAccountsMode())},GAME_LAUNCH=${js(launchDate())},GAME_THEMES=${js(d.themes)},GAME_RAR_TOTALS=${js(d.rarTotals)},GAME_NEXT=${js(next)},GAME_TOTY_DAY=${totyDay()},GAME_UNIVERS=${js(d.univers)};
const CARDS=${js(d.cards)};
const PALIERS=${js(d.paliers)};
const NOTO=${js(d.noto)};
const FICHES=${js(d.fiches)};
const WATCH=${js(d.watch)};`;
}

/* comptes actifs : le voile « Chargement de votre partie… » est dans le HTML dès la première image, sinon l'album par défaut
   (0 carte, 10 boosters) peut s'afficher un instant avant que le jeu ne le pose (téléphone lent, onglet en arrière-plan) */
const BODY = "</head>\n<body>";
const SRV_BODY = '</head>\n<body class="srv srv-wait">\n<div id="srvLoad" role="status"><b>Chargement de votre partie…</b></div>';

/** la page complète du jeu au jour `day` */
export function gameHtml(day: number, next: GameNext | null = null): string {
  const html = GAME_TEMPLATE.replace("/*__GAME_DATA__*/", () => gameDataScript(day, next));
  return reflexAccountsMode() === "on" ? html.replace(BODY, () => SRV_BODY) : html;
}
