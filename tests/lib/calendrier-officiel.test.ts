/**
 * Robot R7 étendu (lot Z4, 10/10/2026) : réunions de politique monétaire de la BCE (copie figée de la page du 10/10/2026)
 * et prochain halving en fourchette (rejeu des mesures mempool.space du 10/10/2026) ; affichage tiré du fichier.
 */
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { fusionnerDecisions, lireCalendrierBce, lireDecisionsPassees, verifierBce } from "@/scripts/lib/bce-calendrier.mjs";
import { calculerHalving, verifierMesures } from "@/scripts/lib/halving.mjs";
import fichier from "@/data/calendrier-officiel.json";

const RACINE = path.resolve(__dirname, "../..");
const lire = (f: string) => readFileSync(path.join(RACINE, f), "utf8");
const PAGE = lire("tests/fixtures/bce/mgcgc-2026-10-10.html");

describe("calendrier de la BCE", () => {
  const lu = lireCalendrierBce(PAGE) as { decisions: { date: string; jour1: string | null }[]; lignes: number };
  const annee = (a: string) => lu.decisions.filter((d) => d.date.startsWith(a)).map((d) => d.date);

  it("page du 10/10/2026 : 55 lignes, 2 décisions restantes en 2026, 8 en 2027, 8 en 2028 (cas du 11-12/10/2028)", () => {
    expect(lu.lignes).toBe(55);
    expect(annee("2026")).toEqual(["2026-10-29", "2026-12-17"]);
    expect(annee("2027")).toEqual(["2027-02-04", "2027-03-18", "2027-04-29", "2027-06-10", "2027-07-22", "2027-09-09", "2027-10-28", "2027-12-16"]);
    expect(annee("2028")).toEqual(["2028-02-03", "2028-03-23", "2028-05-04", "2028-06-08", "2028-07-20", "2028-09-07", "2028-10-12", "2028-12-07"]);
    expect(lu.decisions.find((d) => d.date === "2026-10-29")!.jour1).toBe("2026-10-28");
    expect(lu.decisions.find((d) => d.date === "2028-10-12")!.jour1).toBe("2028-10-11");
  });

  it("réunions non monétaires, Conseil général et conférences de presse exclues", () => {
    expect(lu.decisions.some((d) => d.date === "2026-11-25" || d.date === "2026-11-26")).toBe(false);
    expect(new Set(lu.decisions.map((d) => d.date)).size).toBe(lu.decisions.length);
  });

  it("contrôles : année N+1 entre 7 et 10 décisions ; structure changée = erreur", () => {
    expect(verifierBce(lu.decisions, "2026-10-10")).toBeNull();
    expect(verifierBce(lu.decisions.filter((d) => !d.date.startsWith("2027-0")), "2026-10-10")).toMatch(/décision\(s\) de politique monétaire en 2027/);
    expect(lireCalendrierBce("<html><body>maintenance</body></html>").erreur).toMatch(/structure/);
    expect(lireCalendrierBce(PAGE.replace("29/10/2026", "29 Oct 2026")).erreur).toMatch(/date illisible/);
  });

  it("décisions passées (fragment annuel) : 8 en 2025, 6 passées en 2026 — jamais un compte rendu", () => {
    expect(lireDecisionsPassees(lire("tests/fixtures/bce/mopo-2025-include.html")).map((d) => d.date)).toEqual(["2025-01-30", "2025-03-06", "2025-04-17", "2025-06-05", "2025-07-24", "2025-09-11", "2025-10-30", "2025-12-18"]);
    expect(lireDecisionsPassees(lire("tests/fixtures/bce/mopo-2026-include.html")).map((d) => d.date)).toEqual(["2026-02-05", "2026-03-19", "2026-04-30", "2026-06-11", "2026-07-23", "2026-09-10"]);
  });

  it("fusion : les décisions passées sont gardées (12 mois), une décision future qui bouge est signalée", () => {
    const anciennes = [{ date: "2025-09-11", jour1: null }, { date: "2025-10-30", jour1: null }, { date: "2026-10-29", jour1: "2026-10-28" }, { date: "2026-12-10", jour1: null }];
    const f = fusionnerDecisions(anciennes, lu.decisions, "2026-10-10");
    expect(f.decisions[0].date).toBe("2025-10-30"); // 2025-09-11 : plus de 12 mois
    expect(f.changements).toEqual(["décision du 2026-12-10 retirée ou déplacée", expect.stringMatching(/nouvelle décision le 2026-12-17/), ...f.changements.slice(2)]);
  });
});

describe("halving en fourchette", () => {
  // mesures réelles du 10/10/2026 (éclaireur, 09:05 UTC) : hauteur 970 746, bloc horodaté 2026-10-10T08:51:21Z, époque 582,219 s
  const m = { hauteur: 970_746, horodatageBloc: Date.parse("2026-10-10T08:51:21Z") / 1000, tempsEpoqueS: 582.219 };
  it("79 254 blocs, 9,95 min depuis 2024 → vers le 10/04/2028 ; fourchette ± 5 % (écart mesuré 2,5 %)", () => {
    const h = calculerHalving(m) as { blocsRestants: number; tempsMoyenS: number; estimation: string; ecart: number; ecartMesure: number; fourchette: { debut: string; fin: string } };
    expect(h.blocsRestants).toBe(79_254);
    expect(h.tempsMoyenS).toBeCloseTo(596.96, 1);
    expect(h.estimation.slice(0, 13)).toBe("2028-04-09T22"); // 10/04/2028 vers 1 h à Paris
    expect(h.ecartMesure).toBeCloseTo(0.0247, 3);
    expect(h.ecart).toBe(0.05);
    expect(h.fourchette.debut.slice(0, 10)).toBe("2028-03-13");
    expect(h.fourchette.fin.slice(0, 10)).toBe("2028-05-07");
  });
  it("écart mesuré plus grand que 5 % : il élargit la fourchette", () => {
    const h = calculerHalving({ ...m, tempsEpoqueS: 540 }) as { ecart: number };
    expect(h.ecart).toBeGreaterThan(0.09);
  });
  it("après le halving de 2028 : le bloc cible passe seul à 1 260 000 (sixième halving, 1,5625 → 0,78125 BTC)", () => {
    const h = calculerHalving({ ...m, hauteur: 1_050_001, horodatageBloc: Date.parse("2028-04-12T00:00:00Z") / 1000 }) as { bloc: number; rang: number; recompenseAvant: number; recompenseApres: number; blocsRestants: number };
    expect(h).toMatchObject({ bloc: 1_260_000, rang: 6, recompenseAvant: 1.5625, recompenseApres: 0.78125, blocsRestants: 209_999 });
    expect(calculerHalving(m)).toMatchObject({ bloc: 1_050_000, rang: 5, recompenseAvant: 3.125, recompenseApres: 1.5625 });
  });
  it("source qui change de format (lecture réseau) et croissance trop rapide : refus", () => {
    const base = { hauteur: 970_746, horodatageBloc: m.horodatageBloc, maintenantS: m.horodatageBloc + 600, reseau: true };
    expect(verifierMesures({ ...base, hauteurRecoupement: Number.NaN, tempsEpoqueS: 582 })).toMatch(/recoupement/);
    expect(verifierMesures({ ...base, hauteurRecoupement: 970_746, tempsEpoqueS: Number.NaN })).toMatch(/timeAvg/);
    expect(verifierMesures({ ...base, hauteurRecoupement: 970_746, tempsEpoqueS: 582 })).toBeNull();
    // +29 000 blocs en 7 jours, confirmés par les deux sources : refusé (au plus 1,5 × 144 par jour)
    const prec = { hauteurPrecedente: 970_746 - 29_000, horodatagePrecedentS: m.horodatageBloc - 7 * 86_400 };
    expect(verifierMesures({ ...base, hauteurRecoupement: 970_746, tempsEpoqueS: 582, ...prec })).toMatch(/trop rapide/);
    expect(verifierMesures({ ...base, hauteurRecoupement: 970_746, tempsEpoqueS: 582, hauteurPrecedente: 970_746 - 1_000, horodatagePrecedentS: m.horodatageBloc - 7 * 86_400 })).toBeNull();
  });
  it("contrôles : hauteur hors bornes, temps moyen absurde, désaccord de hauteur, bloc trop vieux, recul", () => {
    expect((calculerHalving({ ...m, hauteur: 5_000_000 }) as { erreur: string }).erreur).toMatch(/hauteur/);
    expect((calculerHalving({ ...m, horodatageBloc: m.horodatageBloc + 4e8 }) as { erreur: string }).erreur).toMatch(/hors bornes/);
    expect(verifierMesures({ hauteur: 970_746, hauteurRecoupement: 970_740, horodatageBloc: m.horodatageBloc })).toMatch(/désaccord/);
    expect(verifierMesures({ hauteur: 970_746, hauteurRecoupement: 970_746, horodatageBloc: m.horodatageBloc, maintenantS: m.horodatageBloc + 7 * 3600 })).toMatch(/6 h/);
    expect(verifierMesures({ hauteur: 970_700, horodatageBloc: m.horodatageBloc, hauteurPrecedente: 970_746 })).toMatch(/recul/);
    expect(verifierMesures({ hauteur: 970_746, hauteurRecoupement: 970_748, horodatageBloc: m.horodatageBloc, maintenantS: m.horodatageBloc + 600 })).toBeNull();
  });
});

describe("data/calendrier-officiel.json (écrit par le robot) et affichage", () => {
  it("fichier : BCE et halving présents, dates cohérentes, relevé commun", () => {
    expect(fichier.releveLe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fichier.bce!.decisions.length).toBeGreaterThanOrEqual(16);
    expect(fichier.halving!.fourchette.debut < fichier.halving!.estimation && fichier.halving!.estimation < fichier.halving!.fourchette.fin).toBe(true);
    expect(fichier.halving!.source).toBe("https://mempool.space");
  });

  it("aucune date du halving 2028 écrite en dur dans les pages : tout vient du fichier", () => {
    for (const f of ["app/halving-bitcoin/page.tsx", "lib/bitcoin-halving-cycles.ts", "app/cryptos/[slug]/page.tsx", "data/crypto-events.json", "data/events.json"]) {
      expect(lire(f), f).not.toMatch(/2028-04-(15|20)|"id": "btc-halving-2028"/);
    }
    expect(lire("app/halving-bitcoin/page.tsx")).not.toMatch(/varier de quelques jours/);
    expect(lire("app/halving-bitcoin/page.tsx")).toMatch(/PROCHAIN_HALVING/);
  });

  it("/calendrier : « Dates Fed et BCE relevées » par VerifieLe, sources citées ; cartes « Source : »", () => {
    const page = lire("app/calendrier/page.tsx");
    expect(page).toMatch(/label="Dates Fed et BCE relevées"/);
    expect(page).toMatch(/CALENDRIER_OFFICIEL\.releveLe/);
    expect(lire("components/calendar/EventCard.tsx")).toMatch(/Source : /);
    expect(lire("lib/events-types.ts")).toMatch(/"BCE"/);
  });

  it("robot : rejeu sans réseau (page figée + mesures) → fichier complet", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "cal-"));
    const mesures = path.join(dir, "m.json");
    writeFileSync(mesures, JSON.stringify({ ...m0(), hauteurRecoupement: 970_746 }));
    const sortie = path.join(dir, "cal.json");
    const r = spawnSync(process.execPath, ["scripts/refresh-calendrier-officiel.mjs", "--bce=tests/fixtures/bce/mgcgc-2026-10-10.html", `--mesures=${mesures}`, "--aujourdhui=2026-10-10", `--sortie=${sortie}`], { cwd: RACINE, env: { ...process.env, GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" }, stdio: "pipe" });
    expect(r.status).toBe(0);
    const j = JSON.parse(readFileSync(sortie, "utf8"));
    expect(j.releveLe).toBe("2026-10-10");
    expect(j.bce.decisions.filter((d: { date: string }) => d.date.startsWith("2027"))).toHaveLength(8);
    expect(j.halving.blocsRestants).toBe(79_254);
  });
});

function m0() {
  return { hauteur: 970_746, horodatageBloc: Date.parse("2026-10-10T08:51:21Z") / 1000, tempsEpoqueS: 582.219 };
}
