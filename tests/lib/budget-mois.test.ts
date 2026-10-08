/**
 * Lot Z2b (08/10/2026) — « budget du mois ». Kev : « à toi de faire en sorte qu'on gère la conso du mois » ; 0 € de dépassement,
 * le site ne doit JAMAIS être coupé.
 *  1. règles pures (scripts/lib/budget-mois.mjs) : projection, seuils ✅ / ⚠️ / ❌, aucune valeur inventée ;
 *  2. section « Consommation du mois » (ticket du dimanche, fraicheur-etat.json) ;
 *  3. frein automatique du robot des cours : activation > 90 %, retour < 75 %, un passage sur deux sauté, global toutes les 3 h,
 *     trace du robot et bilan, heure du relevé toujours exacte.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BASE_SEUIL_ATTENTION,
  BASE_SEUIL_DEFAUT,
  FREIN_ACTIVATION,
  FREIN_RETOUR,
  bilanConsommation,
  compterExecutionsMois,
  decisionFrein,
  etatDepuisPourcentage,
  freinAutoriseGlobal,
  freinSautePassage,
  joursDuMois,
  joursEcoules,
  mesureCmc,
  mesureFlux,
  mesureGithub,
  mesureStock,
  moisCle,
  nonMesure,
  pourcentage,
  projeter,
  sectionConsommation,
} from "../../scripts/lib/budget-mois.mjs";
import { jugerTailleBase } from "../../scripts/lib/fraicheur-registre.mjs";
import { activerKvTest, desactiverKvTest, KV_TEST_URL } from "../helpers/r1-simule";

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  revalidateTag: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));

const RACINE = path.resolve(__dirname, "../..");
const T = (j: number, h = 12, mn = 0, mois = 9) => Date.UTC(2026, mois, j, h, mn); // octobre 2026 par défaut
const MO = 1_048_576;

describe("1. projection et états", () => {
  it("projection = consommé ÷ jours écoulés × jours du mois (8 octobre 12 h : 7,5 jours écoulés sur 31)", () => {
    expect(joursDuMois(T(8))).toBe(31);
    expect(joursEcoules(T(8))).toBeCloseTo(7.5, 10);
    expect(projeter(1000, T(8))).toBeCloseTo((1000 / 7.5) * 31, 6);
  });

  it("jours du mois exacts : février 2027 = 28, février 2028 = 29, novembre = 30", () => {
    expect(joursDuMois(Date.UTC(2027, 1, 10))).toBe(28);
    expect(joursDuMois(Date.UTC(2028, 1, 10))).toBe(29);
    expect(joursDuMois(Date.UTC(2026, 10, 10))).toBe(30);
    expect(moisCle(T(8))).toBe("2026-10");
  });

  it("jamais moins d'UN jour écoulé : le 1er à 6 h, 40 crédits ne s'extrapolent pas à 4 960", () => {
    expect(joursEcoules(T(1, 6))).toBe(1);
    expect(projeter(40, T(1, 6))).toBe(40 * 31);
  });

  it("consommé invalide → null (jamais 0, jamais NaN)", () => {
    for (const v of [null, undefined, NaN, Infinity, -1, "12", {}]) expect(projeter(v as never, T(8))).toBeNull();
    expect(projeter(0, T(8))).toBe(0);
  });

  it("pourcentage : limite absente, nulle ou négative → null", () => {
    expect(pourcentage(50, 100)).toBe(50);
    for (const l of [null, undefined, 0, -5, NaN]) expect(pourcentage(50, l as never)).toBeNull();
    expect(pourcentage(null as never, 100)).toBeNull();
  });

  it("états : ✅ < 75, ⚠️ de 75 à 90 inclus, ❌ > 90 ; mesure absente → non mesuré", () => {
    expect(etatDepuisPourcentage(0)).toBe("ok");
    expect(etatDepuisPourcentage(74.99)).toBe("ok");
    expect(etatDepuisPourcentage(75)).toBe("attention");
    expect(etatDepuisPourcentage(90)).toBe("attention");
    expect(etatDepuisPourcentage(90.01)).toBe("defaut");
    expect(etatDepuisPourcentage(250)).toBe("defaut");
    expect(etatDepuisPourcentage(null as never)).toBe("non-mesure");
    expect(etatDepuisPourcentage(NaN)).toBe("non-mesure");
  });
});

describe("2. une ligne par service, aucune valeur inventée", () => {
  const now = T(8); // 7,5 jours écoulés
  const consommePour = (pctProjete: number, limite = 15_000) => (pctProjete / 100) * limite * (7.5 / 31);

  it("flux : la projection, le pourcentage et l'état suivent la règle (74 % ✅, 80 % ⚠️, 95 % ❌)", () => {
    const l74 = mesureFlux({ id: "cmc", nom: "CoinMarketCap", unite: "crédits", consomme: consommePour(74), limite: 15_000, now });
    const l80 = mesureFlux({ id: "cmc", nom: "CoinMarketCap", unite: "crédits", consomme: consommePour(80), limite: 15_000, now });
    const l95 = mesureFlux({ id: "cmc", nom: "CoinMarketCap", unite: "crédits", consomme: consommePour(95), limite: 15_000, now });
    expect([l74.etat, l80.etat, l95.etat]).toEqual(["ok", "attention", "defaut"]);
    expect([l74.icone, l80.icone, l95.icone]).toEqual(["✅", "⚠️", "❌"]);
    expect(l80.pct).toBeCloseTo(80, 6);
    expect(l80.msg).toMatch(/projection fin de mois ≈ 12\s?000 \(80 %\)/);
  });

  it("flux : consommé absent → « non mesuré : <raison> », sans chiffre, sans état vert", () => {
    for (const consomme of [null, undefined, NaN, -3]) {
      const l = mesureFlux({ id: "cmc", nom: "CoinMarketCap", unite: "crédits", consomme, limite: 15_000, now, raison: "compteur officiel illisible" });
      expect(l).toMatchObject({ etat: "non-mesure", icone: "❔", consomme: null, limite: null, projection: null, pct: null });
      expect(l.msg).toBe("CoinMarketCap : non mesuré : compteur officiel illisible");
    }
  });

  it("flux : limite inconnue → non mesuré (aucune limite supposée)", () => {
    for (const limite of [null, undefined, 0]) {
      expect(mesureFlux({ id: "x", nom: "X", unite: "u", consomme: 100, limite, now })).toMatchObject({ etat: "non-mesure", projection: null });
    }
  });

  it("Upstash et Vercel : « non mesuré : alerte e-mail du fournisseur » par défaut, aucune valeur", () => {
    for (const [id, nom] of [["upstash", "Upstash (KV)"], ["vercel", "Vercel (crédit Pro du mois)"]]) {
      const l = nonMesure(id, nom);
      expect(l.msg).toBe(`${nom} : non mesuré : alerte e-mail du fournisseur`);
      expect(l).toMatchObject({ etat: "non-mesure", consomme: null, projection: null });
    }
  });

  it("Supabase : ⚠️ dès 60 %, ❌ dès 80 % de 500 Mo, mêmes bornes que le contrôle existant (jugerTailleBase) à l'octet près", () => {
    const plafond = 500 * MO;
    expect(BASE_SEUIL_ATTENTION).toBe(60);
    expect(BASE_SEUIL_DEFAUT).toBe(80);
    const niveau = { ok: "ok", warn: "attention", fail: "defaut" } as const;
    for (const octets of [0, 10 * MO, 299 * MO, 300 * MO - 1, 300 * MO, 301 * MO, 399 * MO, 400 * MO - 1, 400 * MO, 450 * MO, 500 * MO, 600 * MO]) {
      expect(mesureStock({ id: "supabase", nom: "Supabase", octets, plafond }).etat).toBe(niveau[jugerTailleBase(octets, plafond).level as keyof typeof niveau]);
    }
    const l = mesureStock({ id: "supabase", nom: "Supabase", octets: 120 * MO, plafond });
    expect(l).toMatchObject({ etat: "ok", projection: null, consomme: 120 * MO });
    expect(l.msg).toMatch(/120 Mo sur 500 Mo \(24\.0 %\).*pas de projection mensuelle/);
  });

  it("Supabase : taille illisible (fonction SQL absente) → non mesuré avec la raison, jamais 0 Mo", () => {
    for (const octets of [null, undefined, NaN, -1]) {
      const l = mesureStock({ id: "supabase", nom: "Supabase", octets: octets as never, plafond: 500 * MO, raison: "fonction SQL cryptoreflex_taille_base absente" });
      expect(l).toMatchObject({ etat: "non-mesure", consomme: null });
      expect(l.msg).toContain("fonction SQL cryptoreflex_taille_base absente");
    }
  });

  it("GitHub Actions : dépôt public = ✅ gratuit ; privé = ❌ ; visibilité illisible = ⚠️ ; nombre illisible = non mesuré", () => {
    expect(mesureGithub({ executions: 380, prive: false, now })).toMatchObject({ etat: "ok", consomme: 380, limite: null });
    expect(mesureGithub({ executions: 380, prive: false, now }).msg).toMatch(/380 exécutions ce mois ; projection fin de mois ≈ 1\s?571.*gratuit tant que le dépôt est public/);
    expect(mesureGithub({ executions: 380, prive: true, now }).etat).toBe("defaut");
    expect(mesureGithub({ executions: 380, prive: null, now }).etat).toBe("attention");
    expect(mesureGithub({ executions: 1500, prive: false, borne: true, now }).msg).toContain("au moins 1");
    const l = mesureGithub({ executions: null, prive: null, now, raison: "API GitHub : HTTP 403" });
    expect(l).toMatchObject({ etat: "non-mesure", consomme: null });
    expect(l.msg).toContain("HTTP 403");
  });

  it("CoinMarketCap : compteur officiel d'abord (mois, jour, frein affiché)", () => {
    const b = { lu: true, moisUtilises: 1200, moisPlafond: 15_000, aujourdhui: 150, plafondJour: null, erreur1009: null, frein: { etat: "normal", raison: "projection à 28 %", projectionPct: 28 } };
    const l = mesureCmc(b, now);
    expect(l).toMatchObject({ etat: "ok", consomme: 1200, limite: 15_000, source: "compteur officiel (/v1/key/info)" });
    expect(l.msg).toContain("150 crédits aujourd'hui (plafond quotidien non renvoyé)");
    expect(l.msg).toContain("frein du robot des cours : normal");
  });

  it("CoinMarketCap : frein actif et erreur 1009 du jour sont affichés dans le bilan", () => {
    const b = { lu: true, moisUtilises: 6000, moisPlafond: 15_000, aujourdhui: 300, erreur1009: new Date(now - 3_600_000).toISOString(), frein: { etat: "actif", raison: "projection fin de mois à 103 % de la limite (seuil 90 %)", projectionPct: 103 } };
    const l = mesureCmc(b, now);
    expect(l.etat).toBe("defaut");
    expect(l.frein).toMatchObject({ etat: "actif", projectionPct: 103 });
    expect(l.msg).toContain("frein du robot des cours : ACTIF");
    expect(l.msg).toContain("erreur 1009 (plafond du jour atteint) reçue aujourd'hui");
  });

  it("CoinMarketCap : compteur officiel illisible → compteur interne des robots, signalé comme partiel", () => {
    const b = { lu: false, raison: "compteur officiel (/v1/key/info) illisible", compteurRobots: { mois: "2026-10", credits: 900 }, frein: null };
    const l = mesureCmc(b, now, { limiteSecours: 15_000 });
    expect(l).toMatchObject({ consomme: 900, partiel: true, source: "compteur interne des robots" });
    expect(l.msg).toContain("compteur interne des robots : les lectures des pages ne sont pas comptées");
    expect(l.msg).toContain("frein du robot des cours : état non lu");
  });

  it("CoinMarketCap : ni compteur officiel ni compteur interne → non mesuré, aucun chiffre", () => {
    for (const b of [null, undefined, { lu: false, raison: "clé CoinMarketCap absente de l'environnement" }, { lu: false, compteurRobots: null }]) {
      const l = mesureCmc(b, now, { limiteSecours: 15_000, raison: "bilan non lu" });
      expect(l).toMatchObject({ etat: "non-mesure", consomme: null, projection: null });
      expect(l.msg).toMatch(/^CoinMarketCap : non mesuré : /);
    }
  });
});

describe("3. section « Consommation du mois » (ticket du dimanche et fraicheur-etat.json)", () => {
  const now = T(8);
  const services = [
    mesureCmc({ lu: true, moisUtilises: 1200, moisPlafond: 15_000, aujourdhui: 150, frein: { etat: "normal", raison: "ok", projectionPct: 28 } }, now),
    mesureStock({ id: "supabase", nom: "Supabase (base de données)", octets: 120 * MO, plafond: 500 * MO }),
    mesureGithub({ executions: 380, prive: false, now }),
    nonMesure("upstash", "Upstash (KV)"),
    nonMesure("vercel", "Vercel (crédit Pro du mois)"),
  ];

  it("tableau Markdown : une ligne par service, colonnes consommé / limite / projection / état, légende des seuils", () => {
    const md = sectionConsommation(services, now);
    expect(md).toContain("## Consommation du mois — octobre 2026");
    expect(md).toContain("| Service | Consommé | Limite | Projection fin de mois | État |");
    expect(md).toMatch(/\| CoinMarketCap \| 1\s?200 crédits \| 15\s?000 crédits \| ≈ 4\s?960 \(33 %\) \| ✅ \|/);
    expect(md).toMatch(/\| Supabase \(base de données\) \| 120 Mo \| 500 Mo \| sans objet \| ✅ \|/);
    expect(md).toMatch(/\| GitHub Actions \| 380 exécutions \| aucune \(dépôt public\) \| ≈ 1\s?571 \| ✅ \|/);
    expect(md).toContain("| Upstash (KV) | — | — | — | ❔ |");
    expect(md).toContain("| Vercel (crédit Pro du mois) | — | — | — | ❔ |");
    expect(md).toContain("Upstash (KV) : non mesuré : alerte e-mail du fournisseur");
    expect(md).toContain("moins de 75 %");
    expect(md).toContain("plus de 90 %");
    expect(md.split("\n").filter((l) => l.startsWith("| ")).length).toBe(1 + services.length); // en-tête + une ligne par service (le séparateur commence par « |- »)
  });

  it("fraicheur-etat.json : mois, jours écoulés, services avec leur état et leur projection", () => {
    const b = bilanConsommation(services, now);
    expect(b).toMatchObject({ mois: "2026-10", joursEcoules: 7.5, joursDuMois: 31 });
    expect(b.services.map((s: { id: string; etat: string }) => [s.id, s.etat])).toEqual([
      ["cmc", "ok"], ["supabase", "ok"], ["github", "ok"], ["upstash", "non-mesure"], ["vercel", "non-mesure"],
    ]);
    expect(JSON.parse(JSON.stringify(b)).services[3]).toMatchObject({ consomme: null, projection: null });
  });

  it("branchement : la sentinelle complète écrit la section dans fraicheur-etat.json et dans le ticket du dimanche, sans secret nouveau", () => {
    const src = readFileSync(path.join(RACINE, "scripts/sentinelle.mjs"), "utf8");
    expect(src).toMatch(/await checkTailleBase\(\);\s*await checkConsommationMois\(\);\s*ecrireEtatFraicheur\(\);/);
    expect(src).toContain("consommation: consommation.bilan");
    expect(src).toMatch(/rapportHebdo\(resultats, now\) \+ \(consommation \? "\\n" \+ consommation\.markdown : ""\)/);
    // la section ne dépend que des secrets déjà donnés à l'étape « Contrôles » du workflow
    const wf = readFileSync(path.join(RACINE, ".github/workflows/sentinelle.yml"), "utf8");
    for (const s of ["GITHUB_TOKEN", "CRON_SECRET", "SUPABASE_SERVICE_ROLE_KEY"]) expect(wf).toContain(s);
    // le ticket du dimanche publie fraicheur-hebdo.md tel quel
    expect(wf).toContain('fs.readFileSync("fraicheur-hebdo.md", "utf8")');
  });
});

describe("4. GitHub Actions : exécutions du mois par l'API (jeton du workflow)", () => {
  const now = T(3); // 3 octobre : 3 jours à compter
  const reponse = (corps: unknown, status = 200) => new Response(JSON.stringify(corps), { status });

  it("somme un appel par jour écoulé (1er au 3), lit la visibilité du dépôt, n'envoie que le jeton fourni", async () => {
    const urls: string[] = [];
    const entetes: Array<Record<string, string>> = [];
    const f = vi.fn(async (u: string | URL | Request, init?: RequestInit) => {
      urls.push(String(u));
      entetes.push(init?.headers as Record<string, string>);
      if (String(u).endsWith("/repos/Qlpha-png/cryptoreflex")) return reponse({ private: false });
      const jour = /created=2026-10-0(\d)/.exec(String(u))?.[1];
      return reponse({ total_count: 40 + Number(jour) });
    });
    const r = await compterExecutionsMois({ repo: "Qlpha-png/cryptoreflex", token: "jeton-factice", now, fetchImpl: f as unknown as typeof fetch });
    expect(r).toEqual({ executions: 41 + 42 + 43, prive: false, borne: false });
    expect(urls).toEqual([
      "https://api.github.com/repos/Qlpha-png/cryptoreflex",
      "https://api.github.com/repos/Qlpha-png/cryptoreflex/actions/runs?created=2026-10-01&per_page=1",
      "https://api.github.com/repos/Qlpha-png/cryptoreflex/actions/runs?created=2026-10-02&per_page=1",
      "https://api.github.com/repos/Qlpha-png/cryptoreflex/actions/runs?created=2026-10-03&per_page=1",
    ]);
    expect(entetes.every((h) => h.Authorization === "Bearer jeton-factice")).toBe(true);
  });

  it("dépôt privé → prive: true ; un jour à 1 000 résultats (plafond de l'API) → borne: true", async () => {
    const f = vi.fn(async (u: string | URL | Request) => (String(u).includes("/actions/runs") ? reponse({ total_count: 1000 }) : reponse({ private: true })));
    const r = await compterExecutionsMois({ repo: "a/b", token: "t", now: T(1), fetchImpl: f as unknown as typeof fetch });
    expect(r).toMatchObject({ executions: 1000, prive: true, borne: true });
  });

  it("le moindre échec (HTTP 403, réseau, réponse sans total_count) → null, JAMAIS une somme partielle", async () => {
    let n = 0;
    const f403 = vi.fn(async (u: string | URL | Request) => {
      if (!String(u).includes("/actions/runs")) return reponse({ private: false });
      n++;
      return n === 2 ? reponse({ message: "forbidden" }, 403) : reponse({ total_count: 50 });
    });
    const r = await compterExecutionsMois({ repo: "a/b", token: "t", now, fetchImpl: f403 as unknown as typeof fetch });
    expect(r).toMatchObject({ executions: null, prive: null });
    expect(r.raison).toBe("API GitHub : HTTP 403");

    const fReseau = vi.fn(async () => {
      throw new Error("réseau coupé");
    });
    expect((await compterExecutionsMois({ repo: "a/b", token: "t", now, fetchImpl: fReseau as unknown as typeof fetch })).executions).toBeNull();

    const fSans = vi.fn(async (u: string | URL | Request) => (String(u).includes("/actions/runs") ? reponse({}) : reponse({ private: false })));
    expect((await compterExecutionsMois({ repo: "a/b", token: "t", now, fetchImpl: fSans as unknown as typeof fetch })).executions).toBeNull();
  });

  it("jeton ou dépôt absent → null avec la raison, aucun appel réseau", async () => {
    const f = vi.fn();
    for (const p of [{ repo: undefined, token: "t" }, { repo: "a/b", token: undefined }, { repo: "", token: "" }]) {
      const r = await compterExecutionsMois({ ...p, now, fetchImpl: f as unknown as typeof fetch });
      expect(r.executions).toBeNull();
      expect(r.raison).toMatch(/absent/);
    }
    expect(f).not.toHaveBeenCalled();
  });
});

describe("5. frein : règle pure (activation > 90 %, retour < 75 %, hystérésis)", () => {
  const now = T(8); // 7,5 j écoulés
  const consomme = (pct: number) => (pct / 100) * 15_000 * (7.5 / 31);
  const decide = (pct: number, precedentActif: boolean, extra: object = {}) => decisionFrein({ consomme: consomme(pct), limite: 15_000, now, precedentActif, ...extra });

  it("seuils du cahier : 90 et 75", () => {
    expect(FREIN_ACTIVATION).toBe(90);
    expect(FREIN_RETOUR).toBe(75);
  });

  it("projection > 90 % → frein actif (même sans frein avant)", () => {
    expect(decide(90.5, false).actif).toBe(true);
    expect(decide(140, false).actif).toBe(true);
    expect(decide(140, false).raison).toMatch(/140 % de la limite \(seuil 90 %\)/);
  });

  it("exactement 90 % ou moins sans frein avant → normal ; < 75 % → normal même si le frein était actif (retour automatique)", () => {
    expect(decide(89.9, false).actif).toBe(false);
    expect(decide(90, false).actif).toBe(false);
    expect(decide(74.9, true)).toMatchObject({ actif: false });
    expect(decide(74.9, true).raison).toMatch(/retour à la normale sous 75 %/);
    expect(decide(10, true).actif).toBe(false);
  });

  it("entre 75 et 90 % : l'état précédent est gardé (pas de va-et-vient autour du seuil)", () => {
    for (const pct of [75, 80, 85, 90]) {
      expect(decide(pct, true).actif).toBe(true);
      expect(decide(pct, false).actif).toBe(false);
    }
  });

  it("scénario sur plusieurs jours : activation à 95 %, maintien à 85 %, retour à 70 %", () => {
    let actif = false;
    const suite: Array<[number, boolean]> = [[60, false], [95, true], [85, true], [78, true], [70, false], [85, false]];
    for (const [pct, attendu] of suite) {
      actif = decide(pct, actif).actif;
      expect(actif, `projection ${pct} %`).toBe(attendu);
    }
  });

  it("erreur 1009 reçue aujourd'hui → frein actif, même avec une projection basse", () => {
    const d = decide(10, false, { erreur1009Jour: true });
    expect(d.actif).toBe(true);
    expect(d.raison).toMatch(/1009/);
    // le lendemain (1009 plus « du jour ») et projection basse : retour à la normale
    expect(decide(10, true, { erreur1009Jour: false }).actif).toBe(false);
  });

  it("compteur illisible : rien n'est supposé, l'état précédent est gardé et la raison le dit", () => {
    for (const precedentActif of [true, false]) {
      const d = decisionFrein({ consomme: null, limite: 15_000, now, precedentActif });
      expect(d).toMatchObject({ actif: precedentActif, projection: null, projectionPct: null });
      expect(d.raison).toMatch(/compteur illisible : état précédent conservé/);
    }
    // 1009 sans compteur : le frein s'active quand même (le plafond du jour est une certitude)
    expect(decisionFrein({ consomme: null, limite: 15_000, now, precedentActif: false, erreur1009Jour: true }).actif).toBe(true);
  });

  it("un passage sur deux : sauté si le dernier relevé réel a moins de 15 min, jamais sans frein, jamais sans trace", () => {
    const il = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
    expect(freinSautePassage(true, now, il(10))).toBe(true); // passage de :10 après celui de :00
    expect(freinSautePassage(true, now, il(20))).toBe(false); // passage de :20
    expect(freinSautePassage(true, now, il(14.9))).toBe(true);
    expect(freinSautePassage(true, now, il(15))).toBe(false);
    expect(freinSautePassage(false, now, il(10))).toBe(false);
    for (const t of [undefined, null, "", "pas une date"]) expect(freinSautePassage(true, now, t as never)).toBe(false);
    expect(freinSautePassage(true, now, new Date(now + 60_000).toISOString())).toBe(false); // horloge décalée : on relève
    // cadence obtenue : cron */10 pendant 2 h → un relevé toutes les 20 min exactement
    let dernier: string | undefined;
    const releves: number[] = [];
    for (let m = 0; m < 120; m += 10) {
      const t = T(8, 12) + m * 60_000;
      if (freinSautePassage(true, t, dernier)) continue;
      releves.push(m);
      dernier = new Date(t).toISOString();
    }
    expect(releves).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it("frein actif : global seulement aux heures UTC multiples de 3 ; sans frein, toujours", () => {
    const h = (heure: number) => Date.UTC(2026, 9, 8, heure, 0);
    expect([0, 1, 2, 3, 4, 5, 6, 9, 12, 15, 18, 21].map((x) => freinAutoriseGlobal(true, h(x)))).toEqual([true, false, false, true, false, false, true, true, true, true, true, true]);
    for (let x = 0; x < 24; x++) expect(freinAutoriseGlobal(false, h(x))).toBe(true);
  });
});

/* ------------------------------------------------------------------ robot R1 et routes, bout en bout */

const realFetch = globalThis.fetch;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** 100 lignes CMC valides (bitcoin, ethereum + 98 autres) ; seul compte ici le nombre de lignes et la présence du prix. */
async function cmcTop100() {
  const { default: carte } = await import("@/data/cmc-id-map.json");
  const MAP = (carte as { map: Record<string, { id: number; symbol: string }> }).map;
  const autres = Object.entries(MAP).filter(([site]) => site !== "bitcoin" && site !== "ethereum").slice(0, 98);
  const lignes = [{ id: 1, symbol: "BTC", price: 60_000, dom: 58.1 }, { id: 1027, symbol: "ETH", price: 2_500, dom: 12.2 }, ...autres.map(([, e], i) => ({ id: e.id, symbol: e.symbol, price: 10 + i, dom: 0.01 }))];
  return lignes.map((l, i) => ({
    id: l.id, name: l.symbol, symbol: l.symbol, slug: `slug-${l.id}`, cmc_rank: i + 1, circulating_supply: 1e6, last_updated: new Date().toISOString(),
    quote: { USD: { price: l.price, volume_24h: 1e6, percent_change_1h: 0.1, percent_change_24h: 1, percent_change_7d: 2, market_cap: l.price * 1e6, market_cap_dominance: l.dom } },
  }));
}
const cmcGlobal = () => ({
  status: { error_code: 0, credit_count: 1 },
  data: { btc_dominance: 58.1, eth_dominance: 12.2, active_cryptocurrencies: 9000, last_updated: new Date().toISOString(), quote: { USD: { total_market_cap: 2.06e12, total_volume_24h: 1.1e11, total_market_cap_yesterday_percentage_change: 0.7 } } },
});
/** /v1/key/info : `moisUtilises` crédits ce mois-ci sur 15 000. */
const keyInfo = (moisUtilises: number) =>
  json({ status: { error_code: 0, credit_count: 0 }, data: { plan: { credit_limit_monthly: 15_000 }, usage: { current_day: { credits_used: 100 }, current_month: { credits_used: moisUtilises, credits_left: 15_000 - moisUtilises } } } });

interface Scenario {
  /** crédits du mois renvoyés par /v1/key/info ; null = compteur illisible (HTTP 500) */
  moisUtilises: number | null;
  /** trace précédente de R1 dans le KV (null = aucune) */
  trace?: Record<string, unknown> | null;
  /** erreur 1009 du jour dans le KV */
  e1009?: string | null;
}
function simuler({ moisUtilises, trace = null, e1009 = null }: Scenario) {
  const appels: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    appels.push({ url, init });
    if (url.startsWith(KV_TEST_URL)) {
      const seg = new URL(url).pathname.split("/").map(decodeURIComponent);
      if (init?.method === "POST") return json({ result: "OK" });
      const cle = seg[2];
      if (cle === "cron:refresh-ticker-prices:last") return json({ result: trace ? JSON.stringify(trace) : null });
      if (cle === "cmc:erreur-1009:last") return json({ result: e1009 ? JSON.stringify({ at: e1009 }) : null });
      return json({ result: null });
    }
    if (url.includes("/v1/key/info")) return moisUtilises === null ? json({}, 500) : keyInfo(moisUtilises);
    if (url.includes("frankfurter")) return json({ date: "2026-10-08", rates: { EUR: 0.86, GBP: 0.75, CHF: 0.8 } });
    if (url.includes("/listings/latest")) return json({ status: { error_code: 0, credit_count: 1 }, data: await cmcTop100() });
    if (url.includes("/global-metrics/")) return json(cmcGlobal());
    return json({}, 404);
  }) as unknown as typeof fetch;
  return appels;
}
const payantes = (a: Array<{ url: string }>) => a.filter((x) => x.url.includes("pro-api.coinmarketcap.com") && !x.url.includes("/v1/key/info")).map((x) => x.url.replace(/\?.*/, "").replace("https://pro-api.coinmarketcap.com", ""));
const msets = (a: Array<{ url: string; init?: RequestInit }>) => a.filter((x) => x.url.startsWith(KV_TEST_URL) && x.init?.method === "POST").map((x) => JSON.parse(String(x.init?.body)) as string[]).filter((b) => b[0] === "MSET");

// 8 octobre 12 h UTC : 7,5 jours écoulés. 1 200 crédits → projection 4 960 (33 %) ; 3 900 → 16 120 (107 %) ; 3 000 → 12 400 (83 %).
const LE = (mn: number, s = 30) => new Date(Date.UTC(2026, 9, 8, 12, mn, s));
const il = (mn: number) => new Date(Date.UTC(2026, 9, 8, 12, 0, 0) - mn * 60_000).toISOString();

describe("6. frein dans le robot des cours (R1)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    activerKvTest();
    process.env.CMC_API_KEY = "cle-factice-de-test";
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    desactiverKvTest();
    delete process.env.CMC_API_KEY;
    delete process.env.CRON_SECRET;
    vi.restoreAllMocks();
  });

  it("rythme normal (33 %) : relevé à chaque passage, global à la première tranche de l'heure, frein « normal » écrit", async () => {
    const appels = simuler({ moisUtilises: 1200, trace: { at: il(10), ok: true, frein: "normal", mois: "2026-10", creditsMois: 300 } });
    const { releverMarche } = await import("@/lib/marche-robot");
    const r = await releverMarche({ now: () => LE(0) });
    expect(r).toMatchObject({ ok: true, source: "coinmarketcap", count: 100, global: true });
    expect(r.saute).toBeUndefined();
    expect(r.frein).toMatchObject({ actif: false });
    expect(r.frein?.projectionPct).toBeCloseTo(33.07, 1);
    expect(payantes(appels)).toEqual(["/v1/cryptocurrency/listings/latest", "/v1/global-metrics/quotes/latest"]);
    // compteur interne : 300 + 2 crédits (classement + global)
    expect(r).toMatchObject({ mois: "2026-10", creditsMois: 302 });
  });

  it("projection > 90 % et dernier relevé il y a 10 min : passage SAUTÉ — aucun appel payant, aucune écriture KV, aucune erreur", async () => {
    const appels = simuler({ moisUtilises: 3900, trace: { at: il(0), ok: true, frein: "actif" } });
    // dernier relevé réel à 12:00:00 ; ce passage a lieu à 12:10:30 → 10,5 min
    const { releverMarche } = await import("@/lib/marche-robot");
    const r = await releverMarche({ now: () => LE(10) });
    expect(r).toMatchObject({ ok: true, saute: true, source: null, count: 0, global: false });
    expect(r.frein?.actif).toBe(true);
    expect(payantes(appels)).toEqual([]);
    expect(msets(appels)).toHaveLength(0);
    expect(appels.some((a) => a.url.includes("api.coingecko.com"))).toBe(false);
  });

  it("projection > 90 %, passage suivant (dernier relevé il y a 20 min) : le relevé a lieu, avec l'heure exacte, et le frein est écrit « actif »", async () => {
    const appels = simuler({ moisUtilises: 3900, trace: { at: il(0), ok: true, frein: "actif", mois: "2026-10", creditsMois: 10 } });
    const { releverMarche } = await import("@/lib/marche-robot");
    const r = await releverMarche({ now: () => LE(20) });
    expect(r).toMatchObject({ ok: true, source: "coinmarketcap", count: 100, global: false });
    expect(r.saute).toBeUndefined();
    expect(r.frein).toMatchObject({ actif: true });
    expect(r.frein?.projectionPct).toBeGreaterThan(90);
    // l'heure du relevé reste exacte et écrite avec les cours (affichée par le site) : rien de faux
    expect(r.fetchedAt).toBe("2026-10-08T12:20:30.000Z");
    const m = msets(appels);
    expect(m).toHaveLength(1);
    expect(JSON.parse(m[0][2]).fetchedAt).toBe("2026-10-08T12:20:30.000Z");
    expect(r.creditsMois).toBe(11); // 10 + 1 (classement seul : global pas dû à :20)
  });

  it("frein actif, première tranche de l'heure mais heure UTC hors multiple de 3 (12 h = multiple, 13 h non) : global relevé à 12 h, pas à 13 h", async () => {
    const a12 = simuler({ moisUtilises: 3900, trace: { at: il(20), ok: true, frein: "actif" } });
    const { releverMarche } = await import("@/lib/marche-robot");
    const r12 = await releverMarche({ now: () => LE(0) });
    expect(r12.global).toBe(true);
    expect(payantes(a12)).toContain("/v1/global-metrics/quotes/latest");

    vi.resetModules(); // la mémoire d'instance de lib/coinmarketcap.ts resservirait sinon la réponse de 12 h
    const a13 = simuler({ moisUtilises: 3900, trace: { at: new Date(Date.UTC(2026, 9, 8, 12, 40)).toISOString(), ok: true, frein: "actif" } });
    const { releverMarche: releverMarche13 } = await import("@/lib/marche-robot");
    const r13 = await releverMarche13({ now: () => new Date(Date.UTC(2026, 9, 8, 13, 0, 30)) });
    expect(r13).toMatchObject({ ok: true, global: false });
    expect(payantes(a13)).toEqual(["/v1/cryptocurrency/listings/latest"]);
  });

  it("retour automatique à la normale : frein actif avant, projection retombée à 33 % (< 75 %) → pas de saut, frein « normal »", async () => {
    const appels = simuler({ moisUtilises: 1200, trace: { at: il(0), ok: true, frein: "actif" } });
    const { releverMarche } = await import("@/lib/marche-robot");
    const r = await releverMarche({ now: () => LE(10) }); // 10,5 min après le dernier relevé : serait sauté sous frein
    expect(r.saute).toBeUndefined();
    expect(r).toMatchObject({ ok: true, source: "coinmarketcap" });
    expect(r.frein).toMatchObject({ actif: false });
    expect(r.frein?.raison).toMatch(/retour à la normale sous 75 %/);
    expect(payantes(appels)).toEqual(["/v1/cryptocurrency/listings/latest"]);
  });

  it("entre 75 et 90 % : l'état précédent est gardé (actif reste actif, normal reste normal)", async () => {
    simuler({ moisUtilises: 3000, trace: { at: il(0), ok: true, frein: "actif" } }); // 83 %
    let { releverMarche } = await import("@/lib/marche-robot");
    expect((await releverMarche({ now: () => LE(20) })).frein?.actif).toBe(true);
    vi.resetModules();
    simuler({ moisUtilises: 3000, trace: { at: il(0), ok: true, frein: "normal" } });
    ({ releverMarche } = await import("@/lib/marche-robot"));
    const r = await releverMarche({ now: () => LE(10) });
    expect(r.frein?.actif).toBe(false);
    expect(r.saute).toBeUndefined();
  });

  it("erreur 1009 reçue aujourd'hui : frein actif même avec un compteur bas ; la veille ne compte pas", async () => {
    simuler({ moisUtilises: 1200, trace: { at: il(0), ok: true, frein: "normal" }, e1009: new Date(Date.UTC(2026, 9, 8, 9, 0)).toISOString() });
    let { releverMarche } = await import("@/lib/marche-robot");
    const r = await releverMarche({ now: () => LE(10) });
    expect(r).toMatchObject({ ok: true, saute: true });
    expect(r.frein?.raison).toMatch(/1009/);
    vi.resetModules();
    simuler({ moisUtilises: 1200, trace: { at: il(0), ok: true, frein: "normal" }, e1009: new Date(Date.UTC(2026, 9, 7, 23, 0)).toISOString() });
    ({ releverMarche } = await import("@/lib/marche-robot"));
    const r2 = await releverMarche({ now: () => LE(10) });
    expect(r2.saute).toBeUndefined();
    expect(r2.frein?.actif).toBe(false);
  });

  it("compteur illisible : l'état précédent est gardé (actif → saute, normal → relève), la raison est écrite, rien n'est supposé", async () => {
    const a = simuler({ moisUtilises: null, trace: { at: il(0), ok: true, frein: "actif" } });
    let { releverMarche } = await import("@/lib/marche-robot");
    const r = await releverMarche({ now: () => LE(10) });
    expect(r).toMatchObject({ ok: true, saute: true });
    expect(r.frein).toMatchObject({ actif: true, projectionPct: null });
    expect(r.frein?.raison).toMatch(/compteur illisible : état précédent conservé \(actif\)/);
    expect(payantes(a)).toEqual([]);
    vi.resetModules();
    simuler({ moisUtilises: null, trace: { at: il(0), ok: true, frein: "normal" } });
    ({ releverMarche } = await import("@/lib/marche-robot"));
    const r2 = await releverMarche({ now: () => LE(10) });
    expect(r2).toMatchObject({ ok: true, source: "coinmarketcap" });
    expect(r2.frein?.actif).toBe(false);
  });

  it("KV muet (aucune trace) sous projection > 90 % : le frein s'active mais on RELÈVE (jamais de trou faute de trace)", async () => {
    simuler({ moisUtilises: 3900, trace: null });
    const { releverMarche } = await import("@/lib/marche-robot");
    const r = await releverMarche({ now: () => LE(10) });
    expect(r).toMatchObject({ ok: true, source: "coinmarketcap" });
    expect(r.frein?.actif).toBe(true);
    expect(r.saute).toBeUndefined();
  });

  it("lancement manuel (?force=1 ou ?global=1) : jamais sauté, même sous frein", async () => {
    for (const opt of [{ force: true }, { forceGlobal: true }]) {
      vi.resetModules();
      simuler({ moisUtilises: 3900, trace: { at: il(0), ok: true, frein: "actif" } });
      const { releverMarche } = await import("@/lib/marche-robot");
      const r = await releverMarche({ now: () => LE(10), ...opt });
      expect(r).toMatchObject({ ok: true, source: "coinmarketcap" });
      expect(r.saute).toBeUndefined();
    }
  });

  it("sans clé CoinMarketCap : pas de frein, CoinGecko comme avant, aucun crédit compté", async () => {
    delete process.env.CMC_API_KEY;
    const appels = simuler({ moisUtilises: 3900 });
    const prevFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("api.coingecko.com")) return json(Array.from({ length: 60 }, (_, i) => ({ id: `cg-${i}`, symbol: `c${i}`, name: `Coin ${i}`, image: "", current_price: 5 + i, market_cap: 1e6, market_cap_rank: i + 1, total_volume: 1, price_change_percentage_24h: 1 })));
      return (prevFetch as typeof fetch)(input, init);
    }) as unknown as typeof fetch;
    const { releverMarche } = await import("@/lib/marche-robot");
    const r = await releverMarche({ now: () => LE(10) });
    expect(r).toMatchObject({ ok: true, source: "coingecko", creditsMois: 0 });
    expect(r.frein?.actif).toBe(false);
    expect(payantes(appels)).toEqual([]);
  });

  it("compteur interne : repart de zéro au changement de mois (trace de septembre ignorée)", async () => {
    simuler({ moisUtilises: 1200, trace: { at: il(10), ok: true, frein: "normal", mois: "2026-09", creditsMois: 4000 } });
    const { releverMarche } = await import("@/lib/marche-robot");
    const r = await releverMarche({ now: () => LE(10) });
    expect(r).toMatchObject({ mois: "2026-10", creditsMois: 1 });
  });
});

describe("7. trace du robot et bilan (route du cron, route du diagnostic)", () => {
  const SECRET = "secret-cron-de-test";
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("CRON_SECRET", SECRET);
    activerKvTest();
    process.env.CMC_API_KEY = "cle-factice-de-test";
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(LE(20));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    globalThis.fetch = realFetch;
    desactiverKvTest();
    delete process.env.CMC_API_KEY;
    vi.restoreAllMocks();
  });
  const requete = (url: string) => new Request(url, { headers: { authorization: `Bearer ${SECRET}` } });
  const traceEcrite = (appels: Array<{ url: string; init?: RequestInit }>) =>
    appels
      .filter((a) => a.url.startsWith(KV_TEST_URL) && a.init?.method === "POST")
      .map((a) => JSON.parse(String(a.init?.body)) as string[])
      .filter((b) => b[0] === "SET" && b[1] === "cron:refresh-ticker-prices:last")
      .map((b) => JSON.parse(b[2]) as Record<string, unknown>)
      .pop();

  it("passage réel sous frein : la trace porte frein, raison, projection, mois et compteur interne ; le passage sauté n'écrit AUCUNE trace", async () => {
    const appels = simuler({ moisUtilises: 3900, trace: { at: il(0), ok: true, frein: "actif", mois: "2026-10", creditsMois: 20 } });
    const { GET } = await import("@/app/api/cron/refresh-ticker-prices/route");
    const res = await GET(requete("https://www.cryptoreflex.fr/api/cron/refresh-ticker-prices"));
    expect(res.status).toBe(200);
    const t = traceEcrite(appels);
    expect(t).toMatchObject({ ok: true, source: "coinmarketcap", frein: "actif", mois: "2026-10", creditsMois: 21 });
    expect(String(t?.freinRaison)).toMatch(/seuil 90 %/);
    expect(Number(t?.projectionPct)).toBeGreaterThan(90);
    // trace sans secret : aucune clé, aucun jeton
    expect(JSON.stringify(t)).not.toMatch(/cle-factice|jeton-de-test|secret-cron/);

    // passage suivant, 10 min plus tard : sauté, réponse 200, pas de nouvelle trace
    vi.setSystemTime(LE(30));
    vi.resetModules();
    const appels2 = simuler({ moisUtilises: 3900, trace: { ...(t as object), at: new Date(LE(20).getTime()).toISOString() } });
    const route2 = await import("@/app/api/cron/refresh-ticker-prices/route");
    const res2 = await route2.GET(requete("https://www.cryptoreflex.fr/api/cron/refresh-ticker-prices"));
    expect(res2.status).toBe(200);
    expect(await res2.json()).toMatchObject({ ok: true, saute: true, frein: "actif" });
    expect(traceEcrite(appels2)).toBeUndefined();
    expect(payantes(appels2)).toEqual([]);
  });

  it("?force=1 : le relevé a lieu malgré le frein", async () => {
    const appels = simuler({ moisUtilises: 3900, trace: { at: new Date(LE(15).getTime()).toISOString(), ok: true, frein: "actif" } });
    const { GET } = await import("@/app/api/cron/refresh-ticker-prices/route");
    const res = await GET(requete("https://www.cryptoreflex.fr/api/cron/refresh-ticker-prices?force=1"));
    expect(await res.json()).toMatchObject({ ok: true, source: "coinmarketcap" });
    expect(payantes(appels)).toContain("/v1/cryptocurrency/listings/latest");
  });

  it("bilan /api/diag/cmc-budget : état du frein lu dans la trace + compteur interne du mois (aucune valeur si pas de trace)", async () => {
    simuler({ moisUtilises: 3900, trace: { at: il(0), ok: true, frein: "actif", freinRaison: "projection fin de mois à 107 % de la limite (seuil 90 %)", projectionPct: 107.5, mois: "2026-10", creditsMois: 321 } });
    const { GET } = await import("@/app/api/diag/cmc-budget/route");
    const b = await (await GET(requete("https://www.cryptoreflex.fr/api/diag/cmc-budget"))).json();
    expect(b).toMatchObject({
      lu: true,
      frein: { etat: "actif", raison: expect.stringMatching(/107 %/), projectionPct: 107.5, dernierReleve: il(0) },
      compteurRobots: { mois: "2026-10", credits: 321 },
    });

    vi.resetModules();
    simuler({ moisUtilises: 1200, trace: null });
    const route2 = await import("@/app/api/diag/cmc-budget/route");
    const b2 = await (await route2.GET(requete("https://www.cryptoreflex.fr/api/diag/cmc-budget"))).json();
    expect(b2).toMatchObject({ lu: true, frein: null, compteurRobots: null });
    // compteur d'un autre mois : ignoré
    vi.resetModules();
    simuler({ moisUtilises: 1200, trace: { at: il(0), ok: true, frein: "normal", mois: "2026-09", creditsMois: 9000 } });
    const route3 = await import("@/app/api/diag/cmc-budget/route");
    const b3 = await (await route3.GET(requete("https://www.cryptoreflex.fr/api/diag/cmc-budget"))).json();
    expect(b3.compteurRobots).toBeNull();
    expect(b3.frein).toMatchObject({ etat: "normal" });
  });

  it("bilan sans jeton : 404, rien n'est lu", async () => {
    const appels = simuler({ moisUtilises: 1200 });
    const { GET } = await import("@/app/api/diag/cmc-budget/route");
    expect((await GET(new Request("https://www.cryptoreflex.fr/api/diag/cmc-budget"))).status).toBe(404);
    expect(appels).toHaveLength(0);
  });
});

describe("8. cohérence du plan : vercel.json inchangé, le frein n'ajoute aucune route ni aucun cron", () => {
  it("R1 reste toutes les 10 min (le frein saute des passages, il ne change pas l'horloge)", () => {
    const crons = (JSON.parse(readFileSync(path.join(RACINE, "vercel.json"), "utf8")) as { crons: { path: string; schedule: string }[] }).crons;
    expect(crons.find((c) => c.path === "/api/cron/refresh-ticker-prices")?.schedule).toBe("*/10 * * * *");
  });
});
