/**
 * Robot R8 « rendements » (lot Z5, 10/10/2026) : analyse de chaque source, médiane, bornes, source muette, écriture
 * seulement si une donnée affichée change, aucune valeur d'une source de contrôle dans le dépôt, attribution affichée,
 * aucune valeur sans date, cohérence usine / gardien / vercel / fraîcheur.
 *
 * Fixtures (tests/fixtures/rendements/, enregistrées pendant le passage réel du 10/10/2026 à 11:46 UTC) :
 *  - lido.json : copie EXACTE de la réponse de Lido (source autorisée à l'affichage) ;
 *  - aave-usdc.json, aave-dai.json, rocketpool.json : STRUCTURE réelle (dates horaires, noms de champs, format des
 *    nombres, 168 et 167 points) mais valeurs REMPLACÉES par des valeurs synthétiques : Aave et Rocket Pool ne servent
 *    qu'au contrôle, le dépôt est public, leurs données n'y sont pas redistribuées.
 */
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import {
  AAVE_MARCHE, BORNES, CONTROLES, LIDO_URL,
  analyserAave, analyserLido, analyserRocketPool, coherent, corpsTicket, deciderLido, deciderRendements, mediane, requeteAave,
} from "@/scripts/lib/rendements.mjs";
import { TAUX_LIDO, lireControle, lireLido, lireStatutControle } from "@/lib/rendements";
import { STAKING_RATES, apyNetFournisseur, plusAncienReleve } from "@/lib/staking-rates";
import { STABLECOIN_YIELDS } from "@/lib/stablecoin-yields";
import { STAKING_PAIRS } from "@/lib/programmatic";
import TauxSource from "@/components/TauxSource";
import { ROBOTS_GARDIEN } from "@/lib/gardien";
import { POSTES } from "@/scripts/lib/usine-registre.mjs";
import { CADENCE } from "@/scripts/lib/sentinelle-robots.mjs";
import { chargerRegistre, jugerEtat, lireFamille, lireConstante, validerRegistre } from "@/scripts/lib/fraicheur-registre.mjs";
import { CHAMPS, CONSTANTES, PAGES_DATES, SEUILS, inventaireDonnees } from "@/scripts/lib/inventaire-dates.mjs";
import { SEUILS_JOURS } from "@/lib/fraicheur";

const RACINE = path.resolve(__dirname, "../..");
const FIX = path.join(RACINE, "tests", "fixtures", "rendements");
const lireFix = (n: string) => JSON.parse(readFileSync(path.join(FIX, n), "utf8"));
const LIDO = lireFix("lido.json");
const AAVE_USDC = lireFix("aave-usdc.json");
const AAVE_DAI = lireFix("aave-dai.json");
const RP = lireFix("rocketpool.json");
const MAINTENANT = "2026-10-10T11:46:15Z";
const CTX = { aujourdhui: "2026-10-10", maintenant: MAINTENANT };
const T_FIX = Date.parse(MAINTENANT);
/** autres marchés Aave v3 sur Ethereum qui ont aussi un USDC (Horizon à 7,35 % le 10/10/2026) : jamais interrogés */
const AUTRES_MARCHES = ["0xAe05Cd22df81871bc7cC2a04BeCfb516bFe332C8", "0x4e033931ad43597d96D6bcc25c280717730B58B1", "0x0AA97c284e98396202b6A04024F5E2c65026F3c0"];

const lusFixtures = () => {
  const u = analyserAave(AAVE_USDC, T_FIX);
  const d = analyserAave(AAVE_DAI, T_FIX);
  const r = analyserRocketPool(RP);
  return {
    lido: analyserLido(LIDO),
    controles: {
      "aave-usdc": { valeurPct: u.medianePct, methode: "médiane" },
      "aave-dai": { valeurPct: d.medianePct, methode: "médiane" },
      "rocketpool-reth": { valeurPct: r.valeurPct, methode: "valeur" },
    },
  };
};

/* ------------------------------------------------------------------ analyses */
describe("Lido (source affichée)", () => {
  it("réponse réelle : 7 points du 03/10 au 09/10/2026, médiane 2,238 → 2,24 %, moyenne publiée 2,2456", () => {
    const a = analyserLido(LIDO);
    expect(a.erreur).toBeUndefined();
    expect(a.points).toHaveLength(7);
    expect(a.points![0]).toEqual({ date: "2026-10-03", aprPct: 2.19 });
    expect(a.date).toBe("2026-10-09");
    expect(a.horodatage).toBe("2026-10-09T12:22:35Z");
    expect(a.medianePct).toBe(2.238);
    expect(a.valeurPct).toBe(2.24);
    expect(a.smaPct).toBe(2.2456);
    expect(mediane([3, 1, 2])).toBe(2);
    expect(mediane([4, 1, 2, 3])).toBe(2.5);
    expect(mediane([])).toBeNull();
  });

  it("structure changée, unité divisée par 100, hors bornes, trop peu de points : erreur, rien n'est retenu", () => {
    expect(analyserLido({}).erreur).toMatch(/data\.aprs/);
    expect(analyserLido({ data: { ...LIDO.data, smaApr: undefined } }).erreur).toMatch(/smaApr/);
    const fraction = { data: { aprs: LIDO.data.aprs.map((p: { timeUnix: number; apr: number }) => ({ ...p, apr: p.apr / 100 })), smaApr: LIDO.data.smaApr / 100 } };
    expect(analyserLido(fraction).erreur).toMatch(/bande plausible/); // les bornes 0-25 % ne l'auraient pas attrapé
    const horsBornes = { data: { ...LIDO.data, aprs: LIDO.data.aprs.map((p: { apr: number }, i: number) => (i === 3 ? { ...p, apr: 26 } : p)) } };
    expect(analyserLido(horsBornes).erreur).toMatch(/hors bornes/);
    expect(analyserLido({ data: { ...LIDO.data, aprs: LIDO.data.aprs.slice(0, 4) } }).erreur).toMatch(/4 point/);
    expect(analyserLido({ data: { ...LIDO.data, smaApr: 3.5 } }).erreur).toMatch(/incohérentes/);
    expect(analyserLido({ data: { ...LIDO.data, aprs: [...LIDO.data.aprs, LIDO.data.aprs[6]] } }).erreur).toMatch(/même horodatage/);
  });

  it("pièges P1 à P4 : la fenêtre « 7 jours » est vérifiée (sinon l'étiquette affichée serait fausse)", () => {
    const J = 86_400;
    const T0 = LIDO.data.aprs[6].timeUnix;
    const serie = (decalages: number[]) => {
      const aprs = decalages.map((k) => ({ timeUnix: Math.round(T0 - k * J), apr: 2.2 }));
      return { data: { aprs, smaApr: 2.2 } };
    };
    // P1 : 30 points quotidiens (fenêtre de 30 jours)
    expect(analyserLido(serie(Array.from({ length: 30 }, (_, i) => 29 - i))).erreur).toMatch(/au plus 8/);
    // P2 : 5 points
    expect(analyserLido(serie([6, 5, 3, 1, 0])).erreur).toMatch(/au moins 6/);
    // P3 : 7 points étalés sur 60 jours
    expect(analyserLido(serie([60, 50, 40, 30, 20, 10, 0])).erreur).toMatch(/h entre deux points/);
    // P4 : 7 points sur 4 jours (4 le même jour)
    expect(analyserLido(serie([3, 2.9, 2.8, 2.7, 2, 1, 0])).erreur).toMatch(/sur 4 jours seulement/);
    // 6 points quotidiens (un jour manquant en fin de fenêtre) : accepté ; trou de 2 jours au milieu : refusé
    expect(analyserLido(serie([5, 4, 3, 2, 1, 0])).erreur).toBeUndefined();
    expect(analyserLido(serie([6, 5, 4, 2, 1, 0])).erreur).toMatch(/48 h entre deux points/);
    // la réponse réelle passe : 7 jours UTC distincts, ~24 h d'écart, 6 jours d'étendue
    expect(analyserLido(LIDO).erreur).toBeUndefined();
  });
});

describe("Aave (contrôle seulement)", () => {
  it("requête : marché principal ET jeton choisis par ADRESSE, jamais les autres marchés qui ont un USDC", () => {
    const q = requeteAave(CONTROLES[0].jeton).query;
    expect(q).toContain(AAVE_MARCHE);
    expect(q).toContain("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    expect(q).toContain("window: LAST_WEEK");
    for (const m of AUTRES_MARCHES) expect(q).not.toContain(m);
    expect(q).not.toMatch(/symbol/);
    expect(() => requeteAave("USDC")).toThrow(/invalide/);
  });

  it("168 et 167 points horaires acceptés (jamais « exactement 168 ») ; médiane, pic de 01:00 sans effet", () => {
    const u = analyserAave(AAVE_USDC, T_FIX);
    expect(u.erreur).toBeUndefined();
    expect(u.points).toBe(168);
    expect(u.medianePct).toBeGreaterThan(4.3);
    expect(u.medianePct).toBeLessThan(4.7); // le pic synthétique à 8,5 % (01:00 UTC) ne déplace pas la médiane
    const d = analyserAave(AAVE_DAI, T_FIX);
    expect(d.points).toBe(167);
  });

  it("149 points, points hors bornes (exclus ; plus de 10 % = muette), série périmée, erreur GraphQL", () => {
    const h = AAVE_USDC.data.supplyAPYHistory;
    expect(analyserAave({ data: { supplyAPYHistory: h.slice(0, 149) } }, T_FIX).erreur).toMatch(/149 point/);
    const quelques = h.map((p: { date: string }, i: number) => (i < 5 ? { ...p, avgRate: { value: "0.9" } } : p));
    const q = analyserAave({ data: { supplyAPYHistory: quelques } }, T_FIX);
    expect(q.erreur).toBeUndefined();
    expect(q.exclus).toBe(5);
    const trop = h.map((p: { date: string }, i: number) => (i < 20 ? { ...p, avgRate: { value: "0.9" } } : p));
    expect(analyserAave({ data: { supplyAPYHistory: trop } }, T_FIX).erreur).toMatch(/hors bornes/);
    expect(analyserAave(AAVE_USDC, T_FIX + 5 * 86_400_000).erreur).toMatch(/trop ancien/);
    expect(analyserAave({ errors: [{ message: "Cannot query field" }] }, T_FIX).erreur).toMatch(/refuse/);
    expect(analyserAave({ data: {} }, T_FIX).erreur).toMatch(/structure/);
  });

  it("piège P10 : la série Aave doit couvrir les 7 derniers jours, pas plus de 8", () => {
    const h = AAVE_USDC.data.supplyAPYHistory as Array<{ date: string; avgRate: { value: string } }>;
    const vieux = h.map((p) => ({ ...p, date: new Date(Date.parse(p.date) - 30 * 86_400_000).toISOString() }));
    const frais = h[0]; // la série d'Aave va du plus récent au plus ancien
    expect(analyserAave({ data: { supplyAPYHistory: [frais, ...vieux] } }, T_FIX).erreur).toMatch(/fenêtre de 7 jours attendue/);
    const court = h.slice(0, 150).map((p, i) => ({ ...p, date: new Date(Date.parse(frais.date) - i * 1_800_000).toISOString() }));
    expect(analyserAave({ data: { supplyAPYHistory: court } }, T_FIX).erreur).toMatch(/jours seulement/);
  });
});

describe("Rocket Pool (contrôle seulement)", () => {
  it("chaîne de 100 décimales → nombre ; fraction (cas beaconChainAPR) refusée par la bande 0,5-10 %", () => {
    expect(analyserRocketPool(RP).valeurPct).toBe(2.1);
    expect(analyserRocketPool({ yearlyAPR: "0.027214709142343817" }).erreur).toMatch(/bande plausible/);
    expect(analyserRocketPool({ yearlyAPR: "30" }).erreur).toMatch(/hors bornes/);
    expect(analyserRocketPool({}).erreur).toMatch(/yearlyAPR/);
    expect(analyserRocketPool({ yearlyAPR: "n/a" }).erreur).toMatch(/illisible/);
  });
});

/* ------------------------------------------------------------------ décision */
describe("décision : écriture seulement si une donnée affichée change", () => {
  it("premier passage : fichier écrit (Lido + verdicts), statut ok", () => {
    const d = deciderRendements(null, lusFixtures(), CTX);
    expect(d.ecrire).toBe(true);
    expect(d.codeSortie).toBe(0);
    expect(d.contenu.lido).toMatchObject({ date: "2026-10-09", valeurPct: 2.24, methode: "mediane-7-jours", sourceUrl: LIDO_URL, precedent: null, controle: { statut: "ok" } });
    expect(d.contenu.bornes).toEqual(BORNES);
    expect(d.contenu.controles["aave-usdc"]).toMatchObject({ statut: "coherent", controleLe: "2026-10-10", affiche: { minPct: 3.8, maxPct: 6.2 } });
    expect(d.contenu.controles["aave-dai"]).toMatchObject({ statut: "ecart", controleLe: null });
    expect(d.contenu.controles["rocketpool-reth"]).toMatchObject({ statut: "ecart" });
  });

  it("même passage relu le même jour : rien à écrire (pas de commit, donc pas de déploiement)", () => {
    const actuel = deciderRendements(null, lusFixtures(), CTX).contenu;
    const d = deciderRendements(actuel, lusFixtures(), { ...CTX, maintenant: "2026-10-10T08:20:00Z" });
    expect(d.ecrire).toBe(false);
    expect(d.contenu).toBeNull();
  });

  it("nouvelle publication Lido le lendemain : écrite, l'ancienne passe en « precedent »", () => {
    const actuel = deciderRendements(null, lusFixtures(), CTX).contenu;
    const lus = lusFixtures();
    const lu = { ...lus.lido, date: "2026-10-10", horodatage: "2026-10-10T12:22:40Z", valeurPct: 2.3, medianePct: 2.3 };
    const d = deciderRendements(actuel, { ...lus, lido: lu }, { aujourdhui: "2026-10-11", maintenant: "2026-10-11T05:50:00Z" });
    expect(d.ecrire).toBe(true);
    expect(d.contenu.lido).toMatchObject({ date: "2026-10-10", valeurPct: 2.3, precedent: { date: "2026-10-09", valeurPct: 2.24 } });
  });

  /** publication Lido synthétique du jour j (1 = 10/10/2026) à la valeur v */
  const pub = (j: number, v: number) => {
    const d = new Date(Date.UTC(2026, 9, 9 + j, 12, 22, 40)).toISOString();
    return { ...analyserLido(LIDO), date: d.slice(0, 10), horodatage: d.replace(/\.\d{3}Z$/, "Z"), valeurPct: v, medianePct: v } as ReturnType<typeof analyserLido>;
  };
  const ctxJ = (j: number, extra: Record<string, unknown> = {}) => {
    const jour = new Date(Date.UTC(2026, 9, 10 + j)).toISOString().slice(0, 10);
    return { aujourdhui: jour, maintenant: `${jour}T05:50:00Z`, ...extra };
  };

  it("variation de plus de 10 % : valeur précédente gardée, refus noté en points, alerte ; même refus relu = rien de neuf", () => {
    const actuel = deciderRendements(null, lusFixtures(), CTX).contenu;
    const r = deciderLido(actuel.lido, pub(1, 3.4), ctxJ(1));
    expect(r.alerte).toMatch(/écart de 1,16 point entre le 2026-10-10 \(3,40 %\) et la valeur en place/);
    expect(r.alerte).not.toMatch(/1,16 %/); // un écart entre deux taux s'écrit en points (piège P6)
    expect(r.lido.valeurPct).toBe(2.24);
    expect(r.lido.date).toBe("2026-10-09");
    expect(r.lido.controle).toMatchObject({ statut: "variation-refusee", refuse: { date: "2026-10-10", valeurPct: 3.4, n: 1 } });
    const relu = deciderLido(r.lido, pub(1, 3.4), { ...ctxJ(1), maintenant: "2026-10-11T08:20:00Z" });
    expect(relu.lido).toBe(r.lido);
    expect(relu.alerte).toMatch(/écart/);
    // APR brut au lieu du net (+11 %) : refusé (avant : accepté sous le seuil de 1 point)
    expect(deciderLido(actuel.lido, pub(1, 2.49), ctxJ(1)).lido.controle.statut).toBe("variation-refusee");
    // variation ordinaire (+0,05 point) : acceptée, historique tenu
    const ok = deciderLido(actuel.lido, pub(1, 2.29), ctxJ(1));
    expect(ok.alerte).toBeNull();
    expect(ok.lido).toMatchObject({ valeurPct: 2.29, historique: [{ date: "2026-10-09", valeurPct: 2.24 }, { date: "2026-10-10", valeurPct: 2.29 }] });
  });

  it("piège P6 : nouveau niveau accepté seulement après 3 publications ET Rocket Pool dans le même sens, avec alerte le jour même", () => {
    const actuel = deciderRendements(null, lusFixtures(), CTX).contenu;
    const j1 = deciderLido(actuel.lido, pub(1, 9.5), ctxJ(1, { rocketPoolPct: 2.2 }));
    const j2 = deciderLido(j1.lido, pub(2, 9.6), ctxJ(2, { rocketPoolPct: 2.2 }));
    expect(j2.lido.valeurPct).toBe(2.24); // 2 publications : jamais assez (avant : 9,6 % publié en silence)
    expect(j2.alerte).toMatch(/publication 2 sur 3/);
    const j3 = deciderLido(j2.lido, pub(3, 9.55), ctxJ(3, { rocketPoolPct: 2.2 }));
    expect(j3.lido.valeurPct).toBe(2.24); // Rocket Pool reste vers 2,2 % : le saut n'est pas confirmé
    expect(j3.alerte).toMatch(/Rocket Pool ne va pas dans le même sens/);
    expect(deciderLido(j2.lido, pub(3, 9.55), ctxJ(3)).alerte).toMatch(/Rocket Pool est muet/);
    // vraie hausse du staking : Lido 3,4 / 3,5 / 3,45 et Rocket Pool à 3,3 % → acceptée au 3e jour, alerte (ticket)
    const k1 = deciderLido(actuel.lido, pub(1, 3.4), ctxJ(1, { rocketPoolPct: 3.3 }));
    const k2 = deciderLido(k1.lido, pub(2, 3.5), ctxJ(2, { rocketPoolPct: 3.3 }));
    const k3 = deciderLido(k2.lido, pub(3, 3.45), ctxJ(3, { rocketPoolPct: 3.3 }));
    expect(k3.lido).toMatchObject({ valeurPct: 3.45, date: "2026-10-12", controle: { statut: "ok" }, precedent: { date: "2026-10-09", valeurPct: 2.24 } });
    expect(k3.alerte).toMatch(/nouveau niveau accepté après 3 publications consécutives/);
    expect(k3.lido.historique.map((h: { valeurPct: number }) => h.valeurPct)).toEqual([3.4, 3.5, 3.45]);
    // le lendemain, le nouveau niveau sert de référence (pas de nouveau refus)
    expect(deciderLido(k3.lido, pub(4, 3.47), ctxJ(4)).alerte).toBeNull();
    // une publication incohérente remet le compte à 1
    const r = deciderLido(k2.lido, pub(3, 4.2), ctxJ(3, { rocketPoolPct: 3.3 }));
    expect(r.lido.controle.refuse.n).toBe(1);
  });

  it("piège P5 : dérive quotidienne refusée dès le 1er jour ; dérive lente attrapée par la médiane des valeurs retenues", () => {
    let l = deciderRendements(null, lusFixtures(), CTX).contenu.lido;
    for (let j = 1; j <= 7; j++) {
      const r = deciderLido(l, pub(j, Math.round((2.24 + 0.99 * j) * 100) / 100), ctxJ(j, { rocketPoolPct: 2.2 }));
      expect(r.lido.valeurPct, `jour ${j}`).toBe(2.24);
      expect(r.alerte, `jour ${j}`).not.toBeNull();
      l = r.lido;
    }
    // +0,2 point par jour : le 1er pas passe (moins de 10 %), le 2e s'écarte de la médiane des valeurs retenues
    let m = deciderRendements(null, lusFixtures(), CTX).contenu.lido;
    m = deciderLido(m, pub(1, 2.44), ctxJ(1)).lido;
    expect(m.valeurPct).toBe(2.44);
    const r2 = deciderLido(m, pub(2, 2.64), ctxJ(2));
    expect(r2.lido.valeurPct).toBe(2.44);
    expect(r2.alerte).toMatch(/médiane des 2 dernières valeurs retenues/);
  });

  it("pièges P8 et P11 : point daté du jour mais dans le futur refusé ; révision au même horodatage relue", () => {
    const actuel = deciderRendements(null, lusFixtures(), CTX).contenu;
    const futur = { ...pub(1, 2.25), horodatage: "2026-10-11T11:50:00Z", date: "2026-10-11" };
    const r = deciderLido(actuel.lido, futur, ctxJ(1));
    expect(r.alerte).toMatch(/futur/);
    expect(r.lido).toBe(actuel.lido);
    // révision du dernier point, médiane changée (2,24 → 2,30) : relue et acceptée, avec alerte
    const lu = analyserLido(LIDO);
    const revise = { ...lu, valeurPct: 2.3, medianePct: 2.3, points: [...lu.points!.slice(0, -1), { date: "2026-10-09", aprPct: 2.6 }] };
    const rv = deciderLido(actuel.lido, revise, { ...CTX, maintenant: "2026-10-10T12:00:00Z" });
    expect(rv.lido.valeurPct).toBe(2.3);
    expect(rv.alerte).toMatch(/révision de la publication du 2026-10-09/);
    // révision du dernier point sans effet sur la médiane : points mis à jour, sans alerte
    const memeMed = { ...lu, points: [...lu.points!.slice(0, -1), { date: "2026-10-09", aprPct: 2.239 }] };
    const rm = deciderLido(actuel.lido, memeMed, { ...CTX, maintenant: "2026-10-10T12:00:00Z" });
    expect(rm.alerte).toBeNull();
    expect(rm.lido.points.at(-1).aprPct).toBe(2.239);
  });

  it("piège P7 : fichier illisible → alerte « recréé », variation contrôlée contre la dernière version lisible", () => {
    const lus = lusFixtures();
    const ref = deciderRendements(null, lus, CTX).contenu;
    const haut = { ...lus, lido: pub(1, 9.9) };
    const avecRef = deciderRendements(ref, haut, ctxJ(1), { illisible: true, reference: "la version du commit abc1234" });
    expect(avecRef.ecrire).toBe(true);
    expect(avecRef.contenu.lido.valeurPct).toBe(2.24);
    expect(avecRef.alertes.join(" ")).toMatch(/illisible : recréé \(contrôle de variation contre la version du commit abc1234\)/);
    const sansRef = deciderRendements(null, haut, ctxJ(1), { illisible: true });
    expect(sansRef.alertes.join(" ")).toMatch(/illisible : recréé/);
    expect(sansRef.ticket.join(" ")).toMatch(/illisible/);
    // fichier illisible mais contenu identique à la référence : réécrit quand même (réparation)
    expect(deciderRendements(ref, lus, { ...CTX, maintenant: "2026-10-10T12:00:00Z" }, { illisible: true }).ecrire).toBe(true);
  });

  it("Lido muet, hors bornes ou trop ancien : valeur en place gardée avec son âge, alerte (ticket privé)", () => {
    const actuel = deciderRendements(null, lusFixtures(), CTX).contenu;
    const lus = lusFixtures();
    const muet = deciderRendements(actuel, { ...lus, lido: { erreur: "injoignable (HTTP 503)" } }, { aujourdhui: "2026-10-11", maintenant: "2026-10-11T05:50:00Z" });
    expect(muet.alertes.join(" ")).toMatch(/Lido : injoignable/);
    expect(muet.contenu?.lido ?? actuel.lido).toEqual(actuel.lido);
    const vieux = deciderLido(actuel.lido, analyserLido(LIDO), { aujourdhui: "2026-10-13", maintenant: "2026-10-13T05:50:00Z" });
    expect(vieux.alerte).toMatch(/4 jours, maximum 3/);
    expect(vieux.lido).toBe(actuel.lido);
    expect(deciderLido(null, analyserLido(LIDO), { aujourdhui: "2026-10-08", maintenant: "2026-10-08T05:50:00Z" }).alerte).toMatch(/futur/);
    const horsBornes = analyserLido({ data: { ...LIDO.data, aprs: LIDO.data.aprs.map((p: { apr: number }) => ({ ...p, apr: 30 })), smaApr: 30 } });
    expect(deciderLido(actuel.lido, horsBornes, CTX).lido).toBe(actuel.lido);
  });

  it("contrôles : cohérent (date du jour), écart (ticket à l'apparition puis tous les 7 jours, une seule fois par jour), source muette", () => {
    expect(coherent(4.18, { minPct: 3.8, maxPct: 6.2 })).toBe(true);
    expect(coherent(3.54, { minPct: 4.0, maxPct: 7.5 })).toBe(false);
    expect(coherent(3.71, { minPct: 4.0, maxPct: 7.5 })).toBe(true); // tolérance 0,3 point
    const j1 = deciderRendements(null, lusFixtures(), CTX);
    expect(j1.alertes.filter((a: string) => /écart/.test(a))).toHaveLength(2);
    // samedi 11/10 : écart déjà signalé → pas d'alerte (le robot n'est pas rouge chaque jour)
    const lus = lusFixtures();
    const j2 = deciderRendements(j1.contenu, lus, { aujourdhui: "2026-10-11", maintenant: "2026-10-11T05:50:00Z" });
    expect(j2.alertes.filter((a: string) => /écart/.test(a))).toHaveLength(0);
    expect(j2.resume.join(" ")).toMatch(/ticket déjà ouvert/);
    // lundi 12/10 : plus de rappel du lundi (piège P9 : jusqu'à 4 passages rouges le même jour)
    const j3 = deciderRendements(j2.contenu ?? j1.contenu, lus, { aujourdhui: "2026-10-12", maintenant: "2026-10-12T05:50:00Z" });
    expect(j3.alertes.filter((a: string) => /écart/.test(a))).toHaveLength(0);
    // 17/10 (7 jours après le signalement) : rappel une fois, rappeleLe noté ; le filet du même jour ne rappelle pas
    const j8 = deciderRendements(j3.contenu ?? j2.contenu ?? j1.contenu, lus, { aujourdhui: "2026-10-17", maintenant: "2026-10-17T05:50:00Z" });
    expect(j8.alertes.filter((a: string) => /écart/.test(a))).toHaveLength(2);
    expect(j8.contenu.controles["aave-dai"]).toMatchObject({ statut: "ecart", depuis: "2026-10-10", rappeleLe: "2026-10-17" });
    const j8b = deciderRendements(j8.contenu, lus, { aujourdhui: "2026-10-17", maintenant: "2026-10-17T08:20:00Z" });
    expect(j8b.alertes.filter((a: string) => /écart/.test(a))).toHaveLength(0);
    // Aave muet : verdict « source-muette », dernier contrôle cohérent gardé, alerte
    const muet = deciderRendements(j1.contenu, { ...lus, controles: { ...lus.controles, "aave-usdc": { erreur: "injoignable" } } }, { aujourdhui: "2026-10-11", maintenant: "2026-10-11T05:50:00Z" });
    expect(muet.contenu.controles["aave-usdc"]).toMatchObject({ statut: "source-muette", controleLe: "2026-10-10" });
    expect(muet.alertes.join(" ")).toMatch(/Aave USDC : source muette/);
  });

  it("valeur du site changée : ancien verdict périmé (jamais une date de contrôle pour une autre valeur)", () => {
    const j1 = deciderRendements(null, lusFixtures(), CTX).contenu;
    const ancien = { ...j1, controles: { ...j1.controles, "aave-usdc": { ...j1.controles["aave-usdc"], affiche: { minPct: 3, maxPct: 5 }, controleLe: "2026-09-01" } } };
    const lus = lusFixtures();
    const d = deciderRendements(ancien, { ...lus, controles: { ...lus.controles, "aave-usdc": { erreur: "muette" } } }, CTX);
    expect(d.contenu.controles["aave-usdc"]).toMatchObject({ statut: "source-muette", controleLe: null, affiche: { minPct: 3.8, maxPct: 6.2 } });
    expect(lireControle(j1, "aave-usdc", { minPct: 3.8, maxPct: 6.2 })).toBe("2026-10-10");
    expect(lireControle(j1, "aave-usdc", { minPct: 3.9, maxPct: 6.2 })).toBeNull();
    expect(lireControle(j1, "aave-dai", { minPct: 4, maxPct: 7.5 })).toBeNull(); // écart : pas de date de contrôle
  });

  it("toutes les sources en échec : code 2, rien d'écrit ; Lido jamais lu : aucun fichier sans la source affichée", () => {
    const rien = { lido: { erreur: "x" }, controles: { "aave-usdc": { erreur: "x" }, "aave-dai": { erreur: "x" }, "rocketpool-reth": { erreur: "x" } } };
    const d = deciderRendements(null, rien, CTX);
    expect(d.codeSortie).toBe(2);
    expect(d.ecrire).toBe(false);
    const lus = lusFixtures();
    const sansLido = deciderRendements(null, { ...lus, lido: { erreur: "x" } }, CTX);
    expect(sansLido.ecrire).toBe(false);
    expect(sansLido.codeSortie).toBe(0);
  });
});

/* ------------------------------------------------------------------ dépôt public : aucune valeur de contrôle */
const nombres = (o: unknown, chemin = ""): Array<[string, number]> => {
  if (typeof o === "number") return [[chemin, o]];
  if (Array.isArray(o)) return o.flatMap((x, i) => nombres(x, `${chemin}[${i}]`));
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => nombres(v, chemin ? `${chemin}.${k}` : k));
  return [];
};

describe("aucune valeur d'Aave ni de Rocket Pool dans le contenu écrit ni dans le résumé public", () => {
  it("contenu : les seuls nombres hors de « lido » sont les bornes et les valeurs AFFICHÉES par le site ; résumé sans valeur", () => {
    const lus = lusFixtures();
    const d = deciderRendements(null, lus, CTX);
    const hors = nombres(d.contenu).filter(([c]) => !c.startsWith("lido.") && c !== "version");
    for (const [c] of hors) expect(c, c).toMatch(/^(bornes\.(minPct|maxPct)|controles\.[a-z-]+\.affiche\.(minPct|maxPct))$/);
    const texte = JSON.stringify(d.contenu) + d.resume.join("\n");
    for (const v of Object.values(lus.controles)) {
      const x = (v as { valeurPct: number }).valeurPct;
      for (const n of [2, 3]) {
        expect(texte).not.toContain(x.toFixed(n));
        expect(texte).not.toContain(x.toFixed(n).replace(".", ","));
      }
    }
    // le ticket privé, lui, porte les valeurs
    expect(corpsTicket(d, CTX)).toMatch(/source \(.+\) : \d+,\d{3} %/);
  });

  it("data/rendements.json commité : Lido dans les bornes et daté, aucun champ de valeur sous « controles »", () => {
    const j = JSON.parse(readFileSync(path.join(RACINE, "data", "rendements.json"), "utf8"));
    expect(j.version).toBe(1);
    expect(j.lido.valeurPct).toBeGreaterThanOrEqual(BORNES.minPct);
    expect(j.lido.valeurPct).toBeLessThanOrEqual(BORNES.maxPct);
    expect(j.lido.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(j.lido.sourceUrl).toBe(LIDO_URL);
    for (const [id, c] of Object.entries(j.controles) as [string, Record<string, unknown>][]) {
      expect(Object.keys(c).sort(), id).toEqual(["affiche", "controleLe", "depuis", "ligne", "rappeleLe", "source", "statut"]);
      expect(["coherent", "ecart", "source-muette"]).toContain(c.statut);
    }
    expect(["ok", "variation-refusee"]).toContain(j.lido.controle.statut);
    expect(lireLido(j)).not.toBeNull();
  });

  it("fixtures du dépôt : seule celle de Lido est une copie brute (celles d'Aave et de Rocket Pool sont synthétiques)", () => {
    expect(readdirSync(FIX).sort()).toEqual(["aave-dai.json", "aave-usdc.json", "lido.json", "rocketpool.json"]);
    // valeurs synthétiques : toutes les valeurs Aave hors pic sont sur une grille de 0,05 point, le pic est fixe
    for (const p of AAVE_USDC.data.supplyAPYHistory) {
      const v = Number(p.avgRate.value) * 10_000;
      expect(Math.abs(v - Math.round(v)), p.date).toBeLessThan(1e-6);
    }
    expect(RP.yearlyAPR).toMatch(/^2\.10+$/);
  });
});

/* ------------------------------------------------------------------ script, rejeu sans réseau */
describe("script scripts/rendements.mjs (rejeu sur les fixtures, sans réseau)", () => {
  const passer = (args: string[], env: Record<string, string> = {}) => {
    try {
      const out = execFileSync(process.execPath, ["scripts/rendements.mjs", ...args], { cwd: RACINE, env: { ...process.env, GITHUB_STEP_SUMMARY: "", ...env }, stdio: "pipe" }).toString();
      return { code: 0, out };
    } catch (e) {
      const err = e as { status?: number; stdout?: Buffer };
      return { code: err.status ?? -1, out: String(err.stdout ?? "") };
    }
  };

  it("1er passage changed=true, 2e passage changed=false ; ticket privé écrit hors dépôt ; sortie publique sans valeur de contrôle", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "rendements-"));
    const sortie = path.join(dir, "r.json");
    const ticket = path.join(dir, "ticket.md");
    const o1 = path.join(dir, "o1.txt");
    const p1 = passer([`--fixtures=${FIX}`, `--maintenant=${MAINTENANT}`, `--sortie=${sortie}`, `--ticket=${ticket}`], { GITHUB_OUTPUT: o1 });
    expect(p1.code).toBe(0);
    expect(readFileSync(o1, "utf8")).toMatch(/changed=true/);
    expect(readFileSync(o1, "utf8")).toMatch(/alerte=true/); // écarts synthétiques (DAI, Rocket Pool)
    const j = JSON.parse(readFileSync(sortie, "utf8"));
    expect(j.lido).toMatchObject({ date: "2026-10-09", valeurPct: 2.24 });
    expect(readFileSync(ticket, "utf8")).toMatch(/Rocket Pool rETH\*\* : écart/);
    expect(p1.out).not.toMatch(/2,100|2\.100|3,30|3\.30/);
    const o2 = path.join(dir, "o2.txt");
    writeFileSync(o2, "");
    const p2 = passer([`--fixtures=${FIX}`, `--maintenant=2026-10-10T12:00:00Z`, `--sortie=${sortie}`], { GITHUB_OUTPUT: o2 });
    expect(p2.code).toBe(0);
    expect(readFileSync(o2, "utf8")).not.toMatch(/changed=true/);
  });

  it("toutes les sources illisibles : code 2, rien n'est écrit", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "rendements-vide-"));
    const vide = path.join(dir, "fixtures");
    mkdirSync(vide);
    writeFileSync(path.join(vide, "lido.json"), "<html>maintenance</html>");
    const sortie = path.join(dir, "r.json");
    const p = passer([`--fixtures=${vide}`, `--maintenant=${MAINTENANT}`, `--sortie=${sortie}`], { GITHUB_OUTPUT: "" });
    expect(p.code).toBe(2);
    expect(existsSync(sortie)).toBe(false);
  });

  it("piège P7 rejoué : fichier en place tronqué → réécrit, alerte, ticket qui le dit (jamais un premier passage silencieux)", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "rendements-illisible-"));
    const sortie = path.join(dir, "r.json");
    const ticket = path.join(dir, "ticket.md");
    writeFileSync(sortie, '{"version":1,"lido":');
    const o = path.join(dir, "o.txt");
    const p = passer([`--fixtures=${FIX}`, `--maintenant=${MAINTENANT}`, `--sortie=${sortie}`, `--ticket=${ticket}`], { GITHUB_OUTPUT: o });
    expect(p.code).toBe(0);
    expect(readFileSync(o, "utf8")).toMatch(/changed=true/);
    expect(readFileSync(o, "utf8")).toMatch(/alerte=true/);
    expect(readFileSync(ticket, "utf8")).toMatch(/illisible : recréé/);
    expect(p.out).toMatch(/illisible : recréé/);
    expect(JSON.parse(readFileSync(sortie, "utf8")).lido.valeurPct).toBe(2.24);
  });

  it("une seule source muette (Rocket Pool absent) : le reste est écrit, alerte, code 0", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "rendements-rp-"));
    const fx = path.join(dir, "fixtures");
    mkdirSync(fx);
    for (const f of ["lido.json", "aave-usdc.json", "aave-dai.json"]) copyFileSync(path.join(FIX, f), path.join(fx, f));
    const sortie = path.join(dir, "r.json");
    const o = path.join(dir, "o.txt");
    const p = passer([`--fixtures=${fx}`, `--maintenant=${MAINTENANT}`, `--sortie=${sortie}`], { GITHUB_OUTPUT: o });
    expect(p.code).toBe(0);
    expect(readFileSync(o, "utf8")).toMatch(/alerte=true/);
    expect(JSON.parse(readFileSync(sortie, "utf8")).controles["rocketpool-reth"].statut).toBe("source-muette");
  });
});

/* ------------------------------------------------------------------ affichage */
describe("affichage : attribution et aucune valeur sans date", () => {
  it("lib/rendements.ts : fichier valide → APR de Lido daté ; corrompu, hors bornes, date invalide → null", () => {
    expect(TAUX_LIDO).not.toBeNull();
    expect(TAUX_LIDO!.source.nom).toBe("Lido");
    const j = JSON.parse(readFileSync(path.join(RACINE, "data", "rendements.json"), "utf8"));
    expect(lireLido(null)).toBeNull();
    expect(lireLido({ lido: { ...j.lido, valeurPct: 26 } })).toBeNull();
    expect(lireLido({ lido: { ...j.lido, valeurPct: "2,24" } })).toBeNull();
    expect(lireLido({ lido: { ...j.lido, date: "2026-02-31x" } })).toBeNull();
    expect(lireLido({ lido: { ...j.lido, methode: "moyenne" } })).toBeNull();
  });

  it("<TauxSource> : valeur, « médiane sur 7 jours au JJ/MM/AAAA », « Source : Lido », jamais « au le »", () => {
    const html = renderToStaticMarkup(createElement(TauxSource, { taux: { valeurPct: 2.24, date: "2026-10-09", horodatage: "2026-10-09T12:22:35Z", source: { nom: "Lido", url: "https://lido.fi", doc: "x" }, methode: "mediane-7-jours" }, libelle: "Repère" }));
    const texte = html.replace(/<[^>]+>/g, "");
    expect(texte).toContain("Repère : 2,24 % · Taux variable, médiane sur 7 jours au 09/10/2026 · Source : Lido");
    expect(texte).not.toMatch(/au le/);
    expect(html).toContain('data-verifie-le="2026-10-09"');
    expect(html).toContain('href="https://lido.fi"');
  });

  it("calculateur : ligne Lido = valeur du fichier, frais NON retirés une 2e fois ; autres lignes datées (T1 2026)", () => {
    const eth = STAKING_RATES.find((c) => c.id === "ethereum")!;
    const lido = eth.providers.find((p) => p.provider === "Lido (stETH)")!;
    expect(lido.apy).toBe(TAUX_LIDO!.valeurPct);
    expect(lido.apyNet).toBe(true);
    expect(lido.taux?.date).toBe(TAUX_LIDO!.date);
    expect(apyNetFournisseur(lido)).toBe(lido.apy);
    expect(apyNetFournisseur({ apy: 3, feePct: 10 })).toBeCloseTo(2.7, 10);
    for (const c of STAKING_RATES) for (const p of c.providers) expect(!!p.taux || !!p.releve?.debut, `${c.id} / ${p.provider}`).toBe(true);
    expect(plusAncienReleve(eth.providers)).toEqual({ debut: "2026-01", texte: "T1 2026" });
  });

  it("calculateur rendu (ETH par défaut) : ligne Lido « APR net » datée, frais non retirés 2 fois, chaque ligne datée, espace après « nets »", async () => {
    const { default: Calculateur } = await import("@/components/CalculateurApyStaking");
    const jourLido = TAUX_LIDO!.date.split("-").reverse().join("/");
    const lendemain = Date.parse(`${TAUX_LIDO!.date}T00:00:00Z`) + 86_400_000;
    const rendre = (maintenant?: number) =>
      renderToStaticMarkup(createElement(Calculateur, { maintenant })).replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");
    const texte = rendre(lendemain);
    const v = TAUX_LIDO!.valeurPct.toFixed(2).replace(".", ",");
    expect(texte).toContain(`Lido (stETH) Liquid staking ${v} % APR net, frais déduits au ${jourLido} 10 %`);
    expect(texte).toContain(`Lido (stETH), APR net de sa commission : ${v} % · Taux variable, médiane sur 7 jours au ${jourLido} · Source : Lido`);
    expect(texte).toContain("Autres APY indicatifs relevés au T1 2026");
    expect(texte).toContain("Validateur direct (32 ETH) Staking direct 3,40 % brut relevé au T1 2026");
    expect(texte).toContain("APR, APY, médiane, stETH : que signifient ces termes ?");
    expect(texte).not.toMatch(/au le /);
    // encadré (juré droit D3) : seulement sur un taux daté de moins de 14 jours, jamais le validateur direct (32 ETH)
    expect(texte).toContain(`Estimation sur un taux daté Lido (stETH) — APR net ${v} % au ${jourLido}`);
    expect(texte).toMatch(/vous toucheriez environ \S+ € nets \(frais de 10 % déjà déduits par la source\) : estimation, taux variable, non garanti/);
    expect(texte).not.toMatch(/nets\(/); // régression « nets(frais » du lot (juré visiteur 1)
    expect(texte).not.toMatch(/Meilleur rendement|vous touchez/);
    expect(rendre(lendemain + 20 * 86_400_000)).not.toMatch(/Estimation sur un taux daté/);
    expect(rendre(undefined)).not.toMatch(/Validateur direct \(32 ETH\) — /);
    // Rocket Pool : en écart → aucun pourcentage, aucune récompense, hors classement ; cohérent → date de contrôle
    const j = JSON.parse(readFileSync(path.join(RACINE, "data", "rendements.json"), "utf8"));
    const statut = lireStatutControle(j, "rocketpool-reth", { minPct: 2.494, maxPct: 2.494 });
    const lignes = renderToStaticMarkup(createElement(Calculateur, { maintenant: lendemain }))
      .split(/<tr[^>]*>/)
      .filter((l) => /<td/.test(l))
      .map((l) => l.split("</tr>")[0])
      .map((l) => l.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim());
    const iRp = lignes.findIndex((l) => l.startsWith("Rocket Pool (rETH)"));
    expect(iRp).toBeGreaterThan(-1);
    if (statut === "ecart") {
      const ligneRp = lignes[iRp];
      expect(ligneRp).toContain("Taux en cours de vérification : consultez le protocole");
      expect(ligneRp).not.toMatch(/\d+,\d+ %/);
      expect(ligneRp).not.toMatch(/€/);
      expect(iRp).toBe(lignes.length - 1); // hors classement : en dernier
      expect(texte).not.toMatch(/Rocket Pool \(rETH\) : taux net contrôlé/);
    }
    if (!lireControle(j, "rocketpool-reth", { minPct: 2.494, maxPct: 2.494 })) expect(texte).not.toMatch(/Rocket Pool \(rETH\) : taux net contrôlé/);
  });

  it("une ligne en écart n'affiche aucun pourcentage (statut lu sans aucune valeur de la source de contrôle)", () => {
    const base = deciderRendements(null, lusFixtures(), CTX).contenu;
    expect(lireStatutControle(base, "aave-dai", { minPct: 4, maxPct: 7.5 })).toBe("ecart");
    expect(lireStatutControle(base, "aave-usdc", { minPct: 3.8, maxPct: 6.2 })).toBe("coherent");
    expect(lireStatutControle(base, "aave-dai", { minPct: 3.5, maxPct: 4 })).toBeNull(); // ligne corrigée : verdict périmé
    // rendu des lignes : page yield-stablecoins (texte serveur) et calculateur (test ci-dessus)
    const src = readFileSync(path.join(RACINE, "app/outils/yield-stablecoins/page.tsx"), "utf8");
    expect(src).toMatch(/statutControle\(y\.controle/);
    expect(src).toMatch(/y\.enVerification \? \(\s*<span[^>]*>\s*Taux en cours de vérification : consultez le protocole/);
  });

  it("aucune valeur sans date : chaque rendement de stablecoin et chaque fourchette de /staking ont une date de relevé", () => {
    for (const y of STABLECOIN_YIELDS) expect(y.releveLe, `${y.platformName} ${y.stablecoin}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const p of STAKING_PAIRS) expect(p.releve, p.cryptoId).toMatch(/^\d{4}-\d{2}(-\d{2})?$/);
    // offres « Earn » USDC / EURC retirées (MiCA, guide du site) ; Kraken USDT retiré (absent chez Kraken le 10/10/2026)
    expect(STABLECOIN_YIELDS.filter((y) => y.productType === "Earn" && (y.stablecoin === "USDC" || y.stablecoin === "EURC"))).toEqual([]);
    expect(STABLECOIN_YIELDS.find((y) => y.platformId === "kraken")).toBeUndefined();
    // reprise Z5 (juré droit D1) : plus aucune offre USDT (jeton sans émetteur agréé dans l'UE, déclaration ESMA du 17/01/2025)
    expect(STABLECOIN_YIELDS.filter((y) => y.stablecoin === "USDT")).toEqual([]);
    expect(STABLECOIN_YIELDS.filter((y) => y.regulation === "MiCA")).toEqual([]);
  });

  it("allégations exactes : plus de « chaque taux avec sa date » sans date par ligne, plus d'USDT dans le titre ni de contrôle attribué à Aave", () => {
    const yieldSrc = readFileSync(path.join(RACINE, "app/outils/yield-stablecoins/page.tsx"), "utf8");
    expect(yieldSrc).toMatch(/<VerifieLe date=\{y\.releveLe\}/); // la date est bien rendue sous chaque taux
    expect(yieldSrc).not.toMatch(/USDT, USDC|USDT", "USDC/);
    expect(yieldSrc).not.toMatch(/médiane Aave|médiane d'Aave/);
    const calcSrc = readFileSync(path.join(RACINE, "app/outils/calculateur-apy-staking/page.tsx"), "utf8");
    expect(calcSrc).not.toMatch(/âge affiché sous le tableau/);
    const slug = readFileSync(path.join(RACINE, "app/staking/[slug]/page.tsx"), "utf8");
    expect(slug).not.toMatch(/APY moyen de/);
    expect(slug).not.toMatch(/Hors fiscalité \(PFU 31,4% à la cession\)/);
    expect(readFileSync(path.join(RACINE, "components/StakingComparator.tsx"), "utf8")).not.toMatch(/label="APY (moyen|max)"/);
  });

  it("table CONTROLES = valeurs affichées par le site (quand une session corrige une ligne, elle met la table à jour)", () => {
    const parId = Object.fromEntries(CONTROLES.map((c: { id: string; affiche: unknown }) => [c.id, c.affiche]));
    for (const y of STABLECOIN_YIELDS.filter((x) => x.controle)) expect(parId[y.controle!], y.controle).toEqual({ minPct: y.apyMin, maxPct: y.apyMax });
    expect(STABLECOIN_YIELDS.filter((x) => x.controle).map((x) => x.controle).sort()).toEqual(["aave-dai", "aave-usdc"]);
    const rp = STAKING_RATES.find((c) => c.id === "ethereum")!.providers.find((p) => p.provider === "Rocket Pool (rETH)")!;
    const net = Math.round(apyNetFournisseur(rp) * 1000) / 1000;
    expect(parId["rocketpool-reth"]).toEqual({ minPct: net, maxPct: net });
  });

  it("plus aucune date globale écrite à la main pour les rendements", () => {
    for (const f of ["lib/stablecoin-yields.ts", "lib/staking-rates.ts", "app/staking/page.tsx", "app/outils/yield-stablecoins/page.tsx", "app/outils/calculateur-apy-staking/page.tsx", "components/CalculateurApyStaking.tsx"]) {
      const src = readFileSync(path.join(RACINE, f), "utf8");
      expect(src, f).not.toMatch(/STABLECOIN_YIELDS_LAST_UPDATED|STAKING_PAIRS_RELEVE|STAKING_RATES_PERIODE/);
    }
    expect(readFileSync(path.join(RACINE, "app/staking/[slug]/page.tsx"), "utf8")).not.toMatch(/en avril 2026/);
    expect(readFileSync(path.join(RACINE, "app/outils/calculateur-apy-staking/page.tsx"), "utf8")).not.toMatch(/eth\.ethereum\.org/);
  });
});

/* ------------------------------------------------------------------ cohérence des déclarations */
describe("déclarations : Gardien, vercel.json, Usine, sentinelle, registre de fraîcheur, inventaire", () => {
  it("Gardien 05:50 UTC = vercel.json = filet du workflow ; poste de l'Usine ; cadence de la sentinelle", () => {
    const r = ROBOTS_GARDIEN.find((x) => x.cle === "rendements")!;
    expect(r).toMatchObject({ workflow: "rendements.yml", horaire: "50 5 * * *", inputs: {} });
    const vercel = JSON.parse(readFileSync(path.join(RACINE, "vercel.json"), "utf8"));
    expect(vercel.crons).toContainEqual({ path: "/api/cron/gardien/rendements", schedule: "50 5 * * *" });
    const poste = (POSTES as Array<Record<string, unknown>>).find((p) => p.id === "rendements")!;
    expect(poste).toMatchObject({ moteur: "github", workflow: "rendements.yml", gardien: ["rendements"], horaire: "50 5 * * *", ageMaxH: 30 });
    expect(CADENCE).toContainEqual(["rendements.yml", expect.any(String), 30]);
  });

  it("workflow : bash (pipefail), tests + tsc AVANT le commit, ticket privé avec always(), résumé public sans valeur", () => {
    const brut = readFileSync(path.join(RACINE, ".github/workflows/rendements.yml"), "utf8");
    const wf = parse(brut);
    const job = wf.jobs.rendements;
    expect(job.defaults.run.shell).toBe("bash");
    const steps: Array<Record<string, string>> = job.steps;
    const iTests = steps.findIndex((s) => /vitest run tests\/lib\/rendements\.test\.ts/.test(s.run ?? "") && /tsc --noEmit/.test(s.run ?? ""));
    const iCommit = steps.findIndex((s) => /git commit/.test(s.run ?? ""));
    expect(iTests).toBeGreaterThan(-1);
    expect(iCommit).toBeGreaterThan(iTests);
    expect(steps[iCommit].run).toMatch(/git add data\/rendements\.json\n/);
    const lecture = steps.find((s) => s.id === "r")!;
    expect(lecture.run).toContain('--ticket="$RUNNER_TEMP/rendements-ticket.md"');
    const ticket = steps.find((s) => /Ticket/.test(s.name ?? ""))!;
    expect(ticket.if).toMatch(/^always\(\)/);
    // le fichier du ticket (valeurs de contrôle) n'est jamais recopié dans le résumé public ni commité
    for (const s of steps) if (/GITHUB_STEP_SUMMARY/.test(s.run ?? "")) expect(s.run).not.toMatch(/rendements-ticket/);
    expect(brut).not.toMatch(/git add [^\n]*ticket/);
  });

  it("registre de fraîcheur : n° 32 et 33 = lignes éditoriales (la plus ancienne) ; n° 54 = état du robot R8 dans l'icône", async () => {
    const reg = chargerRegistre(RACINE);
    expect(validerRegistre(reg)).toEqual([]);
    const f32 = reg.familles.find((f: { id: string }) => f.id === "32");
    const f33 = reg.familles.find((f: { id: string }) => f.id === "33");
    const f54 = reg.familles.find((f: { id: string }) => f.id === "54");
    expect(JSON.stringify(f32.lecture)).not.toContain("data/rendements.json");
    expect(JSON.stringify(f33.lecture)).not.toContain("data/rendements.json");
    expect(f54).toMatchObject({ ageMaxH: 48, critiqueH: 96, lecture: { methode: "fichier", fichier: "data/rendements.json", chemin: "lido.horodatage" } });
    // racine temporaire : vraies sources du site + data/rendements.json issu des fixtures (le fichier commité change
    // chaque jour : ce test, lancé par le robot avant son commit, ne doit pas dépendre de la valeur du jour)
    const racine = mkdtempSync(path.join(tmpdir(), "rendements-registre-"));
    mkdirSync(path.join(racine, "lib"));
    mkdirSync(path.join(racine, "data"));
    for (const f of ["lib/stablecoin-yields.ts", "lib/programmatic.ts", "lib/staking-rates.ts"]) copyFileSync(path.join(RACINE, f), path.join(racine, f));
    writeFileSync(path.join(racine, "data", "rendements.json"), JSON.stringify(deciderRendements(null, lusFixtures(), CTX).contenu));
    const now = Date.parse("2026-10-11T06:00:00Z");
    const l32 = await lireFamille(f32, { root: racine, now });
    expect(l32.erreur).toBeUndefined();
    expect(l32.date).toBe("2026-05-02");
    const l33 = await lireFamille(f33, { root: racine, now });
    expect(l33.erreur).toBeUndefined();
    expect(l33.date).toBe("2026-01");
    // n° 54 : l'icône suit le robot (juré fiabilité 4) — sain mais écarts connus = ⚠️, sans écart = ✅, arrêté = ❌
    const l54 = await lireFamille(f54, { root: racine, now });
    expect(l54.erreur).toBeUndefined();
    expect(l54.raison).toMatch(/Rocket Pool/);
    expect(l54.raison).toMatch(/Aave DAI/);
    expect(jugerEtat(f54, l54, now).etat).toBe("attention");
    const sain = deciderRendements(null, lusFixtures(), CTX).contenu;
    for (const id of ["aave-dai", "rocketpool-reth"]) sain.controles[id].statut = "coherent";
    writeFileSync(path.join(racine, "data", "rendements.json"), JSON.stringify(sain));
    expect(jugerEtat(f54, await lireFamille(f54, { root: racine, now }), now).etat).toBe("ok");
    const tard = Date.parse("2026-10-14T06:00:00Z");
    expect(jugerEtat(f54, await lireFamille(f54, { root: racine, now: tard }), tard).etat).toBe("defaut");
    const unJour = Date.parse("2026-10-11T14:00:00Z"); // 49,6 h après le point Lido (passage manqué)
    expect(jugerEtat(f54, await lireFamille(f54, { root: racine, now: unJour }), unJour).etat).toBe("attention");
    // et sur le vrai dépôt : les trois familles se lisent (sans juger la valeur du jour)
    for (const f of [f32, f33, f54]) expect((await lireFamille(f, { root: RACINE, now: Date.now() })).erreur, f.id).toBeUndefined();
    // « tous » : toutes les dates d'un fichier source, la plus ancienne
    expect(lireConstante(RACINE, { fichier: "lib/programmatic.ts", motif: 'releve:\\s*"([\\d-]+)"', tous: true, mode: "plusAncienne" })).toMatchObject({ date: "2026-04" });
  });

  it("inventaire des dates : une date par ligne (drapeau g), fichier du robot lu, seuils inchangés, /staking/ethereum suivie", () => {
    expect(SEUILS).toEqual(SEUILS_JOURS);
    expect(CHAMPS).toContainEqual(["data/rendements.json", "lido.date", "rendements"]);
    for (const c of CONSTANTES.filter((x) => /stablecoin-yields|programmatic|staking-rates/.test(String(x[0])))) expect((c[1] as RegExp).global).toBe(true);
    const inv = inventaireDonnees(RACINE, Date.parse("2026-10-11T06:00:00Z"));
    const ligne = (debut: string) => inv.find((l: { champ: string }) => l.champ.startsWith(debut))!;
    expect(ligne("lib/stablecoin-yields.ts").total).toBe(STABLECOIN_YIELDS.length);
    expect(ligne("lib/programmatic.ts").total).toBe(STAKING_PAIRS.length);
    expect(ligne("data/rendements.json").total).toBe(1);
    expect(PAGES_DATES).toContain("/staking/ethereum");
  });
});
