import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { feeShortFr, getPlatformById } from "@/lib/platforms";

/**
 * 10/10/2026 (jury B5) : l'accueil affichait « frais d'achat : Coinbase 0,5 % · Kraken 0,8 % », des frais « taker »
 * d'interfaces avancées, à côté du 1,49 % de l'appli Bitpanda. Règles verrouillées ici.
 */
describe("frais affichés en raccourci", () => {
  it("un frais de carnet d'ordres est nommé comme tel, jamais présenté comme le coût d'un achat simple", () => {
    for (const id of ["coinbase", "kraken"]) {
      const p = getPlatformById(id)!;
      if (p.fees.verified?.makerTakerApplies === false || p.fees.verified?.verdict === "non-verifie") continue;
      expect(feeShortFr(p), id).toMatch(/\(carnet d'ordres\)$/);
    }
  });

  it("la porte « Acheter » de l'accueil affiche le coût réel d'un achat de 1 000 € (simpleCost1000), pas feeShortFr", () => {
    const src = readFileSync(path.join(process.cwd(), "components/home/HomeDoors.tsx"), "utf8");
    expect(src).toMatch(/purchaseCostText\(simpleCost1000\(p\)\)/);
    expect(src).not.toMatch(/feeShortFr\(/);
    expect(src).not.toMatch(/frais d&apos;achat/);
  });
});
