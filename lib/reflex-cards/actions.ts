/**
 * Reflex Cards — actions du joueur (phase B1). Chaque action lit l'état de la partie, applique les règles du jeu
 * et renvoie un patch pour rc_apply (rien n'est écrit ici). Toute action impossible lève GameError (message en français).
 */
import "server-only";
import {
  CARD, RULES, GameError, activeMissions, cryptoRnd, colpOffers, craftDay, dayTables, earnedNow, giveNew, inClear, isOut, onSale,
  ownsCos, planOpen, questProg, refill, spendDups, svcKey, tradeN, titleOk, themeProg, weekDone, weekStart, cosItem,
  type GameState, type Patch, type Rar,
} from "./engine";
import { QJ_LEN, qjReward, quizDay } from "./quiz-day";
import { seasonDay } from "./season";

export interface Ctx { day: number; today: string; now: number }
/** qui joue : invité (partie liée à ce navigateur) ou compte du site (e-mail affiché dans le jeu) */
/** expired : un cookie de session du site était présent mais ne correspond plus à une session valide (à reconnecter) */
export interface Account { guest: boolean; email: string | null; expired?: boolean }
export interface Planned { patch: Patch; msg?: string; data?: Record<string, unknown> }

const reflets = (s: GameState, n: number) => {
  if (s.player.reflets < n) throw new GameError("short", `Il vous manque ${n - s.player.reflets} Reflets.`);
};
/** réserve + 1 booster (récompenses et Comptoir) : la réserve à jour, puis un de plus */
const plusOne = (s: GameState, ctx: Ctx) => {
  const r = refill(s.player, ctx.now);
  /* la base plafonne la réserve à 60 : au-delà, le bonus serait refusé (« Solde insuffisant ») et le geste bloqué */
  return { stock: Math.min(60, r.stock + 1), stock_at: new Date(r.stockAt).toISOString() };
};
/** clé du tirage du Quiz du jour : la partie (identifiant stable), sinon son premier jour */
const qjKey = (s: GameState) => String((s.player as { player_id?: string }).player_id ?? s.player.first_day);
/* le Quiz du jour se calcule sur le jour du SERVEUR, jamais sur celui de la page : une page de la veille (tolérée 30 min après
   minuit) donnerait d'autres questions, et les réponses déjà données seraient notées contre les mauvaises (audit du 03/10) */
const qjDay = (ctx: Ctx) => seasonDay(new Date(ctx.now));
/** réponses déjà données au Quiz du jour (question → choix), notées comme des jalons « zq|date|i|choix » */
function qjGiven(s: GameState, today: string): Map<number, number> {
  const m = new Map<number, number>(), pre = `zq|${today}|`;
  for (const k of s.claims) if (k.startsWith(pre)) { const [i, r] = k.slice(pre.length).split("|").map(Number); if (Number.isInteger(i) && Number.isInteger(r) && !m.has(i)) m.set(i, r); }
  return m;
}
/* 20 caractères comptés en points de code (un emoji n'est jamais coupé en deux : la base refuserait le JSON) ; caractères de
   contrôle, invisibles et de changement de sens d'écriture retirés */
const sanitizePseudo = (v: unknown) =>
  [...String(v ?? "").normalize("NFC").replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿<>]/g, "").replace(/\s+/g, " ").trim()].slice(0, 20).join("").trim();

/** mises à jour du jour : jour joué, offres du Colporteur, objets mérités (appliquées à la lecture de la partie) */
export function planDaily(s: GameState, ctx: Ctx): Patch | null {
  const patch: Patch = {};
  if (!s.player.days.includes(ctx.today)) patch.player = { days: [...s.player.days, ctx.today].slice(-400) };
  const d = s.days.get(ctx.today);
  /* offres du Colporteur figées pour la JOURNÉE (clé = date) : deux pages de jours différents entre 00 h 00 et 00 h 30 ne les
     font plus alterner ; l'ancienne clé « date|jour » reste acceptée pour aujourd'hui */
  if (!d?.colp || (d.colp.k !== ctx.today && !d.colp.k.startsWith(ctx.today + "|"))) patch.day = { day: ctx.today, colp: colpOffers(s, ctx.today, ctx.day) };
  const earned = earnedNow(s, ctx.day);
  if (earned.length) patch.cos = earned.map((id) => ({ id, no: null }));
  return Object.keys(patch).length ? patch : null;
}

export function planAction(s: GameState, a: string, b: Record<string, unknown>, ctx: Ctx): Planned {
  switch (a) {
    case "ouvrir": {
      const req = String(b.req ?? "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req)) throw new GameError("bad", "Demande invalide.");
      const o = planOpen(s, { day: ctx.day, today: ctx.today, now: ctx.now, req });
      return { patch: o.patch, data: { items: o.items, results: o.results, theme: o.theme } };
    }
    case "mission": {
      const m = activeMissions(s, ctx.today).find((x) => x.key === b.key);
      if (!m) throw new GameError("gone", "Cette mission n'est plus disponible.");
      if (m.cl) throw new GameError("done", "Déjà récupérée.");
      if (m.p < m.g) throw new GameError("todo", "Mission pas encore terminée.");
      return { patch: { player: { reflets: m.r }, claims: ["m|" + m.key] }, msg: `Mission réussie : +${m.r} Reflets` };
    }
    case "semaine": {
      const wk = weekStart(ctx.today);
      if (s.claims.has("w|" + wk)) throw new GameError("done", "Bonus de la semaine déjà récupéré.");
      if (weekDone(s, ctx.today) < RULES.week.goal) throw new GameError("todo", "Semaine pas encore régulière.");
      return { patch: { player: { reflets: RULES.week.rew }, claims: ["w|" + wk] }, msg: `Semaine régulière : +${RULES.week.rew} Reflets` };
    }
    case "defi": {
      const q = RULES.quests.find((x) => x.id === b.id);
      if (!q) throw new GameError("bad", "Défi inconnu.");
      if (s.claims.has("q|" + q.id)) throw new GameError("done", "Défi déjà réussi.");
      if (questProg(s, q.id) < q.goal) throw new GameError("todo", "Défi pas encore terminé.");
      const patch: Patch = { claims: ["q|" + q.id] };
      let extra = "";
      const dupPatch = (spent: Map<string, number>) => [...spent].map(([id, n]) => ({ id, dn: -n }));
      switch (q.id) {
        case "q-open": case "q-quiz": patch.player = plusOne(s, ctx); break;
        case "q-page": patch.player = { eclats: 300 }; break;
        case "q-oracle": case "q-read": patch.eds = [{ ed: "trophy", id: q.card as string, dn: 1 }]; break;
        case "q-swap": {
          const id = giveNew(s, "R", ctx.day);
          patch.cards = [...dupPatch(spendDups(s, (c) => c.r === "C", 15)), { id, dn: 1 }];
          extra = CARD.get(id) ? id : "";
          break;
        }
        case "q-l1": patch.cards = dupPatch(spendDups(s, (c) => c.fam === "Layer 1", 4)); patch.player = { ...plusOne(s, ctx), eclats: 100 }; break;
        case "q-defi": {
          const spent = spendDups(s, (c) => c.fam === "DeFi" && c.r !== "C", 1);
          spendDups(s, (c) => c.fam === "DeFi", 2, spent);
          const id = giveNew(s, "SR", ctx.day);
          patch.cards = [...dupPatch(spent), { id, dn: 1 }];
          extra = id;
          break;
        }
        case "q-week": {
          const pool = dayTables(ctx.day).byRD.R, id = pool[Math.floor(cryptoRnd() * pool.length)].id;
          patch.cards = [{ id, dn: 1, dholo: 1 }];
          extra = id;
          break;
        }
      }
      return { patch, msg: "Défi réussi", data: { card: extra || null } };
    }
    case "collection": {
      const th = RULES.themes.find((x) => x.id === b.id);
      if (!th) throw new GameError("bad", "Collection inconnue.");
      if (s.claims.has("t|" + th.id)) throw new GameError("done", "Collection déjà récupérée.");
      const p = themeProg(s, th);
      if (p.n < p.t) throw new GameError("todo", "Collection pas encore complète.");
      return { patch: { player: { eclats: th.rew }, claims: ["t|" + th.id] }, msg: `Collection complétée : +${th.rew} éclats` };
    }
    case "quiz": {
      const id = String(b.id ?? ""), answer = String(b.rep ?? "");
      if (!RULES.quiz[id] || !inClear(id, ctx.day)) throw new GameError("bad", "Carte inconnue.");
      /* le questionnaire est celui de la fiche d'une carte POSSÉDÉE (comme dans le jeu) : sinon un script réussit « Érudit » dès le jour 1 */
      if (!s.cards.has(id)) throw new GameError("bad", "Carte non possédée.");
      const q = s.quiz.get(id);
      if (q?.ok) throw new GameError("done", "Questionnaire déjà réussi.");
      if (q && q.day === ctx.today) throw new GameError("later", "Nouvel essai demain.");
      const ok = RULES.quiz[id] === answer;
      if (!ok) return { patch: { quiz: { id, ok: false, day: ctx.today } }, data: { ok: false, answer: RULES.quiz[id] } };
      const paid = (s.days.get(ctx.today)?.ev.qzpaid ?? 0) < RULES.qzCap;
      return {
        patch: { quiz: { id, ok: true, day: ctx.today }, ...(paid ? { player: { reflets: RULES.qzRew } } : {}), day: { day: ctx.today, inc: { quiz: 1, ...(paid ? { qzpaid: 1 } : {}) } } },
        data: { ok: true, paid },
      };
    }
    case "fiche": {
      const id = String(b.id ?? "");
      if (!CARD.get(id) || !inClear(id, ctx.day)) throw new GameError("bad", "Carte inconnue.");
      if ((s.days.get(ctx.today)?.ev.fiche ?? 0) >= 30) return { patch: {} };
      return { patch: { day: { day: ctx.today, inc: { fiche: 1 } }, ...(s.claims.has("f|" + id) ? {} : { claims: ["f|" + id] }) } };
    }
    case "fabriquer": {
      const c = CARD.get(String(b.id ?? ""));
      if (!c || c.fossil || !isOut(c, ctx.day)) throw new GameError("bad", "Carte indisponible.");
      if (s.cards.has(c.id)) throw new GameError("done", "Carte déjà dans votre album.");
      if (ctx.day < craftDay(c)) throw new GameError("later", `Fabricable dès le jour ${craftDay(c)}.`);
      const cost = RULES.craft[c.r as Rar];
      if (s.player.eclats < cost) throw new GameError("short", `Il vous manque ${cost - s.player.eclats} éclats.`);
      return { patch: { player: { eclats: -cost }, cards: [{ id: c.id, dn: 1 }], day: { day: ctx.today, inc: { newc: 1 } } }, msg: "Carte fabriquée" };
    }
    case "acheter": {
      const id = String(b.id ?? ""), it = cosItem(id);
      if (!it || !it.price || !onSale(id, ctx.day)) throw new GameError("gone", "Cet objet n'est plus en vente.");
      if (ownsCos(s, id)) throw new GameError("done", "Déjà dans votre vitrine.");
      reflets(s, it.price);
      return { patch: { player: { reflets: -it.price }, cos: [{ id, no: null }] }, msg: "Rejoint votre vitrine pour toujours" };
    }
    case "equiper": {
      const id = String(b.id ?? ""), it = cosItem(id);
      if (!it || !ownsCos(s, id)) throw new GameError("bad", "Objet non possédé.");
      return { patch: { player: { perso: { ...s.player.perso, [it.ty]: id } } } };
    }
    case "service": {
      const sv = RULES.svc.find((x) => x.id === b.id), key = sv && svcKey(sv.id, ctx.today);
      if (!sv || !key) throw new GameError("bad", "Service inconnu.");
      if (s.claims.has("s|" + key)) throw new GameError("done", sv.per === "day" ? "Déjà pris aujourd'hui." : "Déjà pris cette semaine.");
      reflets(s, sv.p);
      const player: Record<string, unknown> = { reflets: -sv.p, ...plusOne(s, ctx) };
      if (sv.id === "thm") {
        const fam = String(b.fam ?? "");
        if (!RULES.families.includes(fam)) throw new GameError("bad", "Catégorie inconnue.");
        player.theme = fam;
      } else if (sv.id !== "bst") throw new GameError("bad", "Service indisponible.");
      return { patch: { player, claims: ["s|" + key] } };
    }
    case "colporteur": {
      const i = Number(b.i), give = String(b.give ?? ""), D = s.days.get(ctx.today)?.colp;
      /* offres du jour : clé « date » (ou l'ancienne « date|jour ») */
      if (!D || (D.k !== ctx.today && D.k !== ctx.today + "|" + ctx.day) || !D.offers[i]) throw new GameError("gone", "Offres du jour renouvelées : rechargez la page.");
      const key = `c|${ctx.today}|${i}`, o = D.offers[i];
      if (s.claims.has(key)) throw new GameError("done", "Offre déjà prise.");
      /* le Colporteur donne une carte ordinaire : il ne prend qu'un doublon ORDINAIRE de même rareté (jamais une Holo ni une numérotée) */
      if (CARD.get(give)?.r !== o.r || tradeN(s, give) < 1) throw new GameError("no_dup", `Il vous faut un doublon ordinaire (ni Holo ni numéroté) de la même rareté.`);
      const isNew = !s.cards.has(o.id);
      return {
        patch: { cards: [{ id: give, dn: -1 }, { id: o.id, dn: 1 }], claims: [key], day: { day: ctx.today, inc: { trade: 1, ...(isNew ? { newc: 1 } : {}) } } },
        data: { id: o.id },
      };
    }
    case "titre": {
      const id = b.id == null ? null : String(b.id);
      if (id && !titleOk(s, id)) throw new GameError("bad", "Titre pas encore obtenu.");
      return { patch: { player: { perso: { ...s.player.perso, title: id } } } };
    }
    case "pantheon": {
      /* clés « édition|carte » strictes et sans doublon : rien d'autre ne doit entrer dans le profil */
      const keys = [...new Set(Array.isArray(b.keys) ? b.keys.map(String) : [])].filter((k) => /^[a-z]{2,12}\|[a-z0-9-]{1,80}$/.test(k)).slice(0, 3);
      for (const k of keys) {
        const [ed, id] = k.split("|");
        if (!(ed === "base" ? s.cards.has(id) : s.eds.has(k))) throw new GameError("bad", "Carte non possédée.");
      }
      return { patch: { player: { perso: { ...s.player.perso, pantheon: keys } } } };
    }
    case "quiz-jour": {
      /* question par question (Kev 02/10) : la bonne réponse n'est révélée qu'une fois répondu, la première réponse compte ;
         à la 5e, le score, la récompense et le corrigé. (Un tableau `rep` complet reste accepté : ancienne page en cache.) */
      const key = "z|" + ctx.today;
      if (s.claims.has(key)) throw new GameError("done", "Quiz du jour déjà joué : revenez demain.");
      const qs = quizDay(qjKey(s), ctx.today, qjDay(ctx));
      if (qs.length < QJ_LEN) throw new GameError("bad", "Pas de quiz aujourd'hui.");
      const given = qjGiven(s, ctx.today);
      const finish = (answers: number[]) => {
        const score = qs.reduce((n, q, i) => n + (answers[i] === q.ok ? 1 : 0), 0);
        const rw = qjReward(score);
        const player: Record<string, unknown> = {};
        if (rw.reflets) player.reflets = rw.reflets;
        if (rw.booster) Object.assign(player, plusOne(s, ctx));
        return { player: Object.keys(player).length ? player : null, score, rw, sol: qs.map((q) => ({ q: q.q, a: q.c[q.ok], e: q.e })) };
      };
      if (Array.isArray(b.rep)) {
        const rep = (b.rep as unknown[]).map((x) => Number(x));
        if (rep.length !== qs.length || given.size) throw new GameError("bad", "Réponses incomplètes.");
        const f = finish(rep);
        return { patch: { ...(f.player ? { player: f.player } : {}), claims: [key], day: { day: ctx.today, inc: { qj: f.score + 1 } } }, data: { done: true, score: f.score, reward: f.rw, sol: f.sol } };
      }
      const i = Number(b.i), rep = Number(b.rep);
      if (!Number.isInteger(i) || i < 0 || i >= qs.length || !Number.isInteger(rep) || rep < 0 || rep >= qs[i].c.length) throw new GameError("bad", "Réponse invalide.");
      const reveal = (j: number, r: number) => ({ i: j, rep: r, ok: qs[j].ok, correct: r === qs[j].ok, e: qs[j].e, answered: given.size });
      if (given.has(i)) return { patch: {}, data: reveal(i, given.get(i)!) }; // déjà répondu : même révélation, rien d'écrit
      given.set(i, rep);
      const claims = [`zq|${ctx.today}|${i}|${rep}`];
      if (given.size < qs.length) return { patch: { claims }, data: reveal(i, rep) };
      const f = finish(qs.map((_, j) => given.get(j) ?? -1));
      return {
        patch: { ...(f.player ? { player: f.player } : {}), claims: [...claims, key], day: { day: ctx.today, inc: { qj: f.score + 1 } } },
        data: { ...reveal(i, rep), done: true, score: f.score, reward: f.rw, sol: f.sol },
      };
    }
    case "lien-ami": {
      /* nouveau lien d'invitation : la version monte, tous les liens déjà partagés deviennent invalides (Kev 03/10) */
      const v = Number((s.player.perso as Record<string, unknown>).inviteV ?? 0);
      return { patch: { player: { perso: { ...s.player.perso, inviteV: (Number.isInteger(v) && v >= 0 ? v : 0) + 1 } } }, msg: "Nouveau lien créé : les anciens ne fonctionnent plus." };
    }
    case "pseudo": {
      const v = sanitizePseudo(b.v);
      if (!v) throw new GameError("bad", "Pseudo vide.");
      return { patch: { player: { pseudo: v, perso: { ...s.player.perso, pseudo: v } } }, msg: "Pseudo enregistré : " + v };
    }
    default:
      throw new GameError("bad", "Action inconnue.");
  }
}

/** la partie telle que le jeu l'attend (mêmes structures que la sauvegarde locale de la v9) */
export function toClient(s: GameState, ctx: Ctx, account: Account) {
  const r = refill(s.player, ctx.now);
  const col: Record<string, unknown> = {};
  for (const [id, e] of s.cards) col[id] = { n: e.n, holo: e.holo, fins: e.fins, t: e.t };
  const eds: Record<string, unknown> = {};
  for (const [k, e] of s.eds) eds[k] = { n: e.n, t: e.t };
  const claims = [...s.claims];
  const after = (p: string) => claims.filter((k) => k.startsWith(p)).map((k) => k.slice(p.length));
  const ev: Record<string, unknown> = {}, qzPaid: Record<string, number> = {};
  for (const [d, x] of s.days) { ev[d] = x.ev; if (x.ev.qzpaid) qzPaid[d] = x.ev.qzpaid; }
  const quiz: Record<string, unknown> = {};
  for (const [id, q] of s.quiz) quiz[id] = q.ok ? { r: 1 } : { r: 0, d: q.day, ok: RULES.quiz[id] };
  const D = s.days.get(ctx.today)?.colp ?? null;
  const colpD = D ? { ...D, offers: D.offers.map((o, i) => ({ ...o, done: s.claims.has(`c|${ctx.today}|${i}`) })) } : null;
  const inv: Record<string, unknown> = {};
  for (const id of RULES.cosOwned) inv[id] = { t: Date.parse(s.player.first_day) };
  for (const [id, x] of s.cos) inv[id] = { t: x.t, ...(x.no ? { no: x.no } : {}) };
  const P = s.player.perso as Record<string, unknown>;
  return {
    v: s.player.version, day: ctx.day, today: ctx.today, account,
    /* le pseudo a-t-il déjà été choisi par le joueur ? (sinon le jeu le demande, une seule fois) */
    pseudoChosen: typeof P.pseudo === "string" && P.pseudo.length > 0,
    /* Quiz du jour : les questions sans la bonne réponse tant qu'on n'y a pas répondu ; les questions déjà répondues
       aujourd'hui avec leur correction (reprise après rechargement) ; score et corrigé une fois fini */
    qj: (() => {
      const qs = quizDay(qjKey(s), ctx.today, qjDay(ctx));
      if (qs.length < QJ_LEN) return null;
      const done = s.claims.has("z|" + ctx.today);
      if (done) return { done: true, n: qs.length, score: Math.max(0, Number(s.days.get(ctx.today)?.ev.qj ?? 1) - 1), sol: qs.map((q) => ({ q: q.q, a: q.c[q.ok], e: q.e })) };
      const given = qjGiven(s, ctx.today);
      return { done: false, n: qs.length, q: qs.map((q) => ({ q: q.q, c: q.c })), given: [...given].map(([i, rep]) => ({ i, rep, ok: qs[i].ok, correct: rep === qs[i].ok, e: qs[i].e })) };
    })(),
    col, eds, shards: s.player.eclats, reflets: s.player.reflets, recent: s.player.recent, pity: s.player.pity,
    packs: { stock: r.stock, last: r.stockAt, theme: s.player.theme },
    pstats: {
      opened: s.player.opened, fiches: after("f|"), days: s.player.days, claimed: after("q|"), quiz, themes: after("t|"),
      ev, mc: Object.fromEntries(after("m|").map((k) => [k, 1])), md: [...new Set(after("m|").map((k) => k.slice(0, 10)))],
      wb: Object.fromEntries(after("w|").map((k) => [k, 1])), svc: Object.fromEntries(after("s|").map((k) => [k, 1])), qzPaid,
      colpD, first: s.player.first_day, trN: {}, trX: {}, pickN: {}, pickX: {}, reqOut: [], react: {}, gifts: [], inDay: null,
    },
    perso: {
      pseudo: s.player.pseudo, title: P.title ?? null, pantheon: P.pantheon ?? null,
      cover: P.cover ?? RULES.cosDefault.cover, sleeve: P.sleeve ?? RULES.cosDefault.sleeve, frame: P.frame ?? RULES.cosDefault.frame,
      bg: P.bg ?? RULES.cosDefault.bg, pack: P.pack ?? RULES.cosDefault.pack, inv, ad: { on: false, give: [], want: [], init: true }, v9init: true, public: false,
    },
  };
}
