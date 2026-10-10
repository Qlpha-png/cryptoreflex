/**
 * Lot Z6 (10/10/2026) — robot R12 « scores » :
 *  - le barème copié pour Node (scripts/lib/scores-plateformes.mjs) est identique à lib/scoring.ts (poids, bonus, courbe du
 *    catalogue, plateformes multi-actifs, note globale) ;
 *  - `lastScored` = date la plus récente des ENTRÉES DE DONNÉES qui ont servi, jamais l'heure du robot ;
 *  - le robot n'écrit que si les scores ou la date changent, et refuse tant que des notes enregistrées ne respectent pas la formule ;
 *  - workflow : déclenché par un push sur data/platforms.json, tests + tsc avant commit, push ×3, ticket privé.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { MULTI_ASSET_BROKER_IDS as TS_MULTI, SCORING_WEIGHTS as TS_POIDS, computeCatalogueScore as tsCatalogue, computeGlobalScore as tsGlobal } from "@/lib/scoring";
import {
  FORMULE,
  MULTI_ASSET_BROKER_IDS,
  SCORING_WEIGHTS,
  computeCatalogueScore,
  computeGlobalScore,
  datesDonnees,
  decider,
  etatCoherent,
  lastScoredDe,
  recalculerJeu,
  recalculerPlateforme,
} from "@/scripts/lib/scores-plateformes.mjs";

const RACINE = path.resolve(__dirname, "../..");
const lire = (p: string) => readFileSync(path.join(RACINE, p), "utf8");
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- arbre YAML libre
type Yaml = any;

/** plateforme d'essai cohérente avec la formule */
function plateforme(id: string, over: Record<string, unknown> = {}) {
  const base = {
    id,
    cryptos: { totalCount: 200, stakingAvailable: true },
    deposit: { methods: ["a", "b", "c", "d", "e"] },
    fees: { verified: { date: "2026-10-05" }, cost: { date: "2026-10-04" } },
    mica: { lastVerified: "2026-10-02" },
    security: { verified: "2026-10-07" },
    support: { verified: "2026-10-06" },
    scoring: { global: 0, fees: 4, security: 4.5, ux: 4, support: 3.5, mica: 4.5, catalogue: 0 },
    ...over,
  };
  const sc = recalculerPlateforme(base);
  return { ...base, scoring: sc };
}
const jeu = (platforms: ReturnType<typeof plateforme>[], meta: Record<string, unknown> = {}) => ({ _meta: { lastScored: "2026-09-01", scoringFormula: FORMULE, ...meta }, platforms });

describe("le barème de Node est identique à lib/scoring.ts", () => {
  it("poids, formule affichée, plateformes multi-actifs", () => {
    expect(SCORING_WEIGHTS).toEqual(TS_POIDS);
    expect([...MULTI_ASSET_BROKER_IDS].sort()).toEqual([...TS_MULTI].sort());
    expect(Object.values(SCORING_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(FORMULE).toBe("global = 0.20·fees + 0.25·security + 0.20·mica + 0.15·ux + 0.10·support + 0.10·catalogue");
    expect(lire("app/methodologie/page.tsx")).toMatch(/20 ?%/); // la méthodologie publie bien des pondérations
  });

  it("courbe du catalogue et bonus : mêmes résultats sur une grille de cas", () => {
    for (const n of [0, 10, 30, 31, 65, 100, 101, 200, 300, 301, 400, 500, 501, 600, 700, 701, 2000]) {
      for (const staking of [false, true]) {
        for (const pm of [0, 4, 5, 9]) {
          for (const multi of [false, true]) {
            const inp = { totalCryptos: n, stakingAvailable: staking, paymentMethodsCount: pm, isMultiAssetBroker: multi };
            expect(computeCatalogueScore(inp), JSON.stringify(inp)).toBe(tsCatalogue(inp));
          }
        }
      }
    }
  });

  it("note globale : mêmes résultats, exemple Bitpanda de la méthodologie", () => {
    const sub = { fees: 3.0, security: 4.7, mica: 4.9, ux: 4.6, support: 4.2, catalogue: 5.0 };
    expect(computeGlobalScore(sub)).toBe(tsGlobal(sub));
    expect(computeGlobalScore(sub)).toBe(4.4);
    for (const a of [1, 2.5, 3.8, 5]) for (const b of [1.4, 3, 4.7]) {
      const s = { fees: a, security: b, mica: a, ux: b, support: a, catalogue: b };
      expect(computeGlobalScore(s)).toBe(tsGlobal(s));
    }
  });

  it("barème du catalogue : valeurs de repère (30 cryptos = 2,5 ; 100 = 3,5 ; 300 = 4,3 ; 700+ = 5 ; bonus plafonnés à 5)", () => {
    const c = (n: number, extra = {}) => computeCatalogueScore({ totalCryptos: n, stakingAvailable: false, paymentMethodsCount: 0, isMultiAssetBroker: false, ...extra });
    expect([c(30), c(100), c(300), c(500), c(700), c(1000)]).toEqual([2.5, 3.5, 4.3, 4.7, 4.9, 5]);
    expect(c(1000, { stakingAvailable: true, paymentMethodsCount: 8, isMultiAssetBroker: true })).toBe(5);
    expect(c(30, { stakingAvailable: true })).toBe(2.8);
    expect(c(30, { paymentMethodsCount: 5 })).toBe(2.7);
  });
});

describe("lastScored = date de donnée, jamais l'heure du robot", () => {
  it("la date la plus récente des entrées qui ont servi (frais, coût, MiCA, sécurité, support)", () => {
    const a = plateforme("a", { security: { verified: "2026-10-07" } });
    const b = plateforme("b", { support: { verified: "2026-10-09" } });
    expect(datesDonnees(a)).toEqual(["2026-10-05", "2026-10-04", "2026-10-02", "2026-10-07", "2026-10-06"]);
    expect(lastScoredDe([a, b], "2026-10-10")).toBe("2026-10-09");
  });

  it("le jour du calcul n'est JAMAIS retenu : le même jeu donne la même date quel que soit le jour où le robot tourne", () => {
    const j = jeu([plateforme("a")]);
    expect(recalculerJeu(j, "2026-10-10").lastScoredApres).toBe("2026-10-07");
    expect(recalculerJeu(j, "2027-03-01").lastScoredApres).toBe("2026-10-07");
    expect(recalculerJeu(j, "2099-01-01").data._meta.lastScored).toBe("2026-10-07");
  });

  it("une donnée datée du futur (ex. 2028) est ignorée", () => {
    const a = plateforme("a", { mica: { lastVerified: "2028-09-11" } });
    expect(lastScoredDe([a], "2026-10-10")).toBe("2026-10-07");
  });

  it("aucune date lisible : on garde la date précédente (jamais « aujourd'hui »)", () => {
    const sans = plateforme("a", { fees: {}, mica: {}, security: {}, support: {} });
    expect(recalculerJeu(jeu([sans], { lastScored: "2026-08-15" }), "2026-10-10").lastScoredApres).toBe("2026-08-15");
  });

  it("dates mal formées ou impossibles ignorées", () => {
    const a = plateforme("a", { fees: { verified: { date: "2026-02-31" }, cost: { date: "demain" } }, mica: { lastVerified: "2026-10-02" }, security: {}, support: {} });
    expect(datesDonnees(a)).toEqual(["2026-10-02"]);
  });

  it("le fichier de données réel : lastScored annoncé ≥ chaque date de donnée déjà prise en compte par le calcul", () => {
    const data = JSON.parse(lire("data/platforms.json"));
    const r = recalculerJeu(data, "2026-10-10");
    expect(r.lastScoredApres).toBe(lastScoredDe(data.platforms, "2026-10-10"));
    expect(r.lastScoredApres).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("décision du robot : écrire, ne rien faire, refuser", () => {
  it("jeu cohérent et déjà à jour : rien à écrire (aucun commit)", () => {
    const j = jeu([plateforme("a"), plateforme("b")], { lastScored: "2026-10-07" });
    const r = recalculerJeu(j, "2026-10-10");
    expect(r.incoherents).toEqual([]);
    expect(r.scoresChangent).toBe(false);
    expect(decider(r)).toMatchObject({ action: "rien" });
  });

  it("donnée plus récente, scores inchangés : seule la date avance", () => {
    const j = jeu([plateforme("a")], { lastScored: "2026-09-01" });
    const d = decider(recalculerJeu(j, "2026-10-10"));
    expect(d.action).toBe("ecrire");
    expect(d.raison).toMatch(/date de calcul avancée au 2026-10-07/);
  });

  it("donnée qui change une sous-note dérivée (staking ajouté) sur une plateforme cohérente : les scores sont recalculés et écrits", () => {
    const avant = plateforme("a", { cryptos: { totalCount: 200, stakingAvailable: false } });
    const apres = { ...avant, cryptos: { totalCount: 200, stakingAvailable: true } };
    expect(etatCoherent(avant).coherent).toBe(true);
    const r = recalculerJeu(jeu([apres], { lastScored: "2026-10-07" }), "2026-10-10");
    expect(r.scoresChangent).toBe(true);
    expect(decider(r).action).toBe("ecrire");
    expect(r.data.platforms[0].scoring.catalogue).toBeGreaterThan(avant.scoring.catalogue);
  });

  it("une plateforme dont la note globale enregistrée s'écarte de la formule : le robot REFUSE, sauf relance assumée", () => {
    const bonne = plateforme("a");
    const fausse = plateforme("b");
    fausse.scoring = { ...fausse.scoring, global: fausse.scoring.global + 0.3 };
    const r = recalculerJeu(jeu([bonne, fausse], { lastScored: "2026-10-07" }), "2026-10-10");
    expect(r.incoherents.map((i: { id: string }) => i.id)).toEqual(["b"]);
    expect(decider(r)).toMatchObject({ action: "refuser" });
    expect(decider(r, { accepterDerive: true }).action).toBe("ecrire");
    expect(r.data.platforms[1].scoring.global).toBe(plateforme("b").scoring.global); // recalcul explicite
  });

  it("sous-note catalogue enregistrée différente de celle des données : signalée, mais ce n'est pas elle qui bloque le robot", () => {
    const p = plateforme("a");
    p.scoring = { ...p.scoring, catalogue: 1, global: computeGlobalScore({ ...p.scoring, catalogue: 1 }) };
    expect(etatCoherent(p)).toMatchObject({ catalogueOk: false, globalOk: true, coherent: true });
    expect(recalculerJeu(jeu([p], { lastScored: "2026-10-07" }), "2026-10-10").scoresChangent).toBe(true);
  });

  it("le recalcul ne modifie jamais le jeu d'origine et garde l'ordre des clés du bloc scoring", () => {
    const j = jeu([plateforme("a")]);
    const copie = JSON.stringify(j);
    const r = recalculerJeu(j, "2026-10-10");
    expect(JSON.stringify(j)).toBe(copie);
    expect(Object.keys(r.data.platforms[0].scoring)).toEqual(["global", "fees", "security", "ux", "support", "mica", "catalogue"]);
  });
});

describe("état réel de data/platforms.json au 10/10/2026 (constat, pas une règle)", () => {
  it("le robot refuse aujourd'hui : des notes enregistrées ne respectent pas la formule publiée", () => {
    const r = recalculerJeu(JSON.parse(lire("data/platforms.json")), "2026-10-10");
    // si ce nombre tombe à 0 (notes relues et corrigées), le robot se met à écrire : ce test doit alors être mis à jour
    expect(r.incoherents.length).toBeGreaterThan(0);
    expect(decider(r).action).toBe("refuser");
  });
});

describe("script en mode robot (--robot) : aucune écriture quand il refuse ou quand rien ne change", () => {
  function essai(data: unknown, args: string[]) {
    const dossier = mkdtempSync(path.join(tmpdir(), "scores-z6-"));
    mkdirSync(path.join(dossier, "scripts/lib"), { recursive: true });
    mkdirSync(path.join(dossier, "data"), { recursive: true });
    copyFileSync(path.join(RACINE, "scripts/compute-platform-scores.mjs"), path.join(dossier, "scripts/compute-platform-scores.mjs"));
    copyFileSync(path.join(RACINE, "scripts/lib/scores-plateformes.mjs"), path.join(dossier, "scripts/lib/scores-plateformes.mjs"));
    const fichier = path.join(dossier, "data/platforms.json");
    writeFileSync(fichier, JSON.stringify(data, null, 2) + "\n");
    const sortie = path.join(dossier, "sortie.txt");
    writeFileSync(sortie, "");
    execFileSync(process.execPath, [path.join(dossier, "scripts/compute-platform-scores.mjs"), "--robot", `--rapport=${path.join(dossier, "rapport.md")}`, ...args], {
      cwd: dossier,
      env: { ...process.env, GITHUB_OUTPUT: sortie },
      stdio: "pipe",
    });
    return { apres: readFileSync(fichier, "utf8"), sortie: readFileSync(sortie, "utf8"), dossier };
  }

  it("refus : fichier intact, sortie refus=true, rapport écrit", () => {
    const fausse = plateforme("b");
    fausse.scoring = { ...fausse.scoring, global: 1 };
    const data = jeu([fausse]);
    const avant = JSON.stringify(data, null, 2) + "\n";
    const { apres, sortie, dossier } = essai(data, []);
    expect(apres).toBe(avant);
    expect(sortie).toMatch(/refus=true/);
    expect(sortie).toMatch(/ecrit=false/);
    expect(readFileSync(path.join(dossier, "rapport.md"), "utf8")).toMatch(/\| b \|/);
  });

  it("jeu cohérent à jour : fichier intact, aucun commit", () => {
    const data = jeu([plateforme("a")], { lastScored: "2026-10-07" });
    const avant = JSON.stringify(data, null, 2) + "\n";
    const { apres, sortie } = essai(data, []);
    expect(apres).toBe(avant);
    expect(sortie).toMatch(/ecrit=false/);
  });

  it("donnée plus récente : le fichier est réécrit avec la date de donnée (pas la date du jour) et le format du dépôt", () => {
    const data = jeu([plateforme("a")], { lastScored: "2026-09-01" });
    const { apres, sortie } = essai(data, []);
    expect(sortie).toMatch(/ecrit=true/);
    expect(JSON.parse(apres)._meta.lastScored).toBe("2026-10-07");
    expect(apres.endsWith("}\n")).toBe(true);
    expect(apres).toBe(JSON.stringify(JSON.parse(apres), null, 2) + "\n");
  });

  it("relance assumée (--accepter-derive) : écrit le recalcul complet", () => {
    const fausse = plateforme("b");
    fausse.scoring = { ...fausse.scoring, global: 1 };
    const { apres, sortie } = essai(jeu([fausse], { lastScored: "2026-10-07" }), ["--accepter-derive"]);
    expect(sortie).toMatch(/ecrit=true/);
    expect(JSON.parse(apres).platforms[0].scoring.global).toBe(plateforme("b").scoring.global);
  });
});

describe("workflow scores.yml", () => {
  const wf: Yaml = parse(lire(".github/workflows/scores.yml"));
  const on = wf.on ?? wf[true as unknown as string];
  const steps: Yaml[] = wf.jobs.scores.steps;
  const texte = lire(".github/workflows/scores.yml");

  it("déclenché par un push sur data/platforms.json et à la main (accepter_derive, jamais par défaut)", () => {
    expect(on.push.branches).toEqual(["main"]);
    expect(on.push.paths).toContain("data/platforms.json");
    expect(on.workflow_dispatch.inputs.accepter_derive).toMatchObject({ type: "boolean", default: false });
    expect(on.schedule).toBeUndefined();
  });

  it("tests + tsc AVANT le commit, push avec reprise ×3, bash pipefail, commit seulement si le fichier change", () => {
    const iTests = steps.findIndex((s) => s.id === "tests");
    const iPublier = steps.findIndex((s) => s.id === "publier");
    expect(iTests).toBeGreaterThan(-1);
    expect(iPublier).toBeGreaterThan(iTests);
    expect(steps[iTests].run).toContain("tests/lib/scores-z6.test.ts");
    expect(steps[iTests].run).toContain("npx tsc --noEmit -p .");
    expect(steps[iPublier].run).toContain("for i in 1 2 3");
    expect(steps[iPublier].run).toContain("git diff --staged --quiet");
    expect(wf.jobs.scores.defaults.run.shell).toBe("bash");
    expect(String(steps[iTests].if)).toContain("steps.calcul.outputs.ecrit == 'true'");
  });

  it("tickets privés seulement (jeton SENTINELLE_TOKEN, dépôt explicite), jamais dans le dépôt public", () => {
    expect(texte).toContain('repo: "cryptoreflex-sentinelle"');
    expect(texte).toContain("secrets.SENTINELLE_TOKEN");
    expect(texte).not.toMatch(/\bgh\s+issue\b/);
  });
});
