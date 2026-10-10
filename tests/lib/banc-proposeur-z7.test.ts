/**
 * Lot Z7 (10/10/2026) — critère de fin : banc d'essai simulé de 30 cas ou plus, 0 faux positif (0 valeur absente de sa source
 * acceptée, 0 fusion automatique fausse). Le banc lui-même est scripts/banc-proposeur.mjs ; les cas, tests/fixtures/proposeur/cas.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as BancMod from "@/scripts/banc-proposeur.mjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- module .mjs à signatures JSDoc libres
const B = BancMod as Record<string, any>;
const RACINE = path.resolve(__dirname, "../..");

describe("banc d'essai du proposeur (client Gemini simulé)", () => {
  it("au moins 30 cas, dont au moins 10 tirés de vraies grilles, tous conformes, 0 faux positif", async () => {
    const b = await B.lancerBanc();
    const ecarts = b.lignes.filter((l: { ecarts: string[] }) => l.ecarts.length).map((l: { id: string; ecarts: string[] }) => `${l.id} : ${l.ecarts.join(" | ")}`);
    expect(ecarts).toEqual([]);
    expect(b.total).toBeGreaterThanOrEqual(30);
    expect(b.reels).toBeGreaterThanOrEqual(10);
    expect(b.reussis).toBe(b.total);
    expect(b.totaux).toEqual({ valeursAbsentesAcceptees: 0, fusionsAutoFausses: 0, automatiquesFaux: 0 });
  });

  it("les cas réels viennent de l'historique de data/platforms.json et le disent (page reconstituée, pas copiée)", () => {
    const reels = B.chargerCas().filter((c: { origine: string }) => c.origine === "reel-reconstitue");
    expect(reels.length).toBeGreaterThanOrEqual(10);
    for (const c of reels) {
      expect(c.source, c.id).toMatch(/6d1fdcbd/);
      expect(c.source, c.id).toMatch(/PAS une copie/);
      expect(c.pages[0].url, c.id).toMatch(/^https:\/\//);
      expect(c.plateforme.fees.verified.verdict, c.id).toMatch(/fiable|douteux/);
    }
  });

  it("tous les pièges de la liste fermée sont couverts", () => {
    const ids = readdirSync(path.join(RACINE, "tests/fixtures/proposeur/cas")).join(" ");
    for (const motif of [
      "bonne-extraction", "chiffre-invente", "citation-reformulee", "virgule-perdue", "virgule-decalee", "pourcent-au-lieu-de-euro", "deux-lectures-divergentes",
      "json-casse", "page-vide", "page-sans-chiffre", "changement-3-points", "changement-0-3-point-interrupteur-on", "changement-0-3-point-interrupteur-off",
      "fiscalite-jamais-automatique", "quota", "cle-invalide", "panne", "injection", "libelle-taker", "source-tierce", "texte-libre", "hors-bornes",
    ]) expect(ids, motif).toContain(motif);
  });

  it("chaque cas déclare son attendu à la main (le banc ne se contente pas de ce que le code répond)", () => {
    for (const c of B.chargerCas()) {
      expect(c.description?.length, c.id).toBeGreaterThan(20);
      expect(c.attendu, c.id).toBeTruthy();
      if (c.type === "extraction") {
        expect(c.attendu).toHaveProperty("champs");
        expect(c.attendu).toHaveProperty("action");
        expect(c.attendu).toHaveProperty("ticket");
      }
    }
  });

  it("le second contrôle du banc refuse bien une valeur absente de sa source (il peut échouer)", () => {
    const cas = { pages: [{ url: "u", texte: "Frais taker : 0,85 % partout" }] };
    expect(B.sourcePorteLaValeur(cas, { citation: "Frais taker : 0,85 %", nouvelle: 0.85 })).toBe(true);
    expect(B.sourcePorteLaValeur(cas, { citation: "Frais taker : 0,85 %", nouvelle: 0.8 })).toBe(false);
    expect(B.sourcePorteLaValeur(cas, { citation: "Frais taker : 0,9 %", nouvelle: 0.9 })).toBe(false);
    expect(B.sourcePorteLaValeur(cas, { citation: "Frais taker : 0,85 %", nouvelle: 85 })).toBe(false);
  });

  it("les fixtures sont du JSON valide à clés attendues", () => {
    for (const f of readdirSync(path.join(RACINE, "tests/fixtures/proposeur/cas"))) {
      const c = JSON.parse(readFileSync(path.join(RACINE, "tests/fixtures/proposeur/cas", f), "utf8"));
      expect(c.id + ".json").toBe(f);
      expect(["reel-reconstitue", "synthetique"]).toContain(c.origine);
    }
  });
});
