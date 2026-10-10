/**
 * Robot R6 « taux BCE » (lot Z4, 10/10/2026) : analyse du XML officiel (fixture réelle du 09/10/2026, relue le 10/10),
 * garde-fous d'âge (jours ouvrés) et de variation (3 %, déblocage par confirmation), écriture seulement si ça change.
 */
import { readFileSync, mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { analyserXmlBce, deciderFx, ecartMax, joursOuvresDepuis, parDollar } from "@/scripts/lib/fx-bce.mjs";

const RACINE = path.resolve(__dirname, "../..");
const FIXTURE = path.join(RACINE, "tests", "fixtures", "fx-bce", "eurofxref-daily-2026-10-09.xml");
const XML = readFileSync(FIXTURE, "utf8");
const CTX = { aujourdhui: "2026-10-10", maintenant: "2026-10-10T15:35:00Z", lastModified: "Fri, 09 Oct 2026 13:56:35 GMT" };

describe("analyse du XML de la BCE", () => {
  it("fixture réelle : 29 devises, date du 09/10/2026, USD 1.1206, GBP 0.84763, CHF 0.9313", () => {
    const a = analyserXmlBce(XML);
    expect(a.erreur).toBeUndefined();
    expect(a.date).toBe("2026-10-09");
    expect(Object.keys(a.parEuro!)).toHaveLength(29);
    expect(a.parEuro).toMatchObject({ USD: 1.1206, GBP: 0.84763, CHF: 0.9313, JPY: 177.34 });
    const d = parDollar(a.parEuro!);
    expect(d.eur).toBeCloseTo(0.892379, 6);
    expect(d.gbp).toBeCloseTo(0.756407, 6);
    expect(d.chf).toBeCloseTo(0.831073, 6);
  });

  it("structure changée : rouge, avec la raison", () => {
    expect(analyserXmlBce("<html>maintenance</html>").erreur).toMatch(/European Central Bank/);
    expect(analyserXmlBce(XML.replace("<Cube time='2026-10-09'>", "<Cube>")).erreur).toMatch(/0 bloc/);
    expect(analyserXmlBce(XML.replace(/<Cube currency='USD' rate='1.1206'\/>/, "")).erreur).toMatch(/USD absente/);
    expect(analyserXmlBce(XML.replace("rate='1.1206'", "rate='11.206'")).erreur).toMatch(/hors bornes/);
    const tronque = XML.split("\n").filter((l) => !/currency='(JPY|CZK|DKK|HUF|PLN)'/.test(l)).join("\n");
    expect(analyserXmlBce(tronque).erreur).toMatch(/24 devise/);
    expect(analyserXmlBce(XML.replace("</Cube>\n\t</Cube>", "</Cube><Cube time='2026-10-08'></Cube>\n\t</Cube>")).erreur).toMatch(/2 bloc/);
  });
});

describe("garde-fous", () => {
  it("jours ouvrés : week-end exclu, Pâques sous 4 jours ouvrés", () => {
    expect(joursOuvresDepuis("2026-10-09", "2026-10-10")).toBe(0); // vendredi → samedi
    expect(joursOuvresDepuis("2026-10-09", "2026-10-12")).toBe(1); // → lundi
    expect(joursOuvresDepuis("2026-10-09", "2026-10-15")).toBe(4); // → jeudi
    expect(joursOuvresDepuis("2026-10-09", "2026-10-16")).toBe(5);
    expect(joursOuvresDepuis("2027-03-25", "2027-03-30")).toBe(3); // jeudi saint → mardi après Pâques
  });

  const lu = () => {
    const a = analyserXmlBce(XML);
    return { date: a.date!, parEuro: a.parEuro! };
  };

  it("premier passage : écrit le fichier, statut ok, sans alerte", () => {
    const d = deciderFx(null, lu(), CTX);
    expect(d.ecrire).toBe(true);
    expect(d.alerte).toBe(false);
    expect(d.contenu).toMatchObject({ date: "2026-10-09", controle: { statut: "ok" }, precedent: null, releveLe: CTX.maintenant });
    expect(d.contenu.parEuro.USD).toBe(1.1206);
  });

  it("même publication relue : rien à écrire (pas de commit, donc pas de déploiement)", () => {
    const actuel = deciderFx(null, lu(), CTX).contenu;
    const d = deciderFx(actuel, lu(), { ...CTX, maintenant: "2026-10-10T17:10:00Z" });
    expect(d.ecrire).toBe(false);
    expect(d.alerte).toBe(false);
  });

  it("nouvelle publication sous 3 % : écrite, l'ancienne passe en « precedent »", () => {
    const actuel = deciderFx(null, lu(), CTX).contenu;
    const suivante = { date: "2026-10-12", parEuro: { ...lu().parEuro, USD: 1.13, GBP: 0.85 } };
    const d = deciderFx(actuel, suivante, { ...CTX, aujourdhui: "2026-10-12" });
    expect(d.ecrire).toBe(true);
    expect(d.alerte).toBe(false);
    expect(d.contenu.precedent).toEqual({ date: "2026-10-09", parEuro: { USD: 1.1206, GBP: 0.84763, CHF: 0.9313 } });
  });

  it("variation de 3 % ou plus : valeurs précédentes gardées, refus noté, alerte ; même refus relu = pas de réécriture", () => {
    const actuel = deciderFx(null, lu(), CTX).contenu;
    const choc = { date: "2026-10-12", parEuro: { ...lu().parEuro, USD: 1.1206 * 1.04 } };
    const d = deciderFx(actuel, choc, { ...CTX, aujourdhui: "2026-10-12" });
    expect(d.ecrire).toBe(true);
    expect(d.alerte).toBe(true);
    expect(d.contenu.date).toBe("2026-10-09");
    expect(d.contenu.parEuro.USD).toBe(1.1206);
    expect(d.contenu.controle.statut).toBe("variation-refusee");
    expect(d.contenu.controle.refuse.date).toBe("2026-10-12");
    expect(d.contenu.controle.detail).toMatch(/4,00 % sur USD/);
    const relu = deciderFx(d.contenu, choc, { ...CTX, aujourdhui: "2026-10-12" });
    expect(relu.ecrire).toBe(false);
    expect(relu.alerte).toBe(true);
  });

  it("déblocage : la publication suivante confirme le nouveau niveau (< 1 %) → acceptée", () => {
    const actuel = deciderFx(null, lu(), CTX).contenu;
    const choc = { date: "2026-10-12", parEuro: { ...lu().parEuro, USD: 1.1206 * 1.04 } };
    const refuse = deciderFx(actuel, choc, { ...CTX, aujourdhui: "2026-10-12" }).contenu;
    const confirme = { date: "2026-10-13", parEuro: { ...lu().parEuro, USD: 1.1206 * 1.045 } };
    const d = deciderFx(refuse, confirme, { ...CTX, aujourdhui: "2026-10-13" });
    expect(d.ecrire).toBe(true);
    expect(d.contenu.date).toBe("2026-10-13");
    expect(d.contenu.controle.statut).toBe("ok");
    expect(d.contenu.controle.detail).toMatch(/confirmé par deux publications/);
    // une publication qui ne confirme pas (retour brutal ailleurs) reste refusée
    const autre = { date: "2026-10-13", parEuro: { ...lu().parEuro, USD: 1.1206 * 1.09 } };
    expect(deciderFx(refuse, autre, { ...CTX, aujourdhui: "2026-10-13" }).contenu.controle.statut).toBe("variation-refusee");
  });

  it("publication trop vieille (plus de 4 jours ouvrés) : rien n'est écrit, alerte « date-ancienne »", () => {
    const d = deciderFx(null, lu(), { ...CTX, aujourdhui: "2026-10-16" });
    expect(d.ecrire).toBe(false);
    expect(d.alerte).toBe(true);
    expect(d.statut).toBe("date-ancienne");
  });

  it("jamais de recul : un cache qui sert un ancien fichier est ignoré sans alerte", () => {
    const actuel = { ...deciderFx(null, lu(), CTX).contenu, date: "2026-10-12" };
    const d = deciderFx(actuel, lu(), { ...CTX, aujourdhui: "2026-10-12" });
    expect(d.ecrire).toBe(false);
    expect(d.alerte).toBe(false);
  });

  it("écart maximal sur USD, GBP, CHF seulement (TRY et les autres devises ne comptent pas)", () => {
    const a = lu().parEuro;
    expect(ecartMax(a, { ...a, TRY: 99 }).ecart).toBe(0);
    expect(ecartMax(a, { ...a, CHF: a.CHF * 1.02 }).devise).toBe("CHF");
  });
});

describe("script scripts/fx-bce.mjs (rejeu sur la fixture, sans réseau)", () => {
  it("écrit un fichier conforme puis ne réécrit rien au second passage", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "fx-bce-"));
    const sortie = path.join(dir, "fx.json");
    const out1 = path.join(dir, "o1.txt");
    execFileSync(process.execPath, ["scripts/fx-bce.mjs", `--xml=${FIXTURE}`, "--aujourdhui=2026-10-10", `--sortie=${sortie}`], { cwd: RACINE, env: { ...process.env, GITHUB_OUTPUT: out1, GITHUB_STEP_SUMMARY: "" }, stdio: "pipe" });
    expect(existsSync(sortie)).toBe(true);
    const j = JSON.parse(readFileSync(sortie, "utf8"));
    expect(j).toMatchObject({ version: 1, date: "2026-10-09", controle: { statut: "ok" } });
    expect(readFileSync(out1, "utf8")).toMatch(/changed=true/);
    const out2 = path.join(dir, "o2.txt");
    writeFileSync(out2, "");
    execFileSync(process.execPath, ["scripts/fx-bce.mjs", `--xml=${FIXTURE}`, "--aujourdhui=2026-10-10", `--sortie=${sortie}`], { cwd: RACINE, env: { ...process.env, GITHUB_OUTPUT: out2, GITHUB_STEP_SUMMARY: "" }, stdio: "pipe" });
    expect(readFileSync(out2, "utf8")).not.toMatch(/changed=true/);
  });

  it("bout en bout : jour 1 variation refusée (fichier commitable, servi aux anciennes valeurs), jour 2 confirmée → acceptée sans alerte", async () => {
    const { lireFxBce } = await import("@/lib/fx-bce");
    const dir = mkdtempSync(path.join(tmpdir(), "fx-bce-e2e-"));
    const sortie = path.join(dir, "fx.json");
    const forger = (date: string, usd: number) => {
      const f = path.join(dir, `bce-${date}.xml`);
      const xml = XML.replace("time='2026-10-09'", `time='${date}'`).replace("currency='USD' rate='1.1206'", `currency='USD' rate='${usd.toFixed(4)}'`);
      expect(xml).toContain(`time='${date}'`);
      writeFileSync(f, xml);
      return f;
    };
    const passer = (xml: string, jour: string) => {
      const out = path.join(dir, `out-${jour}.txt`);
      writeFileSync(out, "");
      execFileSync(process.execPath, ["scripts/fx-bce.mjs", `--xml=${xml}`, `--aujourdhui=${jour}`, `--sortie=${sortie}`], { cwd: RACINE, env: { ...process.env, GITHUB_OUTPUT: out, GITHUB_STEP_SUMMARY: "" }, stdio: "pipe" });
      return readFileSync(out, "utf8");
    };
    // état de départ = publication réelle du 09/10
    passer(FIXTURE, "2026-10-09");
    // jour 1 : USD × 1,04 → refus écrit (changed=true), alerte ; le fichier passe le contrôle des tests du workflow
    const o1 = passer(forger("2026-10-12", 1.1206 * 1.04), "2026-10-12");
    expect(o1).toMatch(/changed=true/);
    expect(o1).toMatch(/alerte=true/);
    const j1 = JSON.parse(readFileSync(sortie, "utf8"));
    expect(j1.controle.statut).toBe("variation-refusee");
    expect(["ok", "variation-refusee"]).toContain(j1.controle.statut); // assertion de tests/lib/fx.test.ts
    const servi = lireFxBce(j1);
    expect(servi.source).toBe("bce");
    expect(servi.date).toBe("2026-10-09");
    expect(servi.eur).toBeCloseTo(1 / 1.1206, 12);
    // jour 2 : la publication suivante confirme (< 1 % d'écart avec la refusée) → acceptée, sans alerte
    const o2 = passer(forger("2026-10-13", 1.1206 * 1.045), "2026-10-13");
    expect(o2).toMatch(/changed=true/);
    expect(o2).not.toMatch(/alerte=true/);
    const j2 = JSON.parse(readFileSync(sortie, "utf8"));
    expect(j2.date).toBe("2026-10-13");
    expect(j2.controle.statut).toBe("ok");
    expect(j2.parEuro.USD).toBeCloseTo(1.1206 * 1.045, 4);
  });

  it("XML cassé : code 2, rien n'est écrit", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "fx-bce-"));
    const xml = path.join(dir, "casse.xml");
    writeFileSync(xml, "<html>maintenance</html>");
    const sortie = path.join(dir, "fx.json");
    let code = 0;
    try {
      execFileSync(process.execPath, ["scripts/fx-bce.mjs", `--xml=${xml}`, `--sortie=${sortie}`], { cwd: RACINE, env: { ...process.env, GITHUB_OUTPUT: "", GITHUB_STEP_SUMMARY: "" }, stdio: "pipe" });
    } catch (e) {
      code = (e as { status?: number }).status ?? -1;
    }
    expect(code).toBe(2);
    expect(existsSync(sortie)).toBe(false);
  });
});
