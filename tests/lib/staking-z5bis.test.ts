import { describe, expect, it } from "vitest";
import { STAKING_PAIRS } from "@/lib/programmatic";
import { STAKING_RATES } from "@/lib/staking-rates";
import { STABLECOIN_YIELDS } from "@/lib/stablecoin-yields";

/**
 * Z5-bis (10/10/2026) : relecture des taux de staking et de rendement sur les pages publiques (Kraken version française,
 * Bitpanda, ethereum.org, Marinade, Jito) et les paramètres publics des réseaux. Règles verrouillées ici :
 * une fourchette affichée a toujours une source et une date ; sans source citable, aucun chiffre.
 */
describe("Z5-bis : taux de staking sourcés", () => {
  it("chaque fourchette de /staking a une source et une date ; sans taux, aucune source n'est prétendue", () => {
    for (const p of STAKING_PAIRS) {
      expect(p.releve, p.cryptoId).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (p.apyMin === null || p.apyMax === null) {
        expect(p.apyMin, p.cryptoId).toBeNull();
        expect(p.apyMax, p.cryptoId).toBeNull();
        expect(p.sources, p.cryptoId).toEqual([]);
      } else {
        expect(p.sources.length, p.cryptoId).toBeGreaterThan(0);
        expect(p.apyMin, p.cryptoId).toBeLessThanOrEqual(p.apyMax);
        expect(p.apyMax, p.cryptoId).toBeLessThanOrEqual(25);
        for (const s of p.sources) expect(s.url, p.cryptoId).toMatch(/^https:\/\//);
      }
    }
  });

  it("les fourchettes contredites par les plateformes ne reviennent pas (DOT, TIA, APT, NEAR)", () => {
    const par = Object.fromEntries(STAKING_PAIRS.map((p) => [p.cryptoId, p]));
    expect(par.polkadot.apyMax).toBeLessThanOrEqual(3);
    expect(par.celestia.apyMax).toBeLessThan(6);
    expect(par.aptos.apyMax).toBeLessThanOrEqual(3);
    expect(par["near-protocol"].apyMax).toBeLessThan(6);
    expect(par.polygon.symbol).toBe("POL");
  });

  it("calculateur : une ligne « non relevée » n'a pas de taux exploitable, les lignes relues sont datées du jour du relevé", () => {
    const toutes = STAKING_RATES.flatMap((c) => c.providers.map((p) => ({ c: c.id, ...p })));
    const sansTaux = toutes.filter((p) => p.nonReleve);
    expect(sansTaux.map((p) => `${p.c}:${p.provider}`)).toEqual(["polkadot:Nomination pool (wallet)"]);
    const dot = STAKING_RATES.find((c) => c.id === "polkadot")!.providers.find((p) => p.provider === "Kraken Staking")!;
    expect(dot.apy).toBeLessThan(3);
    for (const p of toutes.filter((x) => !x.taux && !x.nonReleve)) expect(p.releve, `${p.c}:${p.provider}`).toBeDefined();
  });

  it("stablecoins : l'offre Bitpanda est affichée comme un prêt non réglementé, datée, avec ses risques", () => {
    const b = STABLECOIN_YIELDS.filter((y) => y.platformId === "bitpanda");
    expect(b.map((y) => y.stablecoin).sort()).toEqual(["EURCV", "USDC"]);
    for (const y of b) {
      expect(y.regulation).toBe("Non réglementé");
      expect(y.releveLe).toBe("2026-10-10");
      expect(y.notes).toMatch(/hors MiCA/);
      expect(y.notes).toMatch(/sans protection des dépôts/);
      expect(y.lockUpDays).toBe(14);
    }
  });
});
