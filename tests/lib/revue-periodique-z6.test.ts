/**
 * Lot Z6 (10/10/2026) — robot R14 « revue périodique » : le 1er du mois, un ticket privé liste tout ce qui dépasse son seuil
 * « vérifié le » parmi les données qu'aucun robot ne relit (familles H de l'architecture 0 €).
 * Jeu d'essai à dates connues + lecture des fichiers réels du dépôt + workflow, Gardien et sentinelle.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { SEUILS_JOURS } from "@/lib/fraicheur";
import { ROBOTS_GARDIEN } from "@/lib/gardien";
import { SEUILS as SEUILS_INVENTAIRE } from "@/scripts/lib/inventaire-dates.mjs";
import { CADENCE } from "@/scripts/lib/sentinelle-robots.mjs";
import { POSTES } from "@/scripts/lib/usine-registre.mjs";
import { FAMILLES_H, corpsRevue, elementsEnRetard, lireElements, titreRevue, valeursEtiquetees } from "@/scripts/lib/revue-periodique.mjs";

const RACINE = path.resolve(__dirname, "../..");
const lire = (p: string) => readFileSync(path.join(RACINE, p), "utf8");
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- arbre YAML libre
type Yaml = any;
const MAINTENANT = Date.parse("2026-10-10T08:00:00Z");
const el = (famille: string, label: string, date: string, champ = "essai.json") => ({ famille, champ, label, date, seuilJours: (SEUILS_JOURS as Record<string, number>)[famille] });

describe("jeu d'essai : ce qui dépasse son seuil, et seulement cela", () => {
  const elements = [
    el("support", "Kraken", "2026-07-01"), // 101 jours > 90 : en retard
    el("support", "Coinbase", "2026-07-12"), // 90 jours pile : pas en retard
    el("support", "Bitpanda", "2026-10-06"), // 4 jours
    el("evenements", "fichier entier", "2026-05-01"), // 162 jours > 30
    el("airdrops", "fichier entier", "2026-09-26"), // 14 jours pile : pas en retard
    el("airdrops", "autre", "2026-09-25"), // 15 jours > 14 : en retard
    el("roadmaps", "fichier entier", "2026-04-13"), // 180 jours pile : pas en retard
    el("decentralisation", "fichier entier", "2026-06-10"), // 122 jours > 120
    el("editorial", "article-sans-date", ""), // aucune date lisible : compte comme dépassé
    el("rendements", "ligne n°1", "2026-04"), // mois seul = 1er du mois : 192 jours > 14
    el("support", "Futur", "2027-01-01"), // date future : jamais en retard
  ];
  const retard = elementsEnRetard(elements, MAINTENANT);

  it("liste exacte, du plus ancien au plus récent, les éléments sans date en tête", () => {
    expect(retard.map((e: { label: string; famille: string }) => `${e.famille}:${e.label}`)).toEqual([
      "editorial:article-sans-date",
      "rendements:ligne n°1", // 192 jours
      "evenements:fichier entier", // 162 jours
      "decentralisation:fichier entier",
      "support:Kraken",
      "airdrops:autre",
    ]);
  });

  it("jours exacts : 90 jours pile n'est pas en retard, 91 l'est", () => {
    expect(retard.find((e: { label: string }) => e.label === "Kraken")!.ageJours).toBe(101);
    expect(retard.some((e: { label: string }) => e.label === "Coinbase")).toBe(false);
    expect(elementsEnRetard([el("support", "x", "2026-07-11")], MAINTENANT)).toHaveLength(1); // 91 jours
  });

  it("le ticket groupe par famille, cite l'âge, le seuil et le nombre ; rien d'autre", () => {
    const corps = corpsRevue(retard, elements.length, MAINTENANT)!;
    expect(corps).toContain("**6 élément(s) sur 11**");
    expect(corps).toContain("### Support client (n° 23) — 1 en retard (seuil : 90 jours)");
    expect(corps).toContain("- Kraken · essai.json · 01/07/2026 (101 jours)");
    expect(corps).toContain("- article-sans-date · essai.json · sans date lisible");
    expect(corps).toContain("### Airdrops (n° 37) — 1 en retard (seuil : 14 jours)");
    expect(corps).not.toContain("Coinbase");
    expect(corps).not.toContain("Bitpanda");
    expect(corps).not.toContain("Futur");
  });

  it("rien en retard : aucun ticket", () => {
    expect(corpsRevue(elementsEnRetard([el("support", "x", "2026-10-01")], MAINTENANT), 1, MAINTENANT)).toBeNull();
  });

  it("la liste d'une famille est bornée (12 lignes) avec le décompte du reste", () => {
    const beaucoup = Array.from({ length: 30 }, (_, i) => el("rendements", `ligne n°${i + 1}`, "2026-01-01"));
    const corps = corpsRevue(elementsEnRetard(beaucoup, MAINTENANT), 30, MAINTENANT)!;
    expect(corps).toContain("30 en retard");
    expect(corps).toContain("… et 18 autre(s) de la même famille");
    expect(corps.split("\n").filter((l) => l.startsWith("- ligne")).length).toBe(12);
  });

  it("un seul ticket par mois : titre stable", () => {
    expect(titreRevue(MAINTENANT)).toBe("[Revue périodique] 2026-10");
    expect(titreRevue(Date.parse("2026-10-31T23:00:00Z"))).toBe("[Revue périodique] 2026-10");
    expect(titreRevue(Date.parse("2026-11-01T06:20:00Z"))).toBe("[Revue périodique] 2026-11");
  });
});

describe("lecture étiquetée d'un tableau", () => {
  it("nom d'abord, sinon identifiant, sinon rang ; valeurs non datées ignorées", () => {
    const j = { platforms: [{ name: "Kraken", id: "kraken", support: { verified: "2026-10-01" } }, { id: "x", support: { verified: "2026-10-02T10:00:00Z" } }, { support: { verified: "2026-10-03" } }, { name: "Vide", support: {} }] };
    expect(valeursEtiquetees(j, "platforms[].support.verified")).toEqual([
      { date: "2026-10-01", label: "Kraken" },
      { date: "2026-10-02", label: "x" },
      { date: "2026-10-03", label: "n°3" },
    ]);
    expect(valeursEtiquetees({ _meta: { lastUpdated: "2026-05-01" } }, "_meta.lastUpdated")).toEqual([{ date: "2026-05-01", label: "" }]);
  });
});

describe("fichiers réels du dépôt", () => {
  const elements = lireElements(RACINE);

  it("toutes les familles H sont couvertes, aucun fichier illisible, rien de tenu par un robot", () => {
    const familles = new Set(elements.map((e: { famille: string }) => e.famille));
    for (const f of Object.keys(FAMILLES_H)) expect(familles.has(f), f).toBe(true);
    expect(elements.filter((e: { label: string }) => /illisible/.test(e.label))).toEqual([]);
    expect(elements.some((e: { champ: string }) => /rendements\.json/.test(e.champ))).toBe(false); // R8 tient lido.date
    expect(elements.some((e: { famille: string }) => ["mica", "frais", "securite"].includes(e.famille))).toBe(false);
  });

  it("seuils : ceux de lib/fraicheur.ts (copie de la sentinelle identique), pour chaque famille H", () => {
    for (const f of Object.keys(FAMILLES_H)) {
      expect((SEUILS_INVENTAIRE as Record<string, number>)[f], f).toBe((SEUILS_JOURS as Record<string, number>)[f]);
    }
    for (const e of elements) expect(e.seuilJours, e.famille).toBe((SEUILS_JOURS as Record<string, number>)[e.famille]);
  });

  it("le support de chacune des 34 plateformes est passé en revue (un élément par plateforme)", () => {
    const ids = (JSON.parse(lire("data/platforms.json")).platforms as unknown[]).length;
    expect(elements.filter((e: { famille: string }) => e.famille === "support")).toHaveLength(ids);
  });

  it("à la date de la construction du lot, le ticket existe et nomme des éléments réels (relevés d'avril 2026)", () => {
    const retard = elementsEnRetard(elements, MAINTENANT);
    expect(retard.length).toBeGreaterThan(0);
    const corps = corpsRevue(retard, elements.length, MAINTENANT)!;
    expect(corps).toMatch(/data\/events\.json _meta\.lastUpdated/);
    expect(corps).toMatch(/Lignes de rendements éditoriales/);
  });
});

describe("branchement : script, workflow, Gardien, sentinelle, usine", () => {
  const wf: Yaml = parse(lire(".github/workflows/revue-periodique.yml"));
  const on = wf.on ?? wf[true as unknown as string];

  it("le script existe, ne modifie aucun fichier du dépôt et ne fait aucune requête réseau", () => {
    expect(existsSync(path.join(RACINE, "scripts/revue-periodique.mjs"))).toBe(true);
    const src = lire("scripts/revue-periodique.mjs") + lire("scripts/lib/revue-periodique.mjs");
    expect(src.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/\bfetch\(|node:https?|XMLHttpRequest/);
    expect(lire("scripts/revue-periodique.mjs")).toMatch(/writeFileSync\(TICKET/); // seul fichier écrit : le corps du ticket, hors dépôt
  });

  it("workflow : le 1er du mois, à la main, à la fusion ; lecture seule ; ticket privé unique par mois", () => {
    expect(on.schedule).toEqual([{ cron: "20 6 1 * *" }]);
    expect(on.workflow_dispatch).toBeDefined();
    expect(on.push.paths).toContain("scripts/revue-periodique.mjs");
    expect(wf.permissions).toEqual({ contents: "read" });
    const t = lire(".github/workflows/revue-periodique.yml");
    expect(t).toContain('repo: "cryptoreflex-sentinelle"');
    expect(t).toContain("secrets.SENTINELLE_TOKEN");
    expect(t).toMatch(/tous\.some\(\(i\) => i\.title === titre\)/);
  });

  it("Gardien : une entrée, même horaire que le workflow ; sentinelle : cadence mensuelle ; usine : un poste", () => {
    const r = ROBOTS_GARDIEN.find((x) => x.cle === "revue-periodique")!;
    expect(r).toMatchObject({ workflow: "revue-periodique.yml", horaire: "20 6 1 * *", inputs: {} });
    expect(JSON.parse(lire("vercel.json")).crons).toContainEqual({ path: "/api/cron/gardien/revue-periodique", schedule: "20 6 1 * *" });
    const c = (CADENCE as [string, string, number][]).find(([f]) => f === "revue-periodique.yml")!;
    expect(c[2]).toBeGreaterThanOrEqual(31 * 24);
    const p = (POSTES as unknown as { id: string; workflow?: string; gardien?: string[] }[]).find((x) => x.id === "revue-periodique")!;
    expect(p).toMatchObject({ workflow: "revue-periodique.yml", gardien: ["revue-periodique"] });
  });

  it("famille 55 du registre de fraîcheur : dernier passage réussi du workflow", () => {
    const f = JSON.parse(lire("data/fraicheur/registre.json")).familles.find((x: { id: string }) => x.id === "55");
    expect(f.lecture).toMatchObject({ methode: "workflow", fichier: "revue-periodique.yml" });
    expect(f.ageMaxH).toBeGreaterThanOrEqual(31 * 24);
  });
});
