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
import { partDay, totyDay } from "./engine";

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

/* JSON sûr dans un <script> : pas de « </script> », pas de séparateurs de ligne Unicode */
const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const js = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c").split(LS).join("\\u2028").split(PS).join("\\u2029");

/** ce que le jeu doit savoir des sorties en attente : prochaine partie, palier, joueurs du jour (null = masqué) */
export interface GameNext { part: number; need: number; have: number | null }

/** bloc de données injecté dans le gabarit */
export function gameDataScript(day: number, next: GameNext | null = null): string {
  const d = gameData(day);
  /* GAME_LAUNCH : la date du jour 1, pour afficher de vraies dates de sortie sans dépendre de l'horloge ni du cache de la page ;
     GAME_NEXT : la prochaine partie en attente et son palier de joueurs ; GAME_TOTY_DAY : jour de révélation de l'Équipe (FAR = pas encore fixé) */
  return `const GAME_PUBLIC=true,GAME_DAY=${day},GAME_TOTY=${js(d.toty)},GAME_ACCOUNTS=${js(reflexAccountsMode())},GAME_LAUNCH=${js(launchDate())},GAME_THEMES=${js(d.themes)},GAME_RAR_TOTALS=${js(d.rarTotals)},GAME_NEXT=${js(next)},GAME_TOTY_DAY=${totyDay()};
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
