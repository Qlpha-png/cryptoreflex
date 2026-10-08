/**
 * Lot fraîcheur A (08/10/2026, audit n° 34) — calendrier FOMC.
 *  1. Lecteur de la page de la Fed sur un extrait FIGÉ (lu le 08/10/2026) : les 8 décisions 2026 exactes.
 *  2. « FOMC du seed = Fed » : le bloc <fomc-auto> de lib/events-seed.ts est la traduction EXACTE de l'extrait de référence
 *     enregistré par le robot (tests/fixtures/fomc/reference.html), à sa date de relevé. Aucune entrée FOMC hors du bloc.
 *  3. Le robot échoue quand la page change de structure ou donne moins de 8 réunions pour l'année.
 * Exécuté aussi par .github/workflows/refresh-fomc.yml et weekly-events.yml AVANT tout commit.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EVENTS_SEED } from "@/lib/events-seed";
import * as fomc from "../../scripts/lib/fomc.mjs";

const RACINE = path.resolve(__dirname, "../..");
const lire = (p: string) => readFileSync(path.join(RACINE, p), "utf8");

type Reunion = { annee: number; mois: number; jour1: number; jour2: number; moisDecision: number; decision: string; sep: boolean };
type Evenement = { id: string; date: string; title: string; description: string; category: string };

const FIGEE = lire("tests/fixtures/fomc/fomccalendars-2026-10-08.html");
const REFERENCE = lire("tests/fixtures/fomc/reference.html");
const SEED = lire("lib/events-seed.ts");

describe("lecteur de la page de la Fed (extrait figé du 08/10/2026)", () => {
  const { reunions, ignorees } = fomc.lireCalendrierFed(FIGEE) as { reunions: Reunion[]; ignorees: string[] };

  it("2026 : les 8 réunions officielles, décision le 2e jour", () => {
    expect(reunions.filter((r) => r.annee === 2026).map((r) => r.decision)).toEqual([
      "2026-01-28", // 27-28 janvier
      "2026-03-18", // 17-18 mars
      "2026-04-29", // 28-29 avril (le site affichait le 6 mai)
      "2026-06-17", // 16-17 juin
      "2026-07-29", // 28-29 juillet (absent du site)
      "2026-09-16", // 15-16 septembre
      "2026-10-28", // 27-28 octobre (absent du site)
      "2026-12-09", // 8-9 décembre (absent du site)
    ]);
    expect(fomc.verifierAnnee(reunions, 2026)).toBe(8);
  });

  it("projections économiques (astérisque) : mars, juin, septembre, décembre 2026", () => {
    expect(reunions.filter((r) => r.annee === 2026 && r.sep).map((r) => r.moisDecision)).toEqual([3, 6, 9, 12]);
  });

  it("vote par écrit d'août 2025 ignoré (pas une réunion du calendrier)", () => {
    expect(ignorees).toEqual(["2025 August 22 (notation vote)"]);
    expect(reunions.some((r) => r.decision === "2025-08-22")).toBe(false);
  });

  it("réunion à cheval sur deux mois : décision le mois suivant", () => {
    const html = FIGEE.replace(/<h4><a id="42828">2026 FOMC Meetings<\/a><\/h4>/, '<h4><a id="1">2030 FOMC Meetings</a></h4>').replace(
      /<strong>January<\/strong><\/div>\s*<div class="fomc-meeting__date([^"]*)">27-28<\/div>/,
      '<strong>Apr/May</strong></div>\n    <div class="fomc-meeting__date$1">30-1*</div>',
    );
    const r = (fomc.lireCalendrierFed(html).reunions as Reunion[]).find((x) => x.annee === 2030 && x.moisDecision === 5)!;
    expect(r).toMatchObject({ decision: "2030-05-01", jour1: 30, jour2: 1, mois: 4, sep: true });
    expect(fomc.versEvenement(r).description).toContain("les 30 avril et 1er mai 2030");
  });
});

describe("le robot échoue au lieu de publier un calendrier faux", () => {
  it("page sans titre d'année (structure changée)", () => {
    expect(() => fomc.lireCalendrierFed(FIGEE.replace(/FOMC Meetings/g, "Meetings"))).toThrow(/structure/);
  });
  it("balises mois / date dépareillées", () => {
    expect(() => fomc.lireCalendrierFed(FIGEE.replace(/<div class="fomc-meeting__date col-xs-4 col-sm-9 col-md-10 col-lg-1">27-28<\/div>/, ""))).toThrow(/dates/);
  });
  it("moins de 8 réunions pour l'année", () => {
    // la ligne entière de la réunion d'octobre 2026 disparaît
    const amputee = FIGEE.replace(/<div class="row fomc-meeting">\s*<div class="fomc-meeting__month[^"]*"><strong>October<\/strong><\/div>\s*<div class="fomc-meeting__date[^"]*">27-28<\/div>\s*<\/div>/, "");
    expect(amputee.length).toBeLessThan(FIGEE.length);
    const { reunions } = fomc.lireCalendrierFed(amputee) as { reunions: Reunion[] };
    expect(() => fomc.verifierAnnee(reunions, 2026)).toThrow(/7 réunion/);
  });
  it("page vide ou tronquée", () => {
    expect(() => fomc.lireCalendrierFed("")).toThrow();
  });
});

describe("FOMC du seed = Fed (extrait de référence enregistré par le robot)", () => {
  const releve = fomc.releveActuel(SEED) as string | null;
  const attendus = (fomc.fenetre(fomc.lireCalendrierFed(REFERENCE).reunions, releve) as Reunion[]).map(fomc.versEvenement) as Evenement[];
  const seedFomc = EVENTS_SEED.filter((e) => e.category === "FOMC");

  it("date de relevé inscrite dans le bloc", () => {
    expect(releve).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("le bloc est EXACTEMENT la traduction de la page lue (mêmes entrées, même ordre, mêmes textes)", () => {
    expect(seedFomc.length).toBeGreaterThanOrEqual(8);
    expect(seedFomc).toEqual(attendus);
  });

  it("aucune entrée FOMC hors du bloc <fomc-auto> (le robot réécrit toutes les entrées FOMC, et seulement elles)", () => {
    const i = SEED.indexOf(fomc.MARQUE_DEBUT);
    const j = SEED.indexOf(fomc.MARQUE_FIN);
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(i);
    expect(/category:\s*"FOMC"/.test(SEED.slice(0, i) + SEED.slice(j))).toBe(false);
    expect((SEED.slice(i, j).match(/category: "(\w[\w ]*)"/g) ?? []).every((c) => c === 'category: "FOMC"')).toBe(true);
    expect(() => fomc.remplacerBloc(SEED.replace(/\r\n/g, "\n"), "  " + fomc.MARQUE_DEBUT + "\n  " + fomc.MARQUE_FIN)).not.toThrow();
    expect(() => fomc.remplacerBloc(SEED.replace(/\r\n/g, "\n").replace("export const EVENTS_SEED", '// category: "FOMC"\nexport const EVENTS_SEED'), "x")).toThrow(/hors du bloc/);
  });

  it("2026 complet sur le site, dont la réunion des 27-28 octobre", () => {
    expect(seedFomc.filter((e) => e.date.startsWith("2026-")).map((e) => e.date)).toEqual([
      "2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17", "2026-07-29", "2026-09-16", "2026-10-28", "2026-12-09",
    ]);
    expect(seedFomc.find((e) => e.id === "fomc-2026-10")?.description).toContain("les 27 et 28 octobre 2026");
    expect(seedFomc.some((e) => e.date === "2026-05-06")).toBe(false);
  });

  it("textes neutres : uniquement ce que dit la page de la Fed (aucune décision ni citation inventée)", () => {
    for (const e of seedFomc) {
      expect(e.sourceUrl).toBe(fomc.FOMC_URL);
      expect(e.description).not.toMatch(/Powell|statu quo|baisse|hausse|cuts?\b|restrictive/i);
    }
  });
});
